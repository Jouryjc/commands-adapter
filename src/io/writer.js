import fs from 'node:fs';
import path from 'node:path';

/**
 * 写出单个文件并确保目录存在
 * @param {string} base 输出根目录
 * @param {string} platform 平台名称（gemini|codex）
 * @param {string} relative 源相对路径（用于保持结构）
 * @param {{filename:string,content:string}} artifact 产物文件
 * @returns {Promise<string>}
 */
export async function writeArtifact(base, platform, relative, artifact) {
  const sub = platform === 'gemini' ? 'commands' : platform === 'codex' ? 'prompts' : 'commands';
  const targetDir = path.join(base, platform, sub, path.dirname(relative));
  await fs.promises.mkdir(targetDir, { recursive: true });
  const outPath = path.join(targetDir, artifact.filename);
  await fs.promises.writeFile(outPath, artifact.content, 'utf8');
  return outPath;
}

/**
 * 批量复制产物到项目根目录
 * @param {string} from 源输出目录
 * @param {string} to 项目根目录
 * @param {'gemini'|'codex'|'all'} platform 平台
 * @param {'overwrite'|'skip'|'backup'} conflict 冲突策略
 * @returns {Promise<{copied:number,skipped:number,overwritten:number,backedUp:number}>}
 */
export async function installArtifacts(from, to, platform = 'all', conflict = 'backup') {
  const stats = { copied: 0, skipped: 0, overwritten: 0, backedUp: 0 };
  const platforms = platform === 'all' ? ['gemini', 'codex'] : [platform];
  for (const p of platforms) {
    const srcDir = path.join(from, p, p === 'gemini' ? 'commands' : p === 'codex' ? 'prompts' : 'commands');
    const dstDir = path.join(to, p === 'gemini' ? '.gemini/commands' : p === 'codex' ? '.codex/prompts' : '.claude/commands');
    await copyDir(srcDir, dstDir, conflict, stats);
  }
  return stats;
}

async function copyDir(src, dst, conflict, stats) {
  if (!await exists(src)) return;
  await fs.promises.mkdir(dst, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d, conflict, stats);
    else await copyFile(s, d, conflict, stats);
  }
}

async function copyFile(s, d, conflict, stats) {
  const existsDst = await exists(d);
  if (!existsDst) {
    await fs.promises.copyFile(s, d);
    stats.copied++;
    return;
  }
  if (conflict === 'skip') {
    stats.skipped++;
    return;
  }
  if (conflict === 'backup') {
    const bak = d + '.bak';
    await fs.promises.copyFile(d, bak);
    stats.backedUp++;
  }
  await fs.promises.copyFile(s, d);
  stats.overwritten++;
}

async function exists(p) {
  try { await fs.promises.access(p); return true; } catch { return false; }
}
