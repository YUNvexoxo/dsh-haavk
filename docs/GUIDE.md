# 使用文档

面向使用者：怎么装、怎么调、出问题怎么查。想了解"为什么这样做"看
[项目介绍](ABOUT.md)，想了解"和原版差在哪"看[与原版的差异](UPSTREAM-DIFF.md)。

---

## 一、装

### 前置

| 项 | 要求 |
|---|---|
| DSH | **web** profile（`dsh.client.platform = "web"`） |
| Node | **>= 20** |
| 依赖 | 无，不需要 `npm install` |

### 方式一：从本仓库装（推荐，拿到最新代码）

```bash
git clone https://github.com/YUNvexoxo/dsh-haavk.git
cd dsh-haavk
npm pack                                          # 生成 dsh-haavk-1.8.0.tgz
dsh plugin --profile web add ./dsh-haavk-1.8.0.tgz
```

### 方式二：从 Release 装

到 [Releases](https://github.com/YUNvexoxo/dsh-haavk/releases) 下载
`dsh-haavk-1.8.0.tgz`，然后：

```bash
dsh plugin --profile web add ./dsh-haavk-1.8.0.tgz
```

### 方式三：Windows

仓库里的 Windows 脚本都按 Windows 习惯处理过：`.cmd` 是 **CRLF 行尾**、
`.ps1` 带 **UTF-8 BOM**（否则 PowerShell 5.1 读中文会乱码）、
`.gitattributes` 保证克隆下来行尾不被打乱。

**① 双击 `安装.cmd`（最省事）**

解压后双击。脚本会自动找 `dsh`、找包（`package.json` / `*.tgz`），再检测
`%USERPROFILE%\.dsh\profiles` 下的 web / desktop profile，逐个安装，并提示重复注册。

**② PowerShell**

```powershell
# 在解压后的插件目录里
.\install.ps1                              # 自动检测并安装
.\install.ps1 -Profile web                 # 只装 web profile
.\install.ps1 -Profile desktop             # 只装 desktop profile（先完全退出桌面端）
.\install.ps1 -Pkg .\dsh-haavk-1.8.0.tgz   # 指定包
```

若提示「禁止运行脚本」，用 `powershell -ExecutionPolicy Bypass -File .\install.ps1`
绕一次；脚本同时兼容 Windows PowerShell 5.1 与 PowerShell 7。
`DSH_HOME` 环境变量可覆盖默认的 `%USERPROFILE%\.dsh`。

**③ 手动（PowerShell / cmd 都行）**

```powershell
git clone https://github.com/YUNvexoxo/dsh-haavk.git
cd dsh-haavk
npm pack
dsh plugin --profile web add .\dsh-haavk-1.8.0.tgz
```

**④ 只想看看效果**：双击 `打开预览.cmd`（或 `.\open-preview.ps1`），
不装插件、不依赖 DSH，浏览器直接打开离线预览页。

Windows 注意点：

- `dsh` 要在 PATH 里；`npm i -g @deepseek-ai/dsh` 之后如果仍提示找不到，重开一个终端；
- 路径分隔符两种都行（`.\x.tgz` 与 `./x.tgz` 等价）；
- **桌面端要完全退出**再装 desktop profile，进程在跑时 profile 会加锁；
- 中文显示成方块 → `chcp 65001`（`安装.cmd` 已自带）。

### 装完必须重启

**关掉 dsh web 的启动器窗口，再重新双击。** 只刷新页面不够 —— 插件是 Host 侧注入，
进程重启后才会挂上路由。

重启后：

- 刷新页面会看到开机动画；
- DSH 设置页会多出一项 **「启动动画」**（`order: 26`）。

### 为什么不能用"手工拷目录"

DSH 靠 `dsh.profile.bundles` 这个层堆栈决定加载哪些插件，`dsh plugin add` 是
`pnpm add` 的包装，装完 DSH 会自动把「声明了 `dsh.bundle` 的依赖」并入层堆栈 ——
插件自带的 `cordis.patch.yml` 就是在那时作为一层被应用的。

**直接把目录拷进 `node_modules` 不会被识别**，必须走上面三条路之一（手工安装见
[INSTALL.md](../INSTALL.md) 第二节）。

### 装完自检

不带 token 访问插件路由：

| 返回 | 含义 |
|---|---|
| **401** | 路由已注册（401 是插件自己的信任栅栏，正常） |
| **404** | 没装成功，或没重启 |

```bash
curl -i http://127.0.0.1:43129/dsh-startup/splash.js
```

### 如果你之前手工加过 patch 条目

检查 `~/.dsh/profiles/<profile>/cordis.patch.yml`，如果里面有：

```yaml
- insert:
    - id: dsh-haavk
      name: dsh-haavk
```

**必须删掉。** 否则插件注册两次，`apply` 跑两遍，`ctx.webServer.register()`
对同一路径重复注册会直接报错。`安装.cmd` 会自动检测并提示。

---

## 二、第一次跑

默认配置是**静默自动播完**，不需要任何操作：

1. 冷启动 → 浅蓝白底板淡入；
2. 徽记描边勾出（约 1.4s）→ 落墨填实（0.9s）；
3. `HAAVK` 字标逐字母上浮；
4. 右侧「哈夫克全域互联终端」+ 八行清单逐行点亮，行尾读数与数据流同步跑；
5. 底部状态条 `[ 0X / 06 ] CODE`、`55ms`、`CN UID` 跟着推进；
6. 全亮后停一拍 → 分层退场 → 徽记落印 → 菱形坐标框 + `WELCOME` 交叉淡入；
7. 整片浅色场 720ms 溶解，露出应用。

整段约 **16 秒**（上游参考片约 27 秒，这里是压过的）。

### 想跳过

- 右上角 **`SKIP ▸`**（默认开）
- 按 **Esc**

跳过后直接进到溶解，不会硬切。

### 想让它等你点按钮

设置页开 **「需要人工确认」**，第 1、2 步就会停下来等点按钮或 `Enter` / `Space`。

### 想听声音

设置页开 **「音效」** 与 **「女声播报」**。浏览器有自动播放限制 ——
**必须先点一次页面**（任何点击）之后才允许出声，所以第一次冷启动时哪怕开了声音
也可能听不到，这是浏览器行为不是 bug。

---

## 三、全部设置项

DSH 设置页 → **「启动动画」**。改完立即生效，不用重启。

### 播放

| 设置 | 默认 | 可选 / 范围 | 说明 |
|---|---|---|---|
| 启用启动动画 | 开 | 开 / 关 | 总开关，关掉完全不播 |
| 播放时机 | `session` | `always` 每次刷新 / `session` 每会话一次 / `daily` 每天一次 | `session` 用 `sessionStorage`，`daily` 用 `localStorage` 记日期 |
| 速度倍率 | `1` | 0.35 – 3，步进 0.05 | 整套动画快慢；倍速同时缩放停留时间与转场 |
| 需要人工确认 | 关 | 开 / 关 | 第 1、2 步是否等点按钮 |
| 允许跳过 | 开 | 开 / 关 | 是否显示 `SKIP ▸`、是否响应 Esc |

### 身份资料

| 设置 | 默认 | 说明 |
|---|---|---|
| 身份名称 | `哈夫克` | 终幕「欢迎访问 哈夫克」里的名字 |
| 身份编号 | `HAAVK-01` | 第二步身份卡上的编号 |
| 权限等级 | `4` | 身份卡与终幕读数里的等级 |

### 语音

| 设置 | 默认 | 范围 | 说明 |
|---|---|---|---|
| 女声播报 | 关 | 开 / 关 | 是否念每一行 |
| 语音来源 | `asset` | `asset` 真声素材 / `tts` 系统 TTS | `asset` 拿不到素材会自动回落 TTS |
| 播报语言 | `en` | `en` / `zh` / `both` | 念英文、中文，或两遍 |
| 音色 | 空 | 文本 | 只在使用 TTS 时有效。留空 = 自动挑（优先神经网络女声） |
| 语速 | `0.88` | 0.5 – 2 | 只在使用 TTS 时有效 |
| 音调 | `0.85` | 0 – 2 | 只在使用 TTS 时有效。调低更沉稳，1.0 以上像客服播报 |
| 音量 | `0.9` | 0 – 1 | 台词音量 |
| 播报前提示音 | 开 | 开 / 关 | 念台词前先响一声轻提示 |
| 开口前留白 | `240` | 0 – 1200 ms | 提示音之后停多久再开口 |

### 界面音效

| 设置 | 默认 | 可选 | 说明 |
|---|---|---|---|
| 界面音效 | 关 | 开 / 关 | 文字出现、阶段推进的「哒」声 |
| 音效音量 | `0.5` | 0 – 1 | 不影响台词音量 |

### 视觉

| 设置 | 默认 | 说明 |
|---|---|---|
| 主题 | `light`（浅蓝 · 哈夫克终端） | `dark` 是深蓝底板，同一套版式只换底板与字色 |
| 强调色 · 哈夫克蓝 | `#2362af` | 阶段条 / 进度线 / 高亮 |
| 故障色 B · 深蓝 | `#16324f` | 回退序列的色散故障用色（故障色 A 固定 `#5b96dd`） |

### 文案

| 设置 | 默认 | 用在 |
|---|---|---|
| 左上 · 主标题 | `HAAVK` | HUD 品牌块第一行 |
| 左上 · 产品行 | `GROUP` | 品牌块第三行的后半 |
| 左上 · 副标题 | `INFINITE INFORMATION` | 品牌块第二行 |
| 黑幕 · 中文 / 英文 / 小字 | `哈夫克` / `HAAVK` / `HAAVK GROUP` | 回退序列的开场黑幕 |
| 终幕 · 黑框 | `HAAVK` | 终幕中央字标 |
| 右下 · 页脚 | `POWERED BY HAAVK` | 状态条右端 / 页脚 |

### 一个小坑（上游遗留，未改）

「播放」组里有个 **「音效」** 开关，「语音与音效」组里还有个 **「界面音效」** ——
两者绑的是同一个键 `sound`，勾一个另一个也会跟着变。这是上游 v1.1.1 就有的重复项，
不影响功能，保持原样以免动到上游骨架。

> 以上合计 **30 项**（其中「语速 / 音调 / 开口前留白 / 音量」只在打开女声播报时出现，
>「音效音量」只在打开界面音效时出现）。配置落盘在 `$DSH_HOME/dsh-startup.json`
>（默认 `~/.dsh/dsh-startup.json`），可以直接手改，坏值会被 `normalize()` 夹回合法区间。

---

## 四、桌面端

DeepSeek Harness Desktop 有两层启动画面，插件只负责**第二层**：

| 层 | 文件 | 谁能改 |
|---|---|---|
| 网页层 | 插件注入的 `#dsh-startup-root` | 插件自己（装上就换掉） |
| **原生层** | `Resources/splash.html` 等四张页 | 插件注入不到，**只能覆盖文件** |

原生层由 Electron 主进程 `showSplash()` 直接 `loadURL(file://...)`，在网页层之前显示。
`desktop-shell/` 里放的是同样换成哈夫克语言的四份文件：

```
desktop-shell/splash.html           启动壳
desktop-shell/safe-mode.html        安全模式
desktop-shell/plugin-recovery.html  插件恢复
desktop-shell/web-import.html       网页导入
```

覆盖办法、签名注意事项、"桌面端自动更新会覆盖回去"这条限制，全部写在
**[DESKTOP.md](../DESKTOP.md)**。简版（macOS）：

```bash
# 先完全退出桌面端
cp "desktop-shell/splash.html" "/Applications/DSH Desktop.app/Contents/Resources/splash.html"
cp "desktop-shell/safe-mode.html" "/Applications/DSH Desktop.app/Contents/Resources/safe-mode.html"
cp "desktop-shell/plugin-recovery.html" "/Applications/DSH Desktop.app/Contents/Resources/plugin-recovery.html"
cp "desktop-shell/web-import.html" "/Applications/DSH Desktop.app/Contents/Resources/web-import.html"
```

---

## 五、不装插件也能看

仓库自带离线预览页：

```bash
open preview/index.html          # macOS
start preview\index.html         # Windows
```

或 `bash open-preview.sh`。预览页用同一套 `lib/splash.js` + `lib/splash.css`，
不带 Host 注入也能完整播完，适合改样式时快速迭代。

---

## 六、出问题怎么查

### 页面全白 / 一直黑着

1. 按 `Esc` —— 跳过键默认可用；
2. 打开控制台看有没有 `[dsh-startup]` 开头的错；
3. 路由返回 404 → 没装成功或没重启（见[装完自检](#装完自检)）；
4. 页面卡住超过 9 秒会自动摘下根节点（`BOOTSTRAP_JS` 里的兜底），
   如果 9 秒后还在黑，说明 Host 侧注入没跑起来。

### 动画播一半卡住

- 如果停在等待按钮那一步：**「需要人工确认」** 开着，点是，或按 `Enter`。
- 如果停在语音那一步：语音开关开着但浏览器没放出声，`voice.line()` 的长尾会让
  停留时间异常长。关掉 **「女声播报」** 即可。

### 播了两次

`cordis.patch.yml` 里还留着手工加的 `insert` 条目，删掉（见[上面](#如果你之前手工加过-patch-条目)）。

### 没有声音

浏览器自动播放策略要求**先有一次用户点击**。冷启动时没有点击点，所以静默是正常的。
点一次页面后，从第二次刷新起（`session` 模式下）就能听到。

### 想彻底关掉

设置页关 **「启用启动动画」**。要卸载：

```bash
dsh plugin --profile web remove dsh-haavk
```

`profile` 名字换成你实际的（`dsh plugin list` 能看到）。

---

## 七、自测

```bash
npm test
```

六套冒烟测试，共 **314 项**断言：

| 套件 | 断言 | 覆盖 |
|---|---|---|
| `smoke-host.mjs` | 59 | 路由注册、配置校验与夹取、注入片段、生命周期 |
| `smoke-splash.mjs` | 70 | 最小 DOM 桩跑完整序列、选择器齐全、CSS 锚点 |
| `smoke-client.mjs` | 40 | 设置面板渲染与字段读写 |
| `smoke-desktop-boot.mjs` | 45 | 桌面端 selfBoot 兜底、自举失败回滚 |
| `smoke-desktop-shell.mjs` | 48 | 原生壳无外链、色板与 CSS 逐 token 相等、徽记路径一致、时间轴错峰、减动效兜底 |
| `smoke-windows.mjs` | 52 | Windows 脚本行尾 / BOM、`.gitattributes`、安装入口、README 截图引用 |

不需要任何依赖，`node >= 20` 直接跑。

---

## 八、键盘

| 键 | 作用 |
|---|---|
| `Enter` / `Space` | 在等待按钮的步骤继续 |
| `Esc` | 跳过整段（需「允许跳过」开启） |
