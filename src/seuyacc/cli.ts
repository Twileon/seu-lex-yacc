/**
 * seuyacc CLI 工具
 * 使用：
 *    node <path_to_project>/dist/seuyacc/cli.js [yacc_file] [options]
 *    [options]:
 * github.com/z0gSh1u/seu-lex-yacc
 */

import { stdoutPrint } from '../utils'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const args = require('minimist')(process.argv.slice(2))
// args looks like { _: [ 'example/md.l' ], v: true }
const tik = new Date().getTime()
if (args._.length === 0) {
  stdoutPrint(`Missing argument [lex_file].\n`)
} else if (args._.length !== 1) {
  stdoutPrint(`Too many arguments or .l file not specified.\n`)
} else {
  // TODO:
}
stdoutPrint(`[ All work done! ]\n`)
const tok = new Date().getTime()
stdoutPrint(`[ Time consumed: ${tok - tik} ms. ]\n`)
