#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { defaultConfig } from './config/defaults.js';
import { log, levelFilter } from './utils/log.js';
import { createError, serializeError } from './utils/error.js';
import { scanCommandFiles, toRelative } from './core/loader.js';
import { parseCommandFile } from './core/parser.js';
import { buildIR } from './core/ir.js';
import { toGeminiToml } from './converters/gemini.js';
import { toCodexMarkdown } from './converters/codex.js';
import { toClaude } from './converters/claude.js';
import { importGemini } from './importers/gemini.js';
import { importCodex } from './importers/codex.js';
import { buildAjv, compileSchema } from './validators/schema.js';
import TOML from '@iarna/toml';
import { writeArtifact, installArtifacts } from './io/writer.js';
import { writeTransaction, rollback } from './io/rollback.js';
import { parse as parseYaml } from 'yaml';

/**
 * 启动 CLI
 * @returns {Promise<void>}
 */
async function main() {
  const program = new Command();
  program.name('cmd-adapter').description('批量指令转换为 Gemini/Codex 配置').version('0.1.0');

  program
    .command('list')
    .option('--src <dir>', '源目录', defaultConfig().src)
    .action(async (opts) => {
      try {
        const files = await scanCommandFiles(opts.src);
        for (const f of files) console.log(f);
      } catch (err) {
        log('error', 'list failed', serializeError(err));
        process.exitCode = 1;
      }
    });

  program
    .command('convert')
    .option('--from <p>', 'claude|gemini|codex|auto', 'auto')
    .option('--to <p>', 'claude|gemini|codex|all', 'all')
    .option('--src <dir>', '源目录', defaultConfig().src)
    .option('--out <dir>', '输出目录', defaultConfig().out)
    .option('--concurrency <n>', '并发度', String(defaultConfig().concurrency))
    .option('--log-level <lvl>', '日志级别', defaultConfig().logLevel)
    .action(async (opts) => {
      const allow = levelFilter(opts.logLevel);
      const ajv = buildAjv();
      const irValidate = compileSchema(ajv, path.join('schemas', 'ir.schema.json'));
      const txId = crypto.randomUUID();
      const createdFiles = [];
      try {
        const files = await scanCommandFiles(opts.src);
        const pool = Number(opts.concurrency) > 0 ? Number(opts.concurrency) : 8;
        let idx = 0;
        async function worker() {
          while (idx < files.length) {
            const f = files[idx++];
            const rel = toRelative(opts.src, f);
            const ir = await importToIR(f, opts.from);
            if (!irValidate(ir)) {
              throw createError('IR_INVALID', 'IR schema invalid', { errors: ajv.errors });
            }
            if (opts.to === 'gemini' || opts.to === 'all') {
              const art = toGeminiToml(ir);
              const outPath = await writeArtifact(opts.out, 'gemini', rel, art);
              createdFiles.push(outPath);
              if (allow('info')) log('info', 'gemini written', { outPath });
            }
            if (opts.to === 'codex' || opts.to === 'all') {
              const art = toCodexMarkdown(ir);
              const outPath = await writeArtifact(opts.out, 'codex', rel, art);
              createdFiles.push(outPath);
              if (allow('info')) log('info', 'codex written', { outPath });
            }
            if (opts.to === 'claude' || opts.to === 'all') {
              const art = toClaude(ir, 'json');
              const outPath = await writeArtifact(opts.out, 'claude', rel, art);
              createdFiles.push(outPath);
              if (allow('info')) log('info', 'claude written', { outPath });
            }
          }
        }
        await Promise.all(Array.from({ length: pool }, () => worker()));
        await writeTransaction(path.join('transactions'), txId, { createdFiles, time: new Date().toISOString() });
        if (allow('info')) log('info', 'convert done', { txId, created: createdFiles.length });
      } catch (err) {
        log('error', 'convert failed', serializeError(err));
        process.exitCode = 1;
      }
    });

  program
    .command('validate')
    .option('--target <t>', 'gemini|codex|claude|ir|all', 'all')
    .option('--path <dir>', '校验路径', 'out')
    .action(async (opts) => {
      try {
        const ajv = buildAjv();
        const valGemini = compileSchema(ajv, path.join('schemas', 'gemini.schema.json'));
        const valCodex = compileSchema(ajv, path.join('schemas', 'codex.schema.json'));
        const irValidate = compileSchema(ajv, path.join('schemas', 'ir.schema.json'));
        let ok = true;
        if (opts.target === 'gemini' || opts.target === 'all') {
          ok = ok && await validateDir(path.join(opts.path, 'gemini', 'commands'), (obj) => valGemini(obj));
        }
        if (opts.target === 'codex' || opts.target === 'all') {
          ok = ok && await validateDir(path.join(opts.path, 'codex', 'prompts'), (obj) => valCodex(obj.frontmatter));
        }
        if (opts.target === 'claude' || opts.target === 'all') {
          ok = ok && await validateDir(path.join(opts.path, 'claude', 'commands'), (obj) => irValidate(obj));
        }
        if (!ok) process.exitCode = 1;
      } catch (err) {
        log('error', 'validate failed', serializeError(err));
        process.exitCode = 1;
      }
    });

  program
    .command('diff')
    .option('--txn <id>', '事务ID')
    .action(async (opts) => {
      try {
        if (!opts.txn) throw createError('ARG', 'txn is required');
        const fp = path.join('transactions', opts.txn, 'transaction.json');
        const raw = await fs.promises.readFile(fp, 'utf8');
        const tx = JSON.parse(raw);
        console.log(JSON.stringify({ files: tx.createdFiles || [] }, null, 2));
      } catch (err) {
        log('error', 'diff failed', serializeError(err));
        process.exitCode = 1;
      }
    });

  program
    .command('rollback')
    .option('--txn <id>', '事务ID')
    .action(async (opts) => {
      try {
        if (!opts.txn) throw createError('ARG', 'txn is required');
        const res = await rollback('transactions', opts.txn);
        console.log(JSON.stringify(res));
      } catch (err) {
        log('error', 'rollback failed', serializeError(err));
        process.exitCode = 1;
      }
    });

  program
    .command('install')
    .option('--platform <p>', 'gemini|codex|all', 'all')
    .option('--from <dir>', '源输出目录', 'out')
    .option('--to <dir>', '目标项目根', '.')
    .option('--strategy <s>', 'overwrite|skip|backup', 'backup')
    .option('--dry-run', '仅显示计划不执行', false)
    .action(async (opts) => {
      try {
        if (opts.dry_run || opts.dryRun) {
          console.log(JSON.stringify({ plan: { platform: opts.platform, from: opts.from, to: opts.to, strategy: opts.strategy } }, null, 2));
          return;
        }
        const txId = crypto.randomUUID();
        const stats = await installArtifacts(opts.from, opts.to, opts.platform, opts.strategy);
        await writeTransaction(path.join('transactions'), txId, { install: { from: opts.from, to: opts.to, platform: opts.platform, strategy: opts.strategy }, stats });
        console.log(JSON.stringify({ txId, stats }, null, 2));
      } catch (err) {
        log('error', 'install failed', serializeError(err));
        process.exitCode = 1;
      }
    });

  program
    .command('roundtrip')
    .option('--from <p>', 'claude|gemini|codex', 'gemini')
    .option('--to <p>', 'claude|gemini|codex', 'codex')
    .option('--src <dir>', '源目录', '.')
    .option('--out <dir>', '输出目录', 'out')
    .action(async (opts) => {
      try {
        const files = await scanCommandFiles(opts.src);
        const reports = [];
        for (const f of files) {
          const rel = toRelative(opts.src, f);
          const irA = await importToIR(f, opts.from);
          const toPaths = [];
          if (opts.to === 'gemini') {
            const art = toGeminiToml(irA); toPaths.push(await writeArtifact(opts.out, 'gemini', rel, art));
          } else if (opts.to === 'codex') {
            const art = toCodexMarkdown(irA); toPaths.push(await writeArtifact(opts.out, 'codex', rel, art));
          } else {
            const art = toClaude(irA, 'json'); toPaths.push(await writeArtifact(opts.out, 'claude', rel, art));
          }
          const last = toPaths[0];
          const irB = await importToIR(last, opts.to);
          const diff = computeDiff(irA, irB);
          reports.push({ source: f, target: last, diff });
        }
        console.log(JSON.stringify(reports, null, 2));
      } catch (err) {
        log('error', 'roundtrip failed', serializeError(err));
        process.exitCode = 1;
      }
    });

  await program.parseAsync(process.argv);
}

/**
 * 校验目录下产物（Gemini TOML 或 Codex MD）
 * @param {string} dir 目录
 * @param {(obj:any)=>boolean} validate 验证函数
 * @returns {Promise<boolean>}
 */
async function validateDir(dir, validate) {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    let ok = true;
    for (const e of entries) {
      if (!e.isFile()) continue;
      const fp = path.join(dir, e.name);
      const raw = await fs.promises.readFile(fp, 'utf8');
      let obj;
      if (fp.endsWith('.toml')) {
        // 仅做最小解析：按 JSON 近似格式校验（TOML 更精确解析可拓展）
        obj = minimalTomlToObject(raw);
      } else if (fp.endsWith('.md')) {
        obj = parseFrontmatter(raw);
      } else if (fp.endsWith('.json')) {
        obj = JSON.parse(raw);
      } else if (fp.endsWith('.yaml') || fp.endsWith('.yml')) {
        obj = { frontmatter: null };
        obj = parseYaml(raw);
      } else { continue; }
      const pass = validate(obj);
      if (!pass) { ok = false; console.error(`Invalid: ${fp}`); }
    }
    return ok;
  } catch { return false; }
}

/**
 * 解析 Markdown frontmatter（YAML）
 * @param {string} md Markdown 文本
 * @returns {{frontmatter:object, body:string}}
 */
function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: md };
  const yamlText = m[1];
  const body = m[2];
  return { frontmatter: parseYaml(yamlText), body };
}

/**
 * 最小 TOML 转对象（占位实现）
 * @param {string} toml 文本
 * @returns {object}
 */
function minimalTomlToObject(toml) {
  try { return TOML.parse(toml); } catch { return {}; }
}

/**
 * 动态导入 yaml 解析器
 * @returns {{parse: (s:string)=>any}}
 */
// 移除动态导入，改用顶层导入

main();
/**
 * 导入文件为 IR（按平台或自动探测）
 * @param {string} filePath 文件路径
 * @param {'claude'|'gemini'|'codex'|'auto'} from 源平台
 * @returns {Promise<any>}
 */
async function importToIR(filePath, from = 'auto') {
  const lower = filePath.toLowerCase();
  const plat = from === 'auto'
    ? (lower.endsWith('.toml') ? 'gemini' : lower.endsWith('.md') ? 'codex' : 'claude')
    : from;
  if (plat === 'gemini') return importGemini(filePath);
  if (plat === 'codex') return importCodex(filePath);
  const { data } = await parseCommandFile(filePath);
  return buildIR(data);
}

/**
 * 简单字段差异
 * @param {object} a IR A
 * @param {object} b IR B
 * @returns {{added:string[],removed:string[],changed:string[]}}
 */
function computeDiff(a, b) {
  const keysA = new Set(Object.keys(a));
  const keysB = new Set(Object.keys(b));
  const added = [...keysB].filter((k) => !keysA.has(k));
  const removed = [...keysA].filter((k) => !keysB.has(k));
  const shared = [...keysA].filter((k) => keysB.has(k));
  const changed = shared.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  return { added, removed, changed };
}
