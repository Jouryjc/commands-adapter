/**
 * 构造 IR（中间表示）对象，统一语义
 * @param {any} input 原始解析数据
 * @returns {{name:string,description?:string,arguments?:Array, prompt:string, examples?:string[], metadata?:object, runtime?:object}}
 */
export function buildIR(input) {
  const name = input.name || input.id || 'unnamed';
  const description = input.description || input.desc || '';
  const args = normalizeArgs(input.arguments || input.params || input.parameters || []);
  const prompt = buildPrompt(input);
  const examples = input.examples || [];
  const runtime = input.runtime || { model: input.model, temperature: input.temperature };
  const metadata = { version: input.version, author: input.author, tags: input.tags, extra: input.metadata || input.meta };
  return { name, description, arguments: args, prompt, examples, metadata, runtime };
}

/**
 * 标准化参数列表
 * @param {any[]} list 参数原始列表
 * @returns {Array<{name:string,type?:string,required?:boolean,default?:any,hint?:string}>}
 */
export function normalizeArgs(list) {
  return (Array.isArray(list) ? list : []).map((a) => ({
    name: a.name || a.key || '',
    type: a.type || a.kind || 'string',
    required: !!a.required,
    default: a.default,
    hint: a.hint || a.help || a.description || '',
  })).filter((a) => a.name);
}

/**
 * 生成统一的提示词文本
 * @param {any} input 原始解析数据
 * @returns {string}
 */
export function buildPrompt(input) {
  if (typeof input.prompt === 'string') return input.prompt;
  const parts = [];
  if (input.system) parts.push(String(input.system));
  if (input.user) parts.push(String(input.user));
  if (Array.isArray(input.messages)) parts.push(input.messages.map((m) => String(m.content || m.text || '')).join('\n'));
  return parts.join('\n\n').trim();
}
