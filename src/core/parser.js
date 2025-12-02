import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * 解析指令文件为原始对象
 * @param {string} filePath 文件路径
 * @returns {Promise<{data:any, format:'json'|'yaml'}>}
 */
export async function parseCommandFile(filePath) {
  const raw = await fs.promises.readFile(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    return { data: JSON.parse(raw), format: 'json' };
  }
  if (ext === '.yaml' || ext === '.yml') {
    return { data: parseYaml(raw), format: 'yaml' };
  }
  throw new Error(`Unsupported format: ${ext}`);
}
