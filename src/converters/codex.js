/**
 * 将 IR 转为 Codex prompts Markdown 文本
 * @param {{name:string,description?:string,arguments?:Array,prompt:string,examples?:string[],metadata?:object,runtime?:object}} ir IR对象
 * @returns {{filename:string, content:string}}
 */
import { stringify as yamlStringify } from 'yaml';

export function toCodexMarkdown(ir) {
  const args = (ir.arguments || []).map((a) => ({
    name: a.name,
    type: a.type || 'string',
    required: !!a.required,
    default: a.default,
    hint: a.hint || '',
  }));
  const argumentHint = args.map((a) => `${a.required ? '<' : '['}${a.name}${a.required ? '>' : ']'}`).join(' ');
  const fmObj = {
    description: String(ir.description || ''),
    'argument-hint': String(argumentHint),
    arguments: args,
    'x-preserve': {
      metadata: ir.metadata || {},
      runtime: ir.runtime || {},
    },
  };
  const frontmatter = `---\n${yamlStringify(fmObj)}---`;
  const examples = (ir.examples || []).length ? `\n\n## Examples\n${ir.examples.map((e) => `- ${e}`).join('\n')}` : '';
  const content = `${frontmatter}\n\n${ir.prompt || ''}${examples}`;
  return { filename: `${ir.name}.md`, content };
}

/**
 * 转义 frontmatter 文本行
 * @param {string} s 文本
 * @returns {string}
 */
function escapeFront(s) {
  return String(s).replace(/\n/g, ' ').replace(/"/g, '\\"');
}
