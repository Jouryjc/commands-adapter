import { stringify as yamlStringify } from 'yaml';

/**
 * IR 导出为 Claude 指令（JSON 或 YAML）
 * @param {{name:string,description?:string,arguments?:Array,prompt:string,examples?:string[],metadata?:object,runtime?:object}} ir IR对象
 * @param {'json'|'yaml'} format 输出格式
 * @returns {{filename:string, content:string}}
 */
export function toClaude(ir, format = 'json') {
  const obj = {
    name: ir.name,
    description: ir.description || '',
    arguments: ir.arguments || [],
    prompt: ir.prompt || '',
    examples: ir.examples || [],
    metadata: ir.metadata || {},
    runtime: ir.runtime || {},
  };
  if (format === 'yaml') {
    return { filename: `${ir.name}.yaml`, content: yamlStringify(obj) };
  }
  return { filename: `${ir.name}.json`, content: JSON.stringify(obj, null, 2) };
}
