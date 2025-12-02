/**
 * 记录日志（控制台与结构化）
 * @param {('debug'|'info'|'warn'|'error')} level 日志级别
 * @param {string} message 文本消息
 * @param {object} [context] 结构化上下文
 */
export function log(level, message, context = {}) {
  const ts = new Date().toISOString();
  const line = JSON.stringify({ ts, level, message, ...context });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * 设置日志级别过滤器
 * @param {('debug'|'info'|'warn'|'error')} minLevel 最低输出级别
 * @returns {(level:string)=>boolean}
 */
export function levelFilter(minLevel = 'info') {
  const order = { debug: 10, info: 20, warn: 30, error: 40 };
  return (level) => order[level] >= order[minLevel];
}
