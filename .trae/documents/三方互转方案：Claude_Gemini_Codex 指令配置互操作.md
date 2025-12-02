## 目标
- 支持从任意平台（Claude `.claude/commands`、Gemini `.toml`、Codex `prompts/*.md`）导入为统一 IR，并从 IR 导出到任意目标平台，实现“Claude↔Gemini↔Codex”三方互转。
- 保证语义尽可能无损；不完全兼容的字段进入保留区并在报告中标注。

## 输入识别
- 自动探测源平台：
  - Claude：扩展名 `.json|.yaml|.yml`，位于 `.claude/commands/`。
  - Gemini：扩展名 `.toml`，位于 `.gemini/commands/` 或 `out/gemini/commands/`。
  - Codex：扩展名 `.md`，位于 `.codex/prompts/` 或 `out/codex/prompts/`；以 YAML frontmatter 开头。
- 目录递归扫描，混合输入时按文件类型分平台处理。

## IR 扩展（支持三方语义）
- 字段：`name`、`description`、`arguments[]`（name/type/required/default/hint）、`prompt`、`examples[]`、`tools`（名称/参数/描述）、`contexts`、`metadata`（作者/标签/版本/权限/extra）、`runtime`（模型/温度/限制）。
- 规范化规则：
  - 文件名即命令名；大小写在 Gemini 保持原样（区分大小写）。
  - 参数类型缺失时默认 `string`；必填默认 `false`。
  - 未识别字段进入 `metadata.extra`。

## 导入器实现
- ClaudeImporter：现有 JSON/YAML 解析→IR；补齐 `tools/contexts` 兼容占位。
- GeminiImporter（.toml）：
  - 解析 `description`、`args[]`、`prompt`、`docs.examples[]`、`preserve.metadata/runtime`。
  - 将 `[mcp]` 或扩展区块映射到 IR 的 `tools/contexts` 或 `metadata.extra`。
  - 参考：Gemini CLI 自定义命令 https://cloud.google.com/blog/topics/developers-practitioners/gemini-cli-custom-slash-commands
- CodexImporter（Markdown+frontmatter）：
  - frontmatter：`description`、`argument-hint`、`arguments[]`、`x-preserve.metadata/runtime`。
  - 正文为 `prompt`；尾部 "## Examples" 解析为 `examples[]`。
  - 参考：Codex CLI Slash Commands https://developers.openai.com/codex/guides/slash-commands/

## 导出器实现
- ClaudeExporter：IR→JSON/YAML（按输入格式偏好可选），保持原结构字段。
- GeminiExporter：IR→`.toml`，字段映射：`description/args/prompt/docs.examples/preserve`。
- CodexExporter：IR→`prompts/<name>.md`，frontmatter+正文模板。

## CLI 更新
- `convert` 扩展：`convert --from <claude|gemini|codex|auto> --to <claude|gemini|codex|all> --src <dir> --out <dir> [--concurrency N] [--dry-run]`
  - `auto` 根据文件类型自动分发。
  - 保留现有事务与并发实现。
- `validate`：支持 `--target <claude|gemini|codex|ir|all>`，新增对输入平台的格式校验（Gemini TOML、Codex frontmatter、Claude JSON/YAML）。
- `roundtrip`：`roundtrip --from <A> --to <B> [--back <A>]` 执行 A→IR→B→IR 比对，输出差异与保留字段报告；支持批量。
- `install`：保留，支持从任意目标平台输出目录同步到项目根目录 `.gemini/commands` 与 `.codex/prompts`（Claude 选项可同步到 `.claude/commands`）。

## 映射细则
- `name`：文件名与 frontmatter/IR 同步；Gemini 保持大小写；Codex 触发名为 `/prompts:<name>`。
- `arguments`：
  - Gemini `[args]` ↔ Codex `arguments[]`；`argument-hint` 由 IR 自动生成（必填参数用 `<arg>`、可选用 `[arg]`）。
  - Claude 自定义参数命名映射；若无参数区则为空数组。
- `prompt`：
  - 系统/用户消息合并为模板文本；变量占位 `${ARG}` 保留。
  - Codex 正文；Gemini 多行字符串；Claude 采用 `prompt` 字段或 `messages` 拼接。
- `examples`：Gemini `docs.examples` ↔ Codex "## Examples" 列表 ↔ Claude `examples[]`。
- `runtime/model/temperature`：两端不支持时保留到 `metadata/runtime` 并在报告提示降级。
- `tools/MCP`：
  - Gemini 支持 MCP；映射到 IR 的 `tools/contexts`。
  - Codex/Claude 不支持的部分进入 `metadata.extra` 并在报告中标注。

## 质量保证
- Schema：输入/输出/IR 全覆盖校验；报错带路径、文件名、行列（frontmatter/TOML/YAML）。
- 差异报告：
  - 字段级 `added/removed/changed` 与语义说明（合并/降级/保留）。
  - Round-trip 专用报告：A→B→A 差异与不可逆字段列表。
- 事务与回滚：沿用现有机制；对 `install`、`convert` 均记录快照与备份。

## 性能与稳定性
- 并发池与背压已具备；导入器/导出器接口统一，支持批量流水线。
- TOML/YAML 采用成熟解析库；对异常语法提供容错与跳过策略。

## 交付内容
- 三方互转的导入器与导出器、CLI 扩展（convert/validate/roundtrip/install）。
- 完整示例与使用文档；Schema 与报告产物。

## 下一步
- 实现 Gemini/Codex 导入器 → 扩展 `convert --from/--to` → 增加 `roundtrip` 与输入校验 → 完善示例与文档。