import fs from 'node:fs';
import TOML from '@iarna/toml';

/**
 * 解析 Gemini .toml 为 IR
 * @param {string} filePath 文件路径
 * @returns {Promise<{name:string,description?:string,arguments?:Array,prompt:string,examples?:string[],metadata?:object,runtime?:object}>}
 */
export async function importGemini(filePath) {
  const raw = await fs.promises.readFile(filePath, 'utf8');
  const obj = TOML.parse(raw);
  const name = filePath.split('/').pop().replace(/\.toml$/i, '');
  const ir = {
    name,
    description: obj.description || '',
    arguments: (obj.args || []).map((a) => ({
      name: a.name,
      type: a.type || 'string',
      required: !!a.required,
      default: a.default === null ? undefined : a.default,
      hint: a.hint || '',
    })),
    prompt: obj.prompt || '',
    examples: (obj.docs && obj.docs.examples) || [],
    metadata: (obj.preserve && obj.preserve.metadata) || {},
    runtime: (obj.preserve && obj.preserve.runtime) || {},
  };
  return ir;
}
