# 与原版的差异

本仓库的底座是 [`6shenhonghong9/dsh-haavk`](https://github.com/6shenhonghong9/dsh-haavk)
（MIT，**v1.1.1**，作者沈宏宏）。这一份文档把"原版是什么样、我们改了哪些、为什么改"
说清楚 —— 上面的 README 里也有一段更简短的[来源](../README.md#来源)。

对比基准是直接从上游仓库拉下来的 `main`（`package.json` version `1.1.1`）。

---

## 一、先说没动的

以下文件与上游 **逐字节相同**（`diff` 为空，音频 `cmp` 一致），一个字节都没改：

| 文件 | 说明 |
|---|---|
| `AUDIO-FIELDS.md` | 音频槽位协议 |
| `cordis.patch.yml` | bundle 层声明 |
| `LICENSE` | MIT，原作者署名保留 |
| `安装.cmd` / `打开预览.cmd` / `open-preview.sh` | 三个入口脚本 |
| `lib/assets/line-1..6.mp3`、`sfx-tick.mp3`、`sfx-ticks-run.mp3` | 八段音频，原封不动 |
| `test/smoke-desktop-boot.mjs` | 桌面端自举测试（45 项） |

骨架层面保留的还有：Host/Client 两半结构、`ctx.webServer.register()` 路由注入方式、
`dsh.profile.bundles` 层堆栈、设置面板的 `Field` / `TextInput` 控件骨架、
`selfBoot()` 桌面端兜底、`typeIn()` 逐字打出、`audio` 的 WebAudio 合成兜底。

---

## 二、改了哪些（按层次）

### 1. 主题层：整体重写（改动主体）

| 文件 | 上游行数 | 现在 | 真实 diff |
|---|---|---|---|
| `lib/splash.js` | 1403 | 1972 | +660 / −91，29 处 hunk |
| `lib/splash.css` | 1104 | 2377 | +1316 / −43，20 处 hunk |
| 新增 `lib/assets/portal/` | — | 16 张图（3.1MB） | 新增 |
| 新增 `desktop-shell/` | — | 4 张原生页 | 新增 |

`splash.css` 的 −43 行说明：**上游那套样式基本没删**，而是被留在文件里作为回退序列
（`window.__DSH_STARTUP_PORTAL__ = false` 时走 `run()`），新增的 1316 行是终端版式。
这样做的好处是回退随时可用，坏处是 CSS 体积翻倍 —— 这是有意为之的取舍。

### 2. 序列层：从"暖白技术档案"到"哈夫克全域互联终端"

| | 上游 v1.1.1 | 现在 v1.8.0 |
|---|---|---|
| 开场 | 黑幕 + DeepSeek 鲸鱼标识（描边 SVG） | 浅蓝白斜切几何底，徽记**描边 → 落墨**（1.4s + 0.9s 共布） |
| 主视觉 | 暖白「技术档案」底板 + 居中状态字 | 左列徽记（46vh）+ HAAVK 字标（逐字母上浮）、右列标题 + 八行清单 |
| 信息流 | 一行状态字 + 英文副标题 | 八行清单逐行点亮（**逐字浮出**）、每行行尾 `0x` 读数、八行十六进制数据流 |
| 进度 | 底部居中一小段进度条 | rAF 追值的全宽细进度线 + `55ms` 逐帧步进 + 渗流补帧 |
| 交互 | 第 1、2 步点按钮 | 同（保留），但终端版式下按钮落在清单下方 |
| 终幕 | 色散故障揭幕（glitch + 光晕 + 宽银幕光条） | 分层退场 → 徽记落印 → **菱形坐标框** + WELCOME 交叉淡入 → 720ms 溶解 |
| 色彩 | 暖白 `#e5e3df` + 橙 `#ff7500` | 哈夫克蓝白：主蓝 `#2362af` / 亮蓝 `#5b96dd` / 深蓝 `#16324f` |

上游的 `finale()`（色散揭幕）**没有删**，仍作为回退序列的结尾保留在 `splash.js:1283`。

### 3. 语义层：文案全部换成哈夫克语境

| 项 | 上游 | 现在 |
|---|---|---|
| 身份名称 | `JOYCE MOORE` | `哈夫克` |
| 身份编号 | `0087` | `HAAVK-01` |
| 权限等级 | `3` | `4` |
| 品牌三行 | `DEEPSEEK` / `SYNTHESIZE INTELLIGENCE` / `HARNESS OS` | `HAAVK` / `INFINITE INFORMATION` / `HAAVK GROUP` |
| 黑幕三行 | `深度求索` / `DEEPSEEK` / `DEEPSEEK HARNESS` | `哈夫克` / `HAAVK` / `HAAVK GROUP` |
| 终幕字标 | `DEEPSEEK HARNESS` | `HAAVK` |
| 页脚 | `POWERED BY DEEPSEEK` | `POWERED BY HAAVK` |
| 强调色 | `#ff7500`（橙） | `#2362af`（哈夫克蓝） |
| 故障色 A / B | `#ff3b30` / `#2971b8` | `#5b96dd` / `#16324f` |
| 徽记 | `WHALE_PATH`（DeepSeek 鲸鱼） | `MARK_PATH`（哈夫克菱形，按官方 logo 逐像素描摹） |

`MARK_PATH` 是两段 path（`fill-rule: evenodd`），`viewBox` 为 `0 0 244 268`：

```
M99 0 L144 46 L144 150 L75 220 L0 145 L75 69 L75 207 L99 183 Z
M168 69 L243 145 L168 220 L168 158 L144 182 L144 243 L121 267 L99 243 L99 214 L168 145 Z
```

同一段路径同时用在网页层、原生启动壳与终幕文字徽记三处 —— 这是"看起来是同一套东西"
的物理基础。

### 4. 默认值：开箱静默自动播完

| 配置 | 上游默认 | 现在默认 | 为什么改 |
|---|---|---|---|
| `requireInteraction` | `true` | `false` | 上游每次启动都要点两次按钮，对日常使用是打扰 |
| `sound` | `true` | `false` | 启动音效在有人开会的场合很突然 |
| `voice` | `true` | `false` | 同上 |

三者都仍可在设置页打开。静默模式下 `silentPace()` 会补偿节奏（停 2200ms 而不是 900ms），
否则没有语音垫着，进度会显得"刷一下就完了"。

### 5. 计时引擎：拆出 `waitRaw`

上游只有 `wait(base)`，内部先 `ms(base)` 折算再 `setTimeout`。问题在于
「已经算好的毫秒数」再传进去会被二次缩放，`speed` 一旦不是 1 就错位。

现在拆成两个：

```js
function waitRaw(scaled) { /* 已折算，不再缩放 */ }
function wait(base) { return waitRaw(ms(base)) }
```

`holdFor(spoken)` 拿到语音实际时长（也是毫秒）后走 `waitRaw`，所以「语音没播完不会推进」
在任意 `speed` 下都成立。

### 6. 宿主层：路由从 4 条变 5 条

| 路由 | 上游 | 现在 |
|---|---|---|
| `/dsh-startup/splash.css` | ✅ | ✅ |
| `/dsh-startup/splash.js` | ✅ | ✅ |
| `/dsh-startup/asset`（音频） | ✅ | ✅ |
| `/dsh-startup/config` | ✅ | ✅ |
| `/dsh-startup/portal`（图片） | — | **新增** |

新增的 `portal` 路由与 `asset` 同一套防护：`path.basename()` 化 + 扩展名白名单
（`.png/.jpg/.jpeg/.webp`）+ 只读，杜绝目录穿越。

### 7. 测试层：从 4 套到 5 套

| 文件 | 上游 | 现在 | 改了什么 |
|---|---|---|---|
| `test/smoke-host.mjs` | 59 | 59 | 路由数 4→5；默认身份断言改成哈夫克 |
| `test/smoke-splash.mjs` | 70 | 70 | DOM 桩的 `innerHTML` 从**覆盖**改成**累加**（见下） |
| `test/smoke-client.mjs` | 40 | 40 | mock 配置换成哈夫克默认值 |
| `test/smoke-desktop-boot.mjs` | 45 | 45 | 未改 |
| `test/smoke-desktop-shell.mjs` | — | **48** | 新增：校验原生壳无外链、色板与 `lib/splash.css` 逐 token 相等、徽记路径一致、时间轴错峰、有减动效兜底 |

**`innerHTML` 桩为什么要改**：上游的桩把每次 `innerHTML` 赋值**覆盖**到全局 `MARKUP`
字符串上。现在有两层模板（外层 root + portal 主题）各写一次，只留最后一次会把前一层
的元素全部误判成"不存在"，30 条断言集体报红。改成累加即可 —— 这个坑值得记一笔。

---

## 三、版本走线（为什么这么多版）

| 版本 | 一句话 |
|---|---|
| 1.2.1 | 黑幕换成 HAVOC 语境（当时的译名） |
| 1.3.0 | 徽记改成官方 HAAVK 菱形，全部文案与身份号改 HAAVK |
| 1.3.1 | 修终幕人声与「欢迎 XX 访问」打架 → 终幕不出人声 |
| 1.3.2 | 默认改为静默、不等确认，开箱即自动播完 |
| 1.3.3 | 拆出 `waitRaw` 与 `silentPace` 节奏补偿 |
| **1.5.0** | **版式重写**：暖白技术档案 → 全域互联终端（左徽记 / 右八行 / 底部状态条） |
| 1.5.1 | 收尾三段化，徽记与 WELCOME 不再同帧叠影 |
| 1.5.2 | 颜色全面变量化 + 深色变体 |
| 1.5.3 | 复用上游遗留的 HUD（品牌块 / REV + 时钟 / 阶段格 / 四角 / SKIP / 页脚） |
| 1.5.4 | 全部加过程动画（描边落墨、逐字、逐字母、rAF 进度、数据流、扫描光带） |
| 1.5.5 | 配色按参考图网格取色反解；修 settle 水印残影、虚线环居中 |
| 1.6.0 | 治"切换感"：三处强制同步布局 + 两处硬切；徽记 38vh→46vh；补信号/状态格/播报/光晕 |
| 1.7.0 | 原生启动壳同源化（`desktop-shell/` 四张页）+ `smoke-desktop-shell` |
| 1.8.0 | 终幕换景（删同心圆/准星/表盘 → 菱形坐标框）；修右侧标尺渐变方向与状态格压线 |

完整的改动说明见 [README 版本迭代](../README.md#版本迭代)。

---

## 四、几个"看起来是 bug 其实不是"的地方

**1. 为什么 `splash.css` 里还留着一整套暖白主题？**
那是回退序列（`run()`）的样式。`window.__DSH_STARTUP_PORTAL__ = false` 就会走它。
留着的代价是体积，收益是随时可对比、可回退。

**2. 为什么全局重置写成 `:where(#dsh-startup-root) *` 而不是 `#dsh-startup-root *`？**
后者带 ID 特异性（1-0-1），会压掉所有类规则（0-1-0）里的 `margin` / `padding`。
1.8.0 之前正是这个写法，导致行尾读数不右对齐、字标间距失效、模块标签贴边 —— 一整批
间距设置其实都没生效。`:where()` 不贡献特异性，等价于 `*`。

**3. 为什么进度条不用 CSS `transition`？**
rAF 已经在逐帧写 `width`，CSS 再叠一层缓动会变成"黏着动"，并且和渗流补帧打架。
所以 `.dsu-t-prog i { transition: none }`，只由 rAF 控制。

**4. 为什么徽记不用 `filter: drop-shadow()` 做光晕？**
徽记有呼吸动画（每帧 `scale`），挂着滤镜会逐帧重算，是这条链路上最贵的一项。
改成独立的一层 `radial-gradient`。

**5. 为什么换文字不直接改 `textContent`？**
会触发清空 → 重排 → 新内容，肉眼读成"闪一下"。现在旧字就地包成 `.dsu-t-ghost`
飘走、新字新建 `.dsu-t-live` 浮上来，全程不量尺寸。

---

## 五、想自己改的话

| 想改什么 | 去哪里 |
|---|---|
| 清单八行文案 | `lib/splash.js` 的 `TERM_LINES`（约 1424 行） |
| 技术模块标签 | `TERM_MODS`（约 1435 行） |
| 滚动播报文案 | `TERM_TICKER`（约 1444 行） |
| 每行行尾读数 | `TERM_READ`（约 1458 行） |
| 状态条 UID | `TERM_UID`（约 1455 行） |
| 徽记路径 | `MARK_PATH`（约 65 行）+ `desktop-shell/splash.html` 里的同一段 |
| 配色 | `lib/splash.css:1162` 的 `.dsu-root.dsu-mode-portal` 变量块 |
| 结尾时序 | `portalFinale()`（约 1852 行） |
| 原生壳 | `desktop-shell/splash.html` |

改完跑 `npm test`（六套 314 项断言），然后 `npm pack` + `dsh plugin --profile web add`。
