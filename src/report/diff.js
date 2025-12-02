/**
 * 生成字段级差异报告
 * @param {object} ir IR对象
 * @param {object} out 平台输出对象（解析后的结构）
 * @returns {{added:string[],removed:string[],changed:string[]}}
 */
export function diffFields(ir, out) {
  const irKeys = new Set(Object.keys(ir));
  const outKeys = new Set(Object.keys(out));
  const added = [...outKeys].filter((k) => !irKeys.has(k));
  const removed = [...irKeys].filter((k) => !outKeys.has(k));
  const shared = [...irKeys].filter((k) => outKeys.has(k));
  const changed = shared.filter((k) => JSON.stringify(ir[k]) !== JSON.stringify(out[k]));
  return { added, removed, changed };
}
