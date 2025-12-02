import fs from 'node:fs';
import { parse as parseYaml } from 'yaml';

/**
 * 解析 Codex prompts Markdown 为 IR
 * @param {string} filePath 文件路径
 * @returns {Promise<{name:string,description?:string,arguments?:Array,prompt:string,examples?:string[],metadata?:object,runtime?:object}>}
 */
export async function importCodex(filePath) {
  const raw = await fs.promises.readFile(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const name = filePath.split('/').pop().replace(/\.md$/i, '');
  let fm = {}; let body = raw;
  if (m) { fm = parseYaml(m[1]) || {}; body = m[2] || ''; }
  const examples = [];
  const exMatch = body.match(/##\s*Examples\n([\s\S]*)/i);
  if (exMatch) {
    examples.push(...exMatch[1].split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2)));
    body = body.replace(exMatch[0], '').trim();
  }
  const ir = {
    name,
    description: fm.description || '',
    arguments: (fm.arguments || []).map((a) => ({
      name: a.name,
      type: a.type || 'string',
      required: !!a.required,
      default: a.default,
      hint: a.hint || '',
    })),
    prompt: body.trim(),
    examples,
    metadata: (fm['x-preserve'] && fm['x-preserve'].metadata) || {},
    runtime: (fm['x-preserve'] && fm['x-preserve'].runtime) || {},
  };
  return ir;
}
