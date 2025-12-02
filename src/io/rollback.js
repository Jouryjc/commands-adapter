import fs from 'node:fs';
import path from 'node:path';

/**
 * 记录事务信息
 * @param {string} base 事务根目录
 * @param {string} id 事务ID
 * @param {object} payload 事务内容
 * @returns {Promise<string>}
 */
export async function writeTransaction(base, id, payload) {
  const dir = path.join(base, id);
  await fs.promises.mkdir(dir, { recursive: true });
  const fp = path.join(dir, 'transaction.json');
  await fs.promises.writeFile(fp, JSON.stringify(payload, null, 2), 'utf8');
  return fp;
}

/**
 * 执行回滚：删除新文件与恢复备份
 * @param {string} base 事务根目录
 * @param {string} id 事务ID
 * @returns {Promise<{removed:number,restored:number}>}
 */
export async function rollback(base, id) {
  const dir = path.join(base, id);
  const fp = path.join(dir, 'transaction.json');
  const raw = await fs.promises.readFile(fp, 'utf8');
  const tx = JSON.parse(raw);
  let removed = 0, restored = 0;
  for (const f of tx.createdFiles || []) {
    try { await fs.promises.rm(f, { force: true }); removed++; } catch {}
  }
  for (const b of tx.backups || []) {
    const { bak, original } = b;
    try { await fs.promises.copyFile(bak, original); restored++; } catch {}
  }
  return { removed, restored };
}
