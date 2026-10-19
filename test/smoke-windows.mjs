/* ============================================================================
 * Windows 兼容性冒烟测试
 * ----------------------------------------------------------------------------
 * 这个仓库要在 Windows 上「解压就能用」，但 Windows 对脚本文件有三处硬要求，
 * 出问题时（批处理标签找不到、PowerShell 中文乱码、行尾被 git 改写）都很隐蔽，
 * 所以把它们钉成断言：
 *
 *   [1] .cmd 是 CRLF 行尾，且第一行是 @echo off、切到 UTF-8 代码页
 *   [2] .ps1 是 UTF-8 with BOM + CRLF（PowerShell 5.1 无 BOM 会按 ANSI 读）
 *   [3] .gitattributes 声明了 .cmd/.bat/.ps1 走 CRLF、二进制文件不走文本改写
 *   [4] 两个安装入口做的事一致：都能找 dsh、都能指定 profile、都检查退出码
 *   [5] 两个预览入口都能打开 preview/index.html，且文件真实存在
 *   [6] README 里的 Windows 小节存在，且引用的截图文件都在仓库里
 *
 * 用法：node test/smoke-windows.mjs
 * ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let pass = 0
let fail = 0
function check(label, ok, extra) {
  if (ok) { pass++; console.log('  ok   ' + label) }
  else { fail++; console.log('  FAIL ' + label + (extra !== undefined ? '  → ' + extra : '')) }
}

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const buf = (name) => {
  const p = path.join(ROOT, name)
  return fs.existsSync(p) ? fs.readFileSync(p) : null
}
const text = (name) => {
  const b = buf(name)
  return b ? b.toString('utf8') : null
}

/** 只允许 CRLF：出现「没有前置 \r 的 \n」就算不合格 */
function lfOnly(src) {
  return /\n/.test(src.replace(/\r\n/g, ''))
}
const hasBom = (b) => !!b && b.length > 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf

console.log('Windows 兼容性')
console.log('='.repeat(60))

/* [1] .cmd ────────────────────────────────────────────────────────────── */
const cmds = ['安装.cmd', '打开预览.cmd']
for (const name of cmds) {
  const b = buf(name)
  check(name + ' 存在', !!b)
  if (!b) continue
  const src = b.toString('utf8')
  check(name + ' 是 CRLF 行尾', !lfOnly(src))
  check(name + ' 首行 @echo off', /^@echo off\r\n/.test(src))
  check(name + ' 有 pause 收尾（双击跑完不闪退）', /pause/i.test(src))
}
const installCmd = text('安装.cmd') || ''
check('安装.cmd 切到 UTF-8 代码页', /chcp 65001/i.test(installCmd))
check('安装.cmd 调用 dsh plugin add', /dsh plugin --profile .+ add/.test(installCmd))
check('安装.cmd 检查退出码', /errorlevel/i.test(installCmd))
check('安装.cmd 检测 profile 目录', /profiles\\web/.test(installCmd) && /profiles\\desktop/.test(installCmd))
const previewCmd = text('打开预览.cmd') || ''
check('打开预览.cmd 指向 preview\\index.html', /preview\\index\.html/.test(previewCmd))

/* [2] .ps1 ────────────────────────────────────────────────────────────── */
const pss = ['install.ps1', 'open-preview.ps1']
for (const name of pss) {
  const b = buf(name)
  check(name + ' 存在', !!b)
  if (!b) continue
  check(name + ' 带 UTF-8 BOM', hasBom(b))
  check(name + ' 是 CRLF 行尾', !lfOnly(b.toString('utf8')))
}
const installPs = text('install.ps1') || ''
check('install.ps1 声明最低版本', /#Requires -Version 5\.1/.test(installPs))
check('install.ps1 有 -Profile 参数', /ValidateSet\('auto',\s*'web',\s*'desktop'\)/.test(installPs))
check('install.ps1 有 -Pkg 参数', /\$Pkg/.test(installPs))
check('install.ps1 调用 dsh plugin add', /& dsh plugin --profile \$t add \$Pkg/.test(installPs))
check('install.ps1 检查退出码', /\$LASTEXITCODE/.test(installPs))
check('install.ps1 支持 DSH_HOME', /\$env:DSH_HOME/.test(installPs))
check('install.ps1 定位自身目录用 PSScriptRoot', /\$PSScriptRoot/.test(installPs))
const previewPs = text('open-preview.ps1') || ''
check('open-preview.ps1 用 Start-Process 打开页面', /Start-Process/.test(previewPs))

/* [3] .gitattributes ──────────────────────────────────────────────────── */
const attrs = text('.gitattributes') || ''
check('.gitattributes 存在', attrs.length > 0)
check('.gitattributes 规定 .cmd 走 CRLF', /^\*\.cmd\s+text\s+eol=crlf/m.test(attrs))
check('.gitattributes 规定 .bat 走 CRLF', /^\*\.bat\s+text\s+eol=crlf/m.test(attrs))
check('.gitattributes 规定 .ps1 走 CRLF', /^\*\.ps1\s+text\s+eol=crlf/m.test(attrs))
check('.gitattributes 把音频/图片标为 binary', /^\*\.mp3\s+binary/m.test(attrs) && /^\*\.png\s+binary/m.test(attrs))

/* [4] 预览页真实存在，两个入口都指向它 ─────────────────────────────────── */
check('preview/index.html 存在', fs.existsSync(path.join(ROOT, 'preview', 'index.html')))

/* [5] README：Windows 说明 + 截图引用 ──────────────────────────────────── */
const readme = text('README.md') || ''
check('README 有「截图」小节', /^## 截图$/m.test(readme))
check('README 有「Windows 安装」小节', /### Windows 安装/.test(readme))
check('README 提到 install.ps1', /install\.ps1/.test(readme))
check('README 提到 CRLF 处理', /CRLF/.test(readme))
check('README 有目录结构 / 常见问题 / 开发小节',
  /^## 目录结构$/m.test(readme) && /^## 常见问题$/m.test(readme) && /^## 开发与自测$/m.test(readme))

const shots = [...readme.matchAll(/\(docs\/img\/([^)]+)\)/g)].map((m) => m[1])
check('README 引用了截图', shots.length > 0, shots.length + ' 张')
for (const name of shots) {
  check('截图存在：' + name, fs.existsSync(path.join(ROOT, 'docs', 'img', name)))
}

/* [6] package.json 把这些脚本一起发出去 ───────────────────────────────── */
const pkg = JSON.parse(text('package.json') || '{}')
check('package.json 声明了 npm test', typeof pkg.scripts?.test === 'string')
check('test 脚本含 smoke-windows', /smoke-windows/.test(pkg.scripts?.test || ''))
check('files 收录 install.ps1', (pkg.files || []).includes('install.ps1'))
check('files 收录 open-preview.ps1', (pkg.files || []).includes('open-preview.ps1'))
check('files 收录 .gitattributes', (pkg.files || []).includes('.gitattributes'))
check('files 收录 docs（截图随包走）', (pkg.files || []).includes('docs'))

console.log('='.repeat(60))
console.log('通过 ' + pass + ' / 失败 ' + fail)
process.exit(fail === 0 ? 0 : 1)