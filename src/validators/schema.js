import Ajv from 'ajv';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 构建 Ajv 校验器
 * @returns {Ajv}
 */
export function buildAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv;
}

/**
 * 加载并编译 JSON Schema
 * @param {Ajv} ajv Ajv 实例
 * @param {string} schemaPath 架构文件路径
 * @returns {(data:any)=>boolean}
 */
export function compileSchema(ajv, schemaPath) {
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(raw);
  return ajv.compile(schema);
}
