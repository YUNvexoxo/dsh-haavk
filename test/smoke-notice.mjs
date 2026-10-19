/* ============================================================================
 * 二次开发声明冒烟测试
 * ----------------------------------------------------------------------------
 * 这个仓库是上游 dsh-startup-screen（MIT，v1.1.1，沈宏宏）的二次开发作品。
 * MIT 要求「版权声明随副本一起走」，而声明最容易在后续改动里被悄悄冲掉：
 * 改 package.json 时删掉 upstream、改 LICENSE 时把两条版权行合成一条、
 * 批量改名时把上游仓库名一起改掉（本仓库真的踩过这个坑 —— 全局更名把
 * `6shenhonghong9/dsh-startup-screen` 变成了 `.../dsh-haavk`，指向一个 404 仓库）。
 * 所以把声明钉成断言：
 *
 *   [1] NOTICE 存在，且写清上游仓库 / 版本 / 作者 / 许可 / 二次开发署名
 *   [2] LICENSE 有两条版权行（上游 + 二次开发），MIT 正文一字未动
 *   [3] package.json 声明 upstream、license、作者与二次开发署名，且随包发布 NOTICE
 *   [4] README 顶部有声明块并链到 NOTICE，来源章节已含正式声明
 *   [5] 四份文档都指向正确的上游仓库名
 *   [6] 全仓（md / json / yml）不再出现被更名误伤的上游仓库名
 *
 * 用法：node test/smoke-notice.mjs
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
const UP = '6shenhonghong9/dsh-startup-screen'
const UPURL = 'https://github.com/' + UP
const WRONG = '6shenhonghong9/dsh-haavk'
const MINE = 'YUNvexoxo/dsh-haavk'
const read = (rel) => {
  const p = path.join(ROOT, rel)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

/* [1] NOTICE ──────────────────────────────────────────────────────────────── */
const notice = read('NOTICE')
check('NOTICE 存在', notice !== null)
const n = notice || ''
check('NOTICE 自称二次开发作品', /二次开发作品/.test(n))
check('NOTICE 写明上游仓库', n.includes(UP))
check('NOTICE 写明上游地址', n.includes(UPURL))
check('NOTICE 写明上游版本 v1.1.1', /v1\.1\.1/.test(n))
check('NOTICE 写明上游作者沈宏宏', n.includes('沈宏宏'))
check('NOTICE 写明上游许可 MIT', /MIT/.test(n))
check('NOTICE 写明二次开发署名', n.includes('YUNvexoxo'))
check('NOTICE 写明第三方素材权利', /腾讯/.test(n) && /天美/.test(n))
check('NOTICE 指向差异文档', n.includes('docs/UPSTREAM-DIFF.md'))
check('NOTICE 指向免责条款', n.includes('README.md#免责声明'))

/* [2] LICENSE ─────────────────────────────────────────────────────────────── */
const lic = read('LICENSE') || ''
const copyLines = lic.split('\n').filter((l) => /^Copyright \(c\)/.test(l))
check('LICENSE 有两条版权行', copyLines.length === 2, copyLines.length + ' 条')
check('LICENSE 第一条是上游作者', copyLines[0]?.includes('沈宏宏'))
check('LICENSE 第二条是二次开发署名', copyLines[1]?.includes('YUNvexoxo'))
check('LICENSE 版权行标了 upstream', copyLines[0]?.includes(UPURL))
check('LICENSE 版权行标了 derivative work', copyLines[1]?.includes('derivative work'))
check('LICENSE 仍是 MIT 标题', /^MIT License\b/.test(lic))
check('LICENSE MIT 正文完整', /Permission is hereby granted/.test(lic) && /WITHOUT WARRANTY OF ANY KIND/.test(lic))

/* [3] package.json ────────────────────────────────────────────────────────── */
const pkg = JSON.parse(read('package.json') || '{}')
check('package.json license 为 MIT', pkg.license === 'MIT')
check('package.json 有 upstream 字段', pkg.upstream === UPURL, pkg.upstream)
check('package.json 描述标注二次开发', /二次开发/.test(pkg.description || ''))
check('package.json 描述写明上游', (pkg.description || '').includes(UP))
check('package.json 作者仍是上游作者', /沈宏宏/.test(String(pkg.author)))
check('package.json 贡献者含二次开发署名', (pkg.contributors || []).some((c) => /YUNvexoxo/.test(c)))
check('package.json 随包发布 NOTICE', (pkg.files || []).includes('NOTICE'))
check('test 脚本含 smoke-notice', /smoke-notice/.test(pkg.scripts?.test || ''))

/* [4] README ──────────────────────────────────────────────────────────────── */
const readme = read('README.md') || ''
const head = readme.split('\n').slice(0, 20).join('\n')
check('README 顶部有二次开发声明', /二次开发作品/.test(head))
check('README 顶部链到 NOTICE', /\[NOTICE\]\(NOTICE\)/.test(head))
check('README 有来源与二次开发声明章节', /^## 来源与二次开发声明$/m.test(readme))
check('README 声明里保留上游署名', /Copyright \(c\) 2026 沈宏宏/.test(readme))
check('README 声明里含二次开发署名', /Copyright \(c\) 2026 YUNvexoxo/.test(readme))
check('README 指向正确上游仓库', readme.includes(UP))

/* [5] 其它文档 ────────────────────────────────────────────────────────────── */
for (const rel of ['docs/ABOUT.md', 'docs/GUIDE.md', 'docs/UPSTREAM-DIFF.md', 'INSTALL.md']) {
  const s = read(rel) || ''
  check(rel + ' 含正确上游仓库名', s.includes(UP))
  check(rel + ' 含二次开发字样', /二次开发/.test(s))
}
check('UPSTREAM-DIFF 说明 LICENSE 版权行扩为两条', /版权行由一条增为两条/.test(read('docs/UPSTREAM-DIFF.md') || ''))

/* [6] 全仓扫描被更名误伤的上游名 ──────────────────────────────────────────── */
const SKIP = new Set(['node_modules', '.git', 'docs/img'])
const offenders = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(md|json|ya?ml)$/.test(e.name)) {
      if (fs.readFileSync(p, 'utf8').includes(WRONG)) offenders.push(path.relative(ROOT, p))
    }
  }
})(ROOT)
check('全仓没有错误的上游仓库名', offenders.length === 0, offenders.join(', '))
check('本仓库地址在 README 里出现', readme.includes(MINE))

console.log('='.repeat(60))
console.log('通过 ' + pass + ' / 失败 ' + fail)
process.exit(fail === 0 ? 0 : 1)