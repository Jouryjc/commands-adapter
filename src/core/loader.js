import fs from 'node:fs';
import path from 'node:path';

/**
 * 递归扫描目录，返回指令文件路径列表
 * @param {string} root 源目录
 * @returns {Promise<string[]>}
 */
export async function scanCommandFiles(root) {
  const results = [];
  async function walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) await walk(fp);
      else if (isCommandFile(fp)) results.push(fp);
    }
  }
  await walk(root);
  return results;
}

/**
 * 判断是否为支持的指令文件
 * @param {string} filePath 文件路径
 * @returns {boolean}
 */
export function isCommandFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.json', '.yaml', '.yml'].includes(ext);
}

/**
 * 计算相对源路径（去掉根目录前缀）
 * @param {string} root 根目录
 * @param {string} filePath 文件路径
 * @returns {string}
 */
export function toRelative(root, filePath) {
  return path.relative(root, filePath);
}
