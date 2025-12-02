/**
 * 获取默认配置
 * @returns {{src:string,out:string,concurrency:number,logLevel:string,strict:boolean,failFast:boolean}}
 */
export function defaultConfig() {
  return {
    src: '.claude/commands',
    out: 'out',
    concurrency: 8,
    logLevel: 'info',
    strict: false,
    failFast: false,
  };
}
