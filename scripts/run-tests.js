#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parseCommandFile } from '../src/core/parser.js'
import { buildIR } from '../src/core/ir.js'
import { toGeminiToml } from '../src/converters/gemini.js'
import { toCodexMarkdown } from '../src/converters/codex.js'
import { importGemini } from '../src/importers/gemini.js'
import { importCodex } from '../src/importers/codex.js'

/**
 * 执行一个断言用例并记录结果
 * @param {string} name 用例名称
 * @param {() => Promise<void>|void} fn 用例函数
 */
async function caseRun(name, fn) {
  const start = Date.now()
  try {
    await fn()
    const ms = Date.now() - start
    console.log(`[PASS] ${name} (${ms}ms)`) 
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`)
    throw err
  }
}

/**
 * 运行测试套件
 */
async function main() {
  let failed = 0
  let passed = 0
  const run = async (name, fn) => {
    try { await caseRun(name, fn); passed++ } catch { failed++ }
  }

  const example = path.join('.claude', 'commands', 'example.json')

  await run('解析示例指令为原始对象', async () => {
    const { data } = await parseCommandFile(example)
    assert.equal(typeof data, 'object')
    assert.equal(data.name, 'review')
  })

  await run('构造 IR 并校验核心字段', async () => {
    const { data } = await parseCommandFile(example)
    const ir = buildIR(data)
    assert.equal(ir.name, 'review')
    assert.ok(ir.prompt.length > 0)
    assert.ok(Array.isArray(ir.arguments))
  })

  await run('导出 Gemini TOML 并可解析', async () => {
    const { data } = await parseCommandFile(example)
    const ir = buildIR(data)
    const art = toGeminiToml(ir)
    assert.ok(art.content.includes('description'))
    assert.ok(art.content.includes('prompt'))
    const tmp = path.join('out', 'gemini', 'commands')
    await fs.promises.mkdir(tmp, { recursive: true })
    const fp = path.join(tmp, art.filename)
    await fs.promises.writeFile(fp, art.content, 'utf8')
    const ir2 = await importGemini(fp)
    assert.equal(ir2.name, ir.name)
    assert.equal(typeof ir2.prompt, 'string')
  })

  await run('导出 Codex Markdown 并可解析', async () => {
    const { data } = await parseCommandFile(example)
    const ir = buildIR(data)
    const art = toCodexMarkdown(ir)
    assert.ok(art.content.startsWith('---'))
    const tmp = path.join('out', 'codex', 'prompts')
    await fs.promises.mkdir(tmp, { recursive: true })
    const fp = path.join(tmp, art.filename)
    await fs.promises.writeFile(fp, art.content, 'utf8')
    const ir2 = await importCodex(fp)
    assert.equal(ir2.name, ir.name)
    assert.ok(ir2.prompt.length > 0)
  })

  console.log(`\nTests: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
