/* ============================================================================
 * 桌面端原生启动壳冒烟测试
 * ----------------------------------------------------------------------------
 * 这一层是 Electron 主进程在网页层之前加载的原生画面（Resources/splash.html、
 * safe-mode.html、plugin-recovery.html、web-import.html），插件注入不到，
 * 只能以单文件形式随仓库下发、由使用方覆盖进应用包。
 *
 * 本测试不启动 Electron，只对仓库里 desktop-shell/ 下的四份文件做静态断言，
 * 保证「与插件同源」这件事不会在后续改动里悄悄走样：
 *   [1] 四份文件都在，且 splash.html 引用不了任何外部资源（离线也要成立）
 *   [2] 色板与 lib/splash.css 的 .dsu-mode-portal 一致（同一组 --p-* 变量）
 *   [3] 徽记用的就是插件那条 MARK_PATH（同一个菱形，不是手画的近似）
 *   [4] 落墨是「描边 → 填色」两段过渡，不是同帧切类
 *   [5] 时间轴：勾线 → 落墨 → 字标 → 舞台，且都错峰
 *   [6] 有 prefers-reduced-motion 兜底，且覆盖新增的波形/状态格
 *   [7] 不出现 filter: blur / drop-shadow（会逐帧重算，破坏帧率）
 *
 * 用法：node test/smoke-desktop-shell.mjs
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
const SHELL = path.join(ROOT, 'desktop-shell')
const read = (name) => {
  const p = path.join(SHELL, name)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

console.log('桌面端原生启动壳')
console.log('='.repeat(60))

/* [1] 四个文件都在，且外壳自包含 ───────────────────────────────────────── */
const splash = read('splash.html')
check('splash.html 存在', typeof splash === 'string' && splash.length > 1000,
  splash === null ? 'missing' : String(splash && splash.length))
for (const name of ['safe-mode.html', 'plugin-recovery.html', 'web-import.html']) {
  const src = read(name)
  check(name + ' 存在', typeof src === 'string' && src.length > 1000,
    src === null ? 'missing' : String(src && src.length))
}

/* 启动壳是纯单文件：不能有 <link rel=stylesheet>、不能有外链 script/img ─ */
if (splash) {
  check('不引用外部样式表', !/<link[^>]+rel=["']?stylesheet/i.test(splash))
  check('不引用外链脚本', !/<script[^>]+src=/i.test(splash))
  check('不引用外链图片', !/<img[^>]+src=["']?(https?:|\/\/)/i.test(splash))
  check('徽记是内联 SVG', /<svg[^>]+class=["']mark["']/i.test(splash))
  check('内容安全策略存在', /Content-Security-Policy/i.test(splash))
}

/* [2] 色板与插件同源 ──────────────────────────────────────────────────── */
const css = fs.readFileSync(path.join(ROOT, 'lib', 'splash.css'), 'utf8')
const portalVars = (() => {
  const at = css.indexOf('.dsu-root.dsu-mode-portal {')
  return at < 0 ? '' : css.slice(at, at + 2400)
})()
const tokenOf = (src, name) => {
  const m = new RegExp('--' + name + '\\s*:\\s*([^;]+);').exec(src || '')
  return m ? m[1].trim().toLowerCase() : null
}
for (const name of ['p-ink', 'p-blue', 'p-blue-d', 'p-blue-l', 'p-mist']) {
  const a = tokenOf(portalVars, name)
  const b = tokenOf(splash, name)
  check('色板 ' + name + ' 与插件一致', a !== null && a === b, a + ' vs ' + b)
}
for (const name of ['p-plane-t', 'p-plane-m', 'p-plane-b']) {
  const a = tokenOf(portalVars, name)
  const b = tokenOf(splash, name)
  check('背景面 ' + name + ' 与插件一致', a !== null && a === b, a + ' vs ' + b)
}
const darkBlock = (() => {
  const at = splash ? splash.indexOf("[data-theme='dark']") : -1
  return at < 0 ? '' : splash.slice(at, at + 1400)
})()
check('深色变体另有一套面板色', darkBlock.length > 0 &&
  tokenOf(darkBlock, 'p-plane-t') !== null &&
  tokenOf(darkBlock, 'p-plane-t') !== tokenOf(portalVars, 'p-plane-t'))

/* [3] 徽记路径就是插件那条 ────────────────────────────────────────────── */
const js = fs.readFileSync(path.join(ROOT, 'lib', 'splash.js'), 'utf8')
const pathMatch = /var MARK_PATH =[\s\S]{0,400}?Z['"]/.exec(js)
const markPath = pathMatch ? pathMatch[0].replace(/\s+/g, ' ').trim() : ''
const seg1 = 'M99 0 L144 46 L144 150 L75 220 L0 145 L75 69 L75 207 L99 183 Z'
const seg2 = 'M168 69 L243 145 L168 220 L168 158 L144 182 L144 243 L121 267 L99 243 L99 214 L168 145 Z'
check('MARK_PATH 仍在插件源码里', markPath.includes(seg1) && markPath.includes(seg2))
check('启动壳用的是同一条路径', splash ? (splash.includes(seg1) && splash.includes(seg2)) : false)

/* [4] 落墨分两段 ─────────────────────────────────────────────────────── */
if (splash) {
  check('实心层默认透明', /#solid\s*\{[^}]*fill-opacity:\s*0/i.test(splash))
  check('填色是过渡不是切类',
    /#solid\s*\{[^}]*transition:\s*fill-opacity/i.test(splash))
  check('落墨状态打开填色', /\.inked[^{]*#solid[^}]*fill-opacity:\s*1/i.test(splash))
  check('勾线层用 dashoffset 过渡',
    /\.dash\s*\{[^}]*transition:\s*stroke-dashoffset/i.test(splash))
  check('勾线长度由脚本量一次',
    /getTotalLength\(\)/.test(splash) && /--len/.test(splash))
  check('描边在落墨后退场', /\.inked[^{]*\.dash[^}]*stroke-opacity:\s*0/i.test(splash))
}

/* [5] 时间轴错峰 ─────────────────────────────────────────────────────── */
if (splash) {
  check('第一拍勾线', /classList\.add\(['"]drawn['"]\)/.test(splash))
  check('第二拍落墨', /setTimeout\([^,]+,\s*1180\)/.test(splash))
  check('第三拍字标', /setTimeout\([^,]+,\s*1240\)/.test(splash))
  check('第四拍舞台', /setTimeout\([^,]+,\s*1560\)/.test(splash))
  const delays = /240\s*\+\s*i\s*\*\s*90/.test(splash)
  check('字标逐字母 90ms 错峰', delays)
  check('缓动不是 linear（统一 ease 曲线族）', /cubic-bezier\(/.test(splash))
}

/* [6] 减动效兜底 ─────────────────────────────────────────────────────── */
if (splash) {
  const rm = /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n      \}/.exec(splash)
  const block = rm ? rm[0] : ''
  check('有 prefers-reduced-motion 分支', block.length > 0)
  check('减动效覆盖波形', block.includes('.wave i'))
  check('减动效覆盖状态格', block.includes('.heat i span'))
  check('减动效覆盖阶段表', block.includes('.sigPanel') && block.includes('.heat'))
}

/* [7] 不挂逐帧滤镜 ───────────────────────────────────────────────────── */
if (splash) {
  check('没有 filter: blur', !/filter:\s*blur\(/i.test(splash))
  check('没有 drop-shadow', !/drop-shadow\(/i.test(splash))
  check('徽记上开了合成层', /transform:\s*translateZ\(0\)/i.test(splash))
}

/* 另外三张原生页：至少确认仍是同一套变量名，没有回退成中性灰 ──────────── */
for (const name of ['safe-mode.html', 'plugin-recovery.html', 'web-import.html']) {
  const src = read(name) || ''
  check(name + ' 用 --ink/--surface 变量体系',
    src.includes('--ink') && src.includes('--surface'))
  check(name + ' 主色是哈夫克蓝', /#2362af/i.test(src))
  check(name + ' 没残留纯黑按钮', !/--button:\s*#18181b/i.test(src))
}

console.log('='.repeat(60))
console.log('通过 ' + pass + ' / 失败 ' + fail)
process.exit(fail === 0 ? 0 : 1)
