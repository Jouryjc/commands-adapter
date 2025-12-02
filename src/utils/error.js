/**
 * 创建统一错误对象
 * @param {string} code 错误代码
 * @param {string} message 错误消息
 * @param {object} [context] 额外上下文
 * @returns {Error}
 */
export function createError(code, message, context = {}) {
  const err = new Error(message);
  err.code = code;
  err.context = context;
  return err;
}

/**
 * 序列化错误用于日志
 * @param {Error} err 错误对象
 * @returns {object}
 */
export function serializeError(err) {
  return {
    code: err.code || 'UNKNOWN',
    message: err.message,
    stack: err.stack,
    context: err.context || {},
  };
}
