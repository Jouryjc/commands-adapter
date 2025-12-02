## 变更摘要
- 新增“产物复制到项目根目录”的快捷指令：将 `out/gemini/commands` 与 `out/codex/prompts` 一键同步到项目根目录的 `.gemini/commands` 与 `.codex/prompts`。
- 提供覆盖策略与备份机制，支持 dry-run。

## 复制/安装机制
- 目标目录（项目根）：
  - Gemini：`<project>/.gemini/commands/`
  - Codex：`<project>/.codex/prompts/`
- 行为：
  - 递归复制 `out/<platform>/...` 保持相对路径与文件名
  - 冲突策略：`--overwrite` 覆盖、`--skip` 跳过、默认 `--backup`（备份为 `*.bak` 并提示）
  - 保留源/目标哈希与时间戳用于后续 diff 与回滚
- 安全：
  - `--dry-run` 显示复制计划与冲突结果但不实际写入
  - 所有动作记录到事务日志，支持 `rollback` 反向删除/还原

## CLI 更新
- `install [--platform gemini|codex|all] [--from ./out] [--to .] [--overwrite|--skip|--backup] [--dry-run]`
  - 默认 `--to .`（当前项目根目录）
  - 示例：
    - `convert --platform all && install --platform all --backup`
    - `install --platform gemini --to . --overwrite`
- 现有命令保持不变：`convert`、`validate`、`diff`、`rollback`、`list`

## 事务与回滚
- `install` 生成独立事务 ID，内容含：源/目标路径、哈希、覆盖策略与备份位置
- `rollback --txn <id>` 可恢复复制前状态（删除新文件/还原 `.bak`）

## 文档与提示
- 完成后在控制台打印：复制统计（新增/覆盖/跳过/失败）、目标目录、事务 ID
- 提供建议：如需让 CLI 立即生效，用户可将项目目录映射或手动拷贝至用户级目录（Gemini：`~/.gemini/commands`；Codex：`~/.codex/prompts`），但默认仅复制至项目根以便审阅/版本控制

## 其余方案保持不变
- IR 设计、转换器、校验、报告、性能策略、测试计划与日志/错误处理仍与前版对齐
- 参考：
  - Gemini CLI 自定义命令（`.toml` 文件与命令名规则）[Gemini CLI: Custom slash commands | Google Cloud Blog](https://cloud.google.com/blog/topics/developers-practitioners/gemini-cli-custom-slash-commands)
  - Codex CLI Slash Commands 与自定义 prompts（Markdown + frontmatter，触发 `/prompts:<name>`）[Slash commands in Codex CLI](https://developers.openai.com/codex/guides/slash-commands/)