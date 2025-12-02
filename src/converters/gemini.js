import TOML from '@iarna/toml';

/**
 * 将 IR 转为 Gemini `.toml` 文本
 * @param {{name:string,description?:string,arguments?:Array,prompt:string,examples?:string[],metadata?:object,runtime?:object}} ir IR对象
 * @returns {{filename:string, content:string}}
 */
export function toGeminiToml(ir) {
  const doc = {
    description: ir.description || '',
    args: (ir.arguments || []).map((a) => ({
      name: a.name,
      type: a.type || 'string',
      required: !!a.required,
      default: a.default === undefined ? null : a.default,
      hint: a.hint || '',
    })),
    prompt: ir.prompt || '',
    docs: { examples: ir.examples || [] },
    preserve: { metadata: ir.metadata || {}, runtime: ir.runtime || {} },
  };
  const content = TOML.stringify(doc);
  return { filename: `${ir.name}.toml`, content };
}
