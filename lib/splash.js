/* ============================================================================
 * dsh-haavk — 启动动画运行时（浏览器端，零依赖）
 * ----------------------------------------------------------------------------
 * 由 Host 半侧注入到 index.html，在 React 应用挂载之前接管首屏。
 *
 * 默认序列 = 哈夫克全域互联终端（portal 主题，见文件末尾 runPortal）：
 *   开场    浅蓝白斜切底 + 四角刻度 + 竖排标尺淡入
 *   序列    STEPS 五步推进，每步点亮 1–2 行系统清单、推进底部进度线、
 *           状态条更新为当前步骤（需要访问许可 / 身份资料确认 /
 *           接收访问需求 / 开始读取权限 / 读取完毕·核验通过）
 *   终幕    八行全亮 → 停一拍 → 清单与标题分层退场 → 徽记落印 →
 *           WELCOME 交叉淡入 → 整片浅色场溶解回应用（不缩放、不失焦）
 *
 * 1.6.0 补的三处"硬切"（都是用户说的"过渡不丝滑/有明显切换感"）：
 *   · 描边→落墨原本同帧切类，现在 fill-opacity 与 stroke-width 各自过渡 900ms，
 *     两态并存 900ms，读作"墨顺着轮廓渗进去"；
 *   · termSwapText 原本清空节点再重建 + void offsetWidth 强制同步布局，
 *     现在旧字就地降级成残影、新字新建元素（动画天然从首帧开始），全程不量尺寸；
 *   · termStreamSwap 原本 animation:none + offsetWidth + 复原，每步都会让数据流
 *     跳回顶部；现在只换内容，滚动动画接着走。
 * 徽记从 38vh 放大到 46vh（clamp(230px,46vh,520px)），字标同档 →
 *
 * 1.8.0 终幕重做（用户：「去除那个圆环，太丑了，换一种」→ 选定方案 B）：
 *   · 删掉 .dsu-t-rings 三层同心圆、.dsu-t-cross 准星、.dsu-t-dial 36 刻度；
 *   · 改为 .dsu-t-dmark —— 把徽记轮廓本身放大成背景框（stroke 描边，
 *     pathLength="1" 让 dashoffset 直接按 1 归一化），框外四个方向各一段短刻度；
 *   · 框线穿过版心会被读成划痕，加 radial mask 让中心 30%x40% 透明；
 *   · .dsu-t-finale 从「终幕一开始就挂」挪到 settle 同一拍：菱形框一边自己描，
 *     一边接住正在退场的版面，屏幕不会同时演两件事、也没有"清空后重新布景"的空档。
 * 顺手修的两处版式 bug（都在 1.7.x 就存在）：
 *   · .dsu-t-ruler 用「90deg 渐变 + background-size 2.4vh」写，纵向无变化、
 *     每行铺满自己那格 → 整条读成一根实心柱子。改 repeating-linear-gradient(180deg)
 *     按 1px/2.1vh 铺短划，才是刻度；
 *   · .dsu-t-heat 贴 3.4vw 与标尺(2.4vw + 0.62vw)压线，改 6.4vw；
 *     窄窗 (max-width:1100px / max-height:620px) 直接藏掉状态格，先保信息件。
 * 终幕新增 .dsu-t-stage 整层缓慢推近 + .dsu-t-finale（同心环/准星/上下读数线），
 * 让退场是"镜头后撤换景"而不是"一整屏东西同时消失"。
 *
 * 全程没有"开关式"的显隐，每一层都在动：
 *   徽记   1.4s 描边 → 落墨 → 5.2s 呼吸；外圈虚线环 34s 慢转
 *   字标   逐字母升起（每个 90ms 错峰，位移 + 淡入 + 去模糊）
 *   清单   逐字浮出（每字 26–30ms 错峰），刚点亮那行带光标
 *   进度   rAF 追值（只进不退），CSS 不再做 transition；两幕之间渗流补帧
 *   读数   ms 从 38 逐帧压到 55，步进 55ms 一次
 *   数据流 八行十六进制滚动 + 逐行亮度扫描
 *   氛围   全场扫描光带、面板落位扫光、标题横线呼吸
 *
 * 把 window.__DSH_STARTUP_PORTAL__ 设为 false 可退回旧的"技术档案"序列
 * （run()：黑幕 → 过曝洗白 → 暖白底板 → 五步授权 → 色散揭幕）。
 *
 * 配置来自 window.__DSH_STARTUP__（Host 侧注入），也可用
 * window.__DSH_STARTUP_API__.replay() 重播。
 * ========================================================================== */
(function () {
  'use strict'

  if (window.__DSH_STARTUP_LOADED__) return
  window.__DSH_STARTUP_LOADED__ = true

  var ROOT_ID = 'dsh-startup-root'

  /* ── HAAVK 官方徽记（哈夫克集团 / Delta Force）──────────────────────────
     viewBox 0 0 244 268：左右两翼 + 中央立柱，被一道 45° 斜切分成
     两半（两个互不重叠的子路径），由官网 logo2.png 逐像素描摹而来。 */
  var MARK_PATH =
    'M99 0 L144 46 L144 150 L75 220 L0 145 L75 69 L75 207 L99 183 Z ' +
    'M168 69 L243 145 L168 220 L168 158 L144 182 L144 243 L121 267 L99 243 L99 214 L168 145 Z'

  /* ── 默认配置（与 Host 侧 lib/index.js 的 DEFAULTS 保持一致）──────────── */
  var DEFAULTS = {
    enabled: true,
    mode: 'session',            // always | session | daily
    theme: 'light',             // light | dark
    speed: 1,
    requireInteraction: false,  // 第 1、2 步不再等用户确认，自动继续
    allowSkip: true,
    sound: false,               // 界面音效（WebAudio 合成，无音频文件）
    soundVolume: 0.5,
    voice: false,               // 女声播报
    voiceLang: 'en',            // en | zh | both
    voiceName: '',              // '' = 自动挑女声（见 FEMALE_HINTS）
    voiceRate: 0.88,            // 电影旁白档：比朗读慢，字与字之间才有重量
    voicePitch: 0.85,           // 压低音调，深沉的 AI 女声
    voiceVolume: 0.9,
    voiceCue: true,             // 念台词前的一声轻提示
    sfx: 'audio',               // audio=真素材（用户音频里抠的音效）/ synth=现场合成
    voiceSource: 'asset',       // asset=优先用真声素材 / tts=全部 TTS 合成
    voiceLead: 240,             // 提示音之后留一小段空白再开口
    identity: '哈夫克',          // ← 设置页可改的"身份名称"
    identityId: 'HAAVK-01',
    accessLevel: '4',
    brand1: 'HAAVK',
    brand2: 'INFINITE INFORMATION',
    brand3a: 'HAAVK',
    brand3b: 'GROUP',
    orgZh: '哈夫克',
    orgEn: 'HAAVK',
    orgSub: 'HAAVK GROUP',
    welcomeBox: 'HAAVK',
    footer: 'POWERED BY HAAVK',
    accent: '#2362af',
    glitchA: '#5b96dd',
    glitchB: '#16324f'
  }

  /* ── 序列脚本：中文主字 + 英文等宽字幕 + 底部日志 ───────────────────────
     `say` 是专门给语音播报用的自然语句（照着参考片里女声念状态行的节奏，
     正好卡在各自文字出现的时间点上）。 */
  /* ── 序列脚本 ──────────────────────────────────────────────────────────
     文字与真声素材一一对应（来自你给的音频）：
       line-1.mp3 = V1 需要访问许可
       line-2.mp3 = V2 身份资料确认
       line-3.mp3 = V4 接收访问需求
       line-4.mp3 = V5 开始读取权限
       line-5.mp3 = V6 读取完毕 · 核验通过
     V3 是用户名字独白，按你的要求不用。
     `say` 是素材拿不到时的 TTS 兜底文本；`audio` 是素材文件名（不含扩展名）。 */
  var STEPS = [
    {
      zh: '需要访问许可',
      en: 'ACCESS PERMISSION REQUIRED',
      say: 'Access permission required.',
      audio: 'line-1',
      log: '等待用户授权…',
      logEn: 'AWAITING OPERATOR CONSENT',
      badge: 'AUTHORIZATION',
      action: 'grant',
      btnZh: '授予访问权限',
      btnEn: 'GRANT ACCESS',
      hold: 900,
      progress: 0.34
    },
    {
      zh: '身份资料确认',
      en: 'IDENTITY VERIFICATION',
      say: 'Identity verification.',
      audio: 'line-2',
      log: '核对身份资料…',
      logEn: 'MATCHING OPERATOR RECORD',
      badge: 'IDENTITY',
      action: 'confirm',
      btnZh: '确认身份',
      btnEn: 'CONFIRM IDENTITY',
      hold: 700,
      progress: 0.5
    },
    {
      zh: '接收访问需求',
      en: 'ACCESS REQUEST RECEIVED',
      say: 'Access request received.',
      audio: 'line-3',
      log: '接收访问需求，建立会话通道…',
      logEn: 'HANDSHAKE ESTABLISHED',
      badge: 'REQUEST',
      action: 'auto',
      hold: 1200,
      progress: 0.66,
      assembleLogo: true
    },
    {
      zh: '开始读取权限',
      en: 'PERMISSION READ STARTED',
      say: 'Beginning permission read.',
      audio: 'line-4',
      log: '开始读取权限，索引工作区与会话…',
      logEn: 'READING PERMISSION SET',
      badge: 'READ',
      action: 'auto',
      hold: 1200,
      progress: 0.8,
      hex: true
    },
    {
      zh: '读取完毕 · 核验通过',
      en: 'READ COMPLETE · VERIFIED',
      say: 'Read complete. Verification passed.',
      audio: 'line-5',
      log: '读取完毕，核验通过，权限已授予',
      logEn: 'PERMISSION AUTHORIZED',
      badge: 'VERIFY',
      action: 'auto',
      hold: 1600,
      progress: 0.93,
      reticle: true
    }
  ]

  function cfg() {
    var raw = (window.__DSH_STARTUP__ && typeof window.__DSH_STARTUP__ === 'object')
      ? window.__DSH_STARTUP__
      : {}
    var out = {}
    for (var k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k]
    for (var k2 in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k2) && raw[k2] !== undefined && raw[k2] !== null) {
        out[k2] = raw[k2]
      }
    }
    out.speed = Math.min(3, Math.max(0.35, Number(out.speed) || 1))
    out.identity = String(out.identity || DEFAULTS.identity).slice(0, 48)
    /* 代号取身份名称里的字母数字；纯中文名字取不到时退回 OPERATOR */
    out.identityId = String(out.identityId || out.identity).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
    if (!out.identityId) out.identityId = 'OPERATOR'
    return out
  }

  var C = cfg()

  /** 重播：把运行时脚本重新挂一次（配置/身份名称改动后 preview 用它）。 */
  function injectSelf() {
    window.__DSH_STARTUP_LOADED__ = false
    var old = document.getElementById(ROOT_ID)
    if (old && old.parentNode) old.parentNode.removeChild(old)
    window.__DSH_STARTUP_SKIP__ = false
    var s = document.createElement('script')
    /* 正式运行时由 Host 路由提供（加时间戳绕开缓存）；
       离线预览页会把相对路径写进 __DSH_STARTUP_SCRIPT_URL__，file:// 下不加查询串。 */
    if (window.__DSH_STARTUP_SCRIPT_URL__) {
      s.src = window.__DSH_STARTUP_SCRIPT_URL__
    } else {
      s.src = '/dsh-startup/splash.js?t=' + Date.now()
    }
    document.head.appendChild(s)
  }

  /* Host 侧的首屏兜底脚本已经判定"这次不播"（未启用 / 本会话已播 / 今日已播）：
     这里不再建 DOM，但仍然暴露 API，方便设置页按需重播。 */
  if (window.__DSH_STARTUP_SKIP__ === true) {
    window.__DSH_STARTUP_API__ = {
      replay: injectSelf,
      skip: function () {},
      finish: function () {},
      config: C
    }
    return
  }

  /* 最后一道保险：无论前面哪一步抛异常，都不许把用户留在黑幕里 */
  setTimeout(function () {
    try {
      var r = document.getElementById(ROOT_ID)
      if (r && r.classList && r.classList.contains('dsu-boot')) {
        if (r.parentNode) r.parentNode.removeChild(r)
        document.documentElement.classList.remove('dsu-lock')
        if (document.body) document.body.style.overflow = ''
        window.__DSH_STARTUP_FAILED__ = true
      }
    } catch (e) { /* 兜底本身不许再抛 */ }
  }, 9000)

  /* ── 小工具 ───────────────────────────────────────────────────────────── */
  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  function svgMark(cls) {
    var ns = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 244 268')
    svg.setAttribute('aria-hidden', 'true')
    if (cls) svg.setAttribute('class', cls)
    var p = document.createElementNS(ns, 'path')
    p.setAttribute('d', MARK_PATH)
    p.setAttribute('fill-rule', 'evenodd')
    svg.appendChild(p)
    return svg
  }

  /** 逐字渐显：比逐字截断更稳（居中排版不会因为字宽变化而抖动） */
  function typeIn(host, text, stagger) {
    host.textContent = ''
    var frag = document.createDocumentFragment()
    var n = 0
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i)
      if (ch === ' ') {
        frag.appendChild(document.createTextNode('\u00a0'))
        continue
      }
      var s = el('span', 'dsu-ch', ch)
      s.style.transitionDelay = Math.round(n * stagger) + 'ms'
      frag.appendChild(s)
      n++
    }
    host.appendChild(frag)
  }

  function setIn(node, on, cls) {
    if (!node) return
    node.classList.toggle(cls || 'dsu-in', !!on)
  }

  /* ── DOM 搭建 ─────────────────────────────────────────────────────────── */
  var root = document.getElementById(ROOT_ID)
  if (!root) {
    root = el('div')
    root.id = ROOT_ID
    root.className = 'dsu-root'
    document.body.appendChild(root)
  }
  root.classList.toggle('dsu-dark', C.theme === 'dark')
  root.style.setProperty('--dsu-speed', String(C.speed))
  root.style.setProperty('--dsu-accent', C.accent)
  root.style.setProperty('--dsu-glitch-a', C.glitchA)
  root.style.setProperty('--dsu-glitch-b', C.glitchB)

  var ui = {}
  var clockTimer = null
  var html =
    '<div class="dsu-plate"></div>' +
    '<div class="dsu-vignette"></div>' +
    '<div class="dsu-watermark"></div>' +
    '<div class="dsu-grain"></div>' +
    '<div class="dsu-black">' +
      '<div class="dsu-black-inner"></div>' +
      '<div class="dsu-sweep"></div>' +
    '</div>' +
    '<div class="dsu-wash"></div>' +
    '<header class="dsu-brand">' +
      '<div class="dsu-brand-1"></div><div class="dsu-brand-2"></div>' +
      '<div class="dsu-brand-3"><b></b><span></span></div>' +
    '</header>' +
    '<div class="dsu-stepcount">[ 00 / 06 ] INIT</div>' +
    '<div class="dsu-center">' +
      '<div class="dsu-status"><span class="dsu-status-zh"></span><i class="dsu-caret"></i></div>' +
      '<div class="dsu-sub-en"></div>' +
      '<div class="dsu-rule"></div>' +
      '<div class="dsu-logo"></div>' +
      '<div class="dsu-dots" hidden></div>' +
    '</div>' +
    '<div class="dsu-idline"></div>' +
    '<div class="dsu-reticle"></div>' +
    '<div class="dsu-hex"></div>' +
    '<div class="dsu-welcome">' +
      '<div class="dsu-w1">WELCOME TO</div>' +
      '<div class="dsu-w2"></div>' +
      '<div class="dsu-w3"></div>' +
      '<div class="dsu-w4"></div>' +
    '</div>' +
    '<div class="dsu-action">' +
      '<div class="dsu-card" hidden></div>' +
      '<button class="dsu-btn" type="button">' +
        '<span class="dsu-btn-zh"></span><span class="dsu-btn-en"></span>' +
      '</button>' +
      '<div class="dsu-hint"></div>' +
    '</div>' +
    '<div class="dsu-frame">' +
      '<i class="dsu-corner dsu-c-tl"></i><i class="dsu-corner dsu-c-tr"></i>' +
      '<i class="dsu-corner dsu-c-bl"></i><i class="dsu-corner dsu-c-br"></i>' +
      '<div class="dsu-scanline"></div>' +
    '</div>' +
    '<div class="dsu-slats"></div>' +
    '<div class="dsu-voice"><i></i><i></i><i></i><i></i><i></i></div>' +
    '<div class="dsu-meta"><span class="dsu-meta-1"></span><span class="dsu-meta-2"></span></div>' +
    '<div class="dsu-skip">SKIP ▸</div>' +
    '<footer class="dsu-foot"><span></span><i></i></footer>' +
    '<div class="dsu-subtitle">' +
      '<span class="dsu-sub-zh"></span><span class="dsu-sub-en2"></span>' +
    '</div>' +
    '<div class="dsu-progress"><i></i></div>' +
    '<div class="dsu-bloom"></div>' +
    '<div class="dsu-streak"></div>' +
    '<div class="dsu-flash"></div>'

  root.innerHTML = html

  function q(sel) { return root.querySelector(sel) }
  ui.plate = q('.dsu-plate')
  ui.watermark = q('.dsu-watermark')
  ui.black = q('.dsu-black')
  ui.blackInner = q('.dsu-black-inner')
  ui.sweep = q('.dsu-sweep')
  ui.wash = q('.dsu-wash')
  ui.flash = q('.dsu-flash')
  ui.bloom = q('.dsu-bloom')
  ui.streak = q('.dsu-streak')
  ui.vignette = q('.dsu-vignette')
  ui.brand = q('.dsu-brand')
  ui.center = q('.dsu-center')
  ui.brand1 = q('.dsu-brand-1')
  ui.brand2 = q('.dsu-brand-2')
  ui.brand3b = q('.dsu-brand-3 b')
  ui.brand3s = q('.dsu-brand-3 span')
  ui.stepcount = q('.dsu-stepcount')
  ui.status = q('.dsu-status')
  ui.statusZh = q('.dsu-status-zh')
  ui.caret = q('.dsu-caret')
  ui.subEn = q('.dsu-sub-en')
  ui.rule = q('.dsu-rule')
  ui.logo = q('.dsu-logo')
  ui.dots = q('.dsu-dots')
  ui.idline = q('.dsu-idline')
  ui.reticle = q('.dsu-reticle')
  ui.hex = q('.dsu-hex')
  ui.welcome = q('.dsu-welcome')
  ui.w1 = q('.dsu-w1')
  ui.w2 = q('.dsu-w2')
  ui.w3 = q('.dsu-w3')
  ui.w4 = q('.dsu-w4')
  ui.action = q('.dsu-action')
  ui.card = q('.dsu-card')
  ui.btn = q('.dsu-btn')
  ui.btnZh = q('.dsu-btn-zh')
  ui.btnEn = q('.dsu-btn-en')
  ui.hint = q('.dsu-hint')
  ui.skip = q('.dsu-skip')
  ui.foot = q('.dsu-foot')
  ui.footText = q('.dsu-foot span')
  ui.subZh = q('.dsu-sub-zh')
  ui.subEn2 = q('.dsu-sub-en2')
  ui.progress = q('.dsu-progress')
  ui.bar = q('.dsu-progress i')
  ui.frame = q('.dsu-frame')
  ui.scanline = q('.dsu-scanline')
  ui.slats = q('.dsu-slats')
  ui.voice = q('.dsu-voice')
  ui.meta = q('.dsu-meta')
  ui.meta1 = q('.dsu-meta-1')
  ui.meta2 = q('.dsu-meta-2')

  /* 内容填充 */
  ui.brand1.textContent = C.brand1
  ui.brand2.textContent = C.brand2
  ui.brand3b.textContent = C.brand3a
  ui.brand3s.textContent = C.brand3b
  ui.footText.textContent = C.footer
  ui.w2.textContent = C.welcomeBox
  ui.w4.textContent = '欢迎访问' + C.identity
  ui.idline.textContent = '· ID CONFIRMED : ' + C.identityId

  ;(function blackStage() {
    var inner = ui.blackInner
    var mark = svgMark('dsu-mark')
    inner.appendChild(mark)
    inner.appendChild(el('div', 'dsu-black-zh', C.orgZh))
    var en = el('div', 'dsu-black-en', C.orgEn)
    inner.appendChild(en)
    inner.appendChild(el('div', 'dsu-black-sub', C.orgSub))
    ui.blackEn = en
  })()

  ;(function logoStage() {
    ui.logo.appendChild(svgMark())
    ui.logo.appendChild(el('div', 'dsu-logolabel', 'H A A V K'))
  })()

  ;(function welcomeLogo() {
    ui.w3.appendChild(svgMark())
    ui.w3.appendChild(el('span', 'dsu-w3label', 'H A A V K  ·  G R O U P'))
  })()

  ;(function watermark() {
    var boxes = [
      [0.60, 0.02, 0.16, 0.96], [0.78, 0.02, 0.16, 0.96], [0.96, 0.02, 0.16, 0.96],
      [0.05, 0.02, 0.10, 0.5]
    ]
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i]
      var n = el('div', 'dsu-wm')
      n.style.left = (b[0] * 100) + '%'
      n.style.top = (b[1] * 100) + '%'
      n.style.width = (b[2] * 100) + '%'
      n.style.height = (b[3] * 100) + '%'
      ui.watermark.appendChild(n)
    }
  })()

  /* 左侧六格阶段柱 + 品牌块下方的小字数据行 + 实时时钟 */
  ;(function slatsAndMeta() {
    for (var i = 0; i < STEPS.length + 1; i++) ui.slats.appendChild(el('i', 'dsu-slat'))
    ui.meta1.textContent = 'REV 0.1.0 · WEB PROFILE'
    paintClock()
    clockTimer = setInterval(paintClock, 1000)
  })()

  ;(function reticle() {
    var ns = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 400 400')
    function arc(cx, cy, r, a0, a1, cls, cap) {
      var rad = function (d) { return (d - 90) * Math.PI / 180 }
      var x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0))
      var x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1))
      var large = (a1 - a0) > 180 ? 1 : 0
      var p = document.createElementNS(ns, 'path')
      p.setAttribute('d', 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
        ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2))
      p.setAttribute('class', cls)
      if (cap) p.setAttribute('stroke-linecap', cap)
      return { node: p, x: x1, y: y1, x0: x0, y0: y0 }
    }
    var gA = document.createElementNS(ns, 'g')
    gA.setAttribute('class', 'dsu-ret-rot-a')
    /* 300° 弧，缺口留在正下方 6 点钟方向：底部字幕永远不会被压到，
       弧末端圆点落在 5 点钟位置，和原片一致。 */
    var a = arc(200, 200, 150, 215, 505, 'dsu-ring-a', 'round')
    gA.appendChild(a.node)
    var da = document.createElementNS(ns, 'circle')
    da.setAttribute('class', 'dsu-dot-a')
    da.setAttribute('cx', a.x.toFixed(2)); da.setAttribute('cy', a.y.toFixed(2)); da.setAttribute('r', '7')
    gA.appendChild(da)
    svg.appendChild(gA)

    var gB = document.createElementNS(ns, 'g')
    gB.setAttribute('class', 'dsu-ret-rot-b')
    var b = arc(200, 200, 104, 200, 490, 'dsu-ring-b', 'round')
    gB.appendChild(b.node)
    var db = document.createElementNS(ns, 'circle')
    db.setAttribute('class', 'dsu-dot-b')
    db.setAttribute('cx', b.x0.toFixed(2)); db.setAttribute('cy', b.y0.toFixed(2)); db.setAttribute('r', '4')
    gB.appendChild(db)
    svg.appendChild(gB)

    var gC = document.createElementNS(ns, 'g')
    var bl = arc(200, 200, 62, 118, 242, 'dsu-bracket', 'round')
    var br = arc(200, 200, 62, 298, 62, 'dsu-bracket', 'round')
    gC.appendChild(bl.node); gC.appendChild(br.node)
    svg.appendChild(gC)

    var pts = [[152, 132], [252, 268], [278, 150]]
    for (var i = 0; i < pts.length; i++) {
      var c = document.createElementNS(ns, 'circle')
      c.setAttribute('class', 'dsu-dot-o')
      c.setAttribute('cx', pts[i][0]); c.setAttribute('cy', pts[i][1]); c.setAttribute('r', '2.8')
      svg.appendChild(c)
    }
    ui.reticle.appendChild(svg)
  })()

  /* ── 时间线引擎 ───────────────────────────────────────────────────────── */
  var timers = []
  var waiters = []
  var skipped = false
  var finished = false
  var hexTimer = null

  function ms(base) { return Math.round(base / C.speed) }

  /* 已经按 speed 折算过的毫秒：直接等待，不再二次缩放 */
  function waitRaw(scaled) {
    return new Promise(function (resolve) {
      if (skipped) return resolve()
      var done = false
      function fin() {
        if (done) return
        done = true
        var i = waiters.indexOf(fin)
        if (i >= 0) waiters.splice(i, 1)
        resolve()
      }
      var t = setTimeout(fin, Math.max(0, scaled))
      timers.push(t)
      waiters.push(fin)
    })
  }

  function wait(base) { return waitRaw(ms(base)) }

  /* ── 无声 / 无交互时的节奏补偿 ────────────────────────────────────────
     常规模式下每一步的停留靠"等你点确认"或"等台词念完"撑着；
     关掉 voice 与 requireInteraction 后两者都归零，画面会一闪而过。
     这里给纯自动播放补一个"读完这一屏"的最短停留，语音/交互任一开启就恢复原节奏。 */
  var SILENT_STEP_PAD = 2200       // 自动步骤的最短停留（替代台词时长）
  var SILENT_CONFIRM_DWELL = 2200  // 确认/授权步骤的停留（替代等待点击）
  var SILENT_FINALE_PAD = 1400     // 终幕揭幕前补的一口气
  function silentPace() { return !C.voice && !C.requireInteraction }

  function waitAction() {
    return new Promise(function (resolve) {
      if (skipped || !C.requireInteraction) return resolve()
      var done = false
      function fin() {
        if (done) return
        done = true
        cleanup()
        resolve()
      }
      function onKey(e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); fin() }
      }
      function onClick(e) { e.preventDefault(); fin() }
      function cleanup() {
        ui.btn.removeEventListener('click', onClick)
        ui.action.removeEventListener('click', onClick)
        document.removeEventListener('keydown', onKey)
        var i = waiters.indexOf(fin)
        if (i >= 0) waiters.splice(i, 1)
      }
      ui.btn.addEventListener('click', onClick)
      ui.action.addEventListener('click', onClick)
      document.addEventListener('keydown', onKey)
      waiters.push(fin)
    })
  }

  function releaseAll() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i])
    timers.length = 0
    var list = waiters.slice()
    waiters.length = 0
    for (var j = 0; j < list.length; j++) { try { list[j]() } catch (err) { /* noop */ } }
  }

  function setProgress(p) {
    var pct = Math.max(0, Math.min(1, p))
    ui.bar.style.width = Math.round(pct * 100) + '%'
  }

  /** 六格阶段柱：走过的压暗、当前的拉满并点亮主题橙 */
  function setSlats(active) {
    var items = ui.slats.children
    for (var i = 0; i < items.length; i++) {
      var idx = i + 1
      items[i].classList.toggle('dsu-on', idx === active)
      items[i].classList.toggle('dsu-past', idx < active)
    }
  }

  /** 扫描线自上而下扫一遍（底板洗白后一次，验准时再一次） */
  function sweep() {
    if (!ui.scanline) return
    ui.scanline.classList.remove('dsu-go')
    void ui.scanline.offsetWidth
    ui.scanline.classList.add('dsu-go')
  }

  function paintClock() {
    var d = new Date()
    var pad = function (n) { return (n < 10 ? '0' : '') + n }
    ui.meta2.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
  }

  function setSubtitle(zh, en) {
    ui.subZh.classList.remove('dsu-in')
    ui.subEn2.classList.remove('dsu-in')
    setTimeout(function () {
      ui.subZh.textContent = zh || ''
      ui.subEn2.textContent = en || ''
      ui.subZh.classList.add('dsu-in')
      if (en) ui.subEn2.classList.add('dsu-in')
    }, ms(140))
  }

  function setStepCount(i, code) {
    var totalSteps = STEPS.length + 1
    ui.stepcount.textContent = '[ ' + String(i).padStart(2, '0') + ' / ' +
      String(totalSteps).padStart(2, '0') + ' ] ' + code
  }

  function startHex() {
    var lines = 12
    function line() {
      var s = ''
      for (var i = 0; i < 26; i++) {
        s += '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16))
        if (i % 2 === 1) s += ' '
      }
      return s
    }
    function paint() {
      var out = []
      for (var i = 0; i < lines; i++) out.push(line())
      ui.hex.innerHTML = out.join('<br>')
    }
    paint()
    ui.hex.classList.add('dsu-in')
    audio.tickRun()
    hexTimer = setInterval(paint, 110)
  }
  function stopHex() {
    if (hexTimer) { clearInterval(hexTimer); hexTimer = null }
    ui.hex.classList.remove('dsu-in')
  }

  /* ── 声音 ──────────────────────────────────────────────────────────────
   * 两条独立的通道，都不依赖任何音频文件：
   *   audio —— 界面音效，WebAudio 现场合成（咔哒 / 双音确认 / 噪声扫频 / 和声钟）
   *   voice —— 女声播报，Web Speech API 念每一行的英文（照参考片的女声节奏：
   *            7.3-9.3s 念状态行、19.6-21.2s 念 PERMISSION AUTHORIZED）
   * 浏览器策略要求"先有用户手势"，所以第一次点击/按键会补一次解锁 + 补播。 */
  function clamp01(v, lo, hi) {
    var n = Number(v)
    return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo
  }

  var audio = (function () {
    var ctx = null
    function ac(force) {
      /* 语音素材要独立于「界面音效」开关：force=true 时无视 C.sound */
      if (!C.sound && !force) return null
      try {
        var AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        if (!ctx) ctx = new AC()
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume()
        return ctx
      } catch (e) { return null }
    }
    function vol(gain) { return Math.max(0.0002, (gain == null ? 0.05 : gain) * clamp01(C.soundVolume, 0, 1) * 2) }
    function tone(freq, dur, type, gain, delay, glideTo) {
      var c = ac(); if (!c) return
      try {
        var t0 = c.currentTime + (delay || 0)
        var o = c.createOscillator(), g = c.createGain()
        o.type = type || 'sine'
        o.frequency.setValueAtTime(freq, t0)
        if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
        g.gain.setValueAtTime(0.0001, t0)
        g.gain.exponentialRampToValueAtTime(vol(gain), t0 + Math.min(0.02, dur * 0.3))
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        o.connect(g); g.connect(c.destination)
        o.start(t0); o.stop(t0 + dur + 0.03)
      } catch (e) { /* 静默降级 */ }
    }
    function noise(dur, gain) {
      var c = ac(); if (!c) return
      try {
        var n = Math.floor(c.sampleRate * dur)
        var buf = c.createBuffer(1, n, c.sampleRate)
        var d = buf.getChannelData(0)
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
        var src = c.createBufferSource(); src.buffer = buf
        var f = c.createBiquadFilter(); f.type = 'bandpass'
        f.frequency.value = 1500; f.Q.value = 0.6
        var g = c.createGain(); g.gain.value = vol(gain)
        src.connect(f); f.connect(g); g.connect(c.destination)
        src.start()
      } catch (e) { /* 静默降级 */ }
    }
    /* 从 /dsh-startup/asset/ 拉真素材（用户音频里抠出来的"哒"）并解码缓存；
       拿不到就自动回落到下面合成的音，功能不依赖网络/素材存在与否。 */
    var buffers = {}
    var fetching = {}
    function loadAsset(name) {
      if (C.sfx === 'synth') return
      if (buffers[name] || fetching[name]) return
      fetching[name] = true
      try {
        fetch('/dsh-startup/asset/' + name + '.mp3')
          .then(function (r) { return r.ok ? r.arrayBuffer() : null })
          .then(function (ab) { return ab ? ac().decodeAudioData(ab) : null })
          .then(function (buf) { if (buf) buffers[name] = buf })
          .catch(function () { /* 没素材就走合成音 */ })
      } catch (e) { /* fetch 不存在也一样降级 */ }
    }
    /* 素材预加载：fetch + decodeAudioData 不需要用户手势，所以加载时就拉，
       这样第一步就能用真声，而不用等用户第一次点击。 */
    var pending = {}
    function ensureAsset(name) {
      if (buffers[name]) return Promise.resolve(true)
      if (pending[name]) return pending[name]
      if (C.voiceSource === 'tts') return Promise.resolve(false)
      pending[name] = new Promise(function (resolve) {
        try {
          fetch('/dsh-startup/asset/' + name + '.mp3')
            .then(function (r) { return r.ok ? r.arrayBuffer() : null })
            .then(function (ab) { if (!ab) return null; return ac(true).decodeAudioData(ab) })
            .then(function (buf) {
              if (buf) { buffers[name] = buf; resolve(true) } else { resolve(false) }
            })
            .catch(function () { resolve(false) })
        } catch (e) { resolve(false) }
      })
      return pending[name]
    }

    /** 播素材并等它播完，resolve 实际时长(ms)。拿不到素材 resolve 0。 */
    function playAssetAndWait(name, gain) {
      return new Promise(function (resolve) {
        var c = ac(true)
        var buf = buffers[name]
        if (!c || !buf) { resolve(0); return }
        try {
          var src = c.createBufferSource()
          src.buffer = buf
          var g = c.createGain()
          g.gain.value = Math.min(1, (gain == null ? 0.85 : gain) * clamp01(C.voiceVolume, 0, 1) * 1.6)
          src.connect(g); g.connect(c.destination)
          src.onended = function () { resolve(Math.round(buf.duration * 1000)) }
          src.start()
        } catch (e) { resolve(0) }
      })
    }

    function playAsset(name, gain) {
      var c = ac(); if (!c) return false
      var buf = buffers[name]
      if (!buf) { loadAsset(name); return false }
      try {
        var src = c.createBufferSource()
        src.buffer = buf
        var g = c.createGain()
        g.gain.value = Math.min(1, (gain == null ? 0.55 : gain) * clamp01(C.soundVolume, 0, 1) * 2)
        src.connect(g); g.connect(c.destination)
        src.start()
        return true
      } catch (e) { return false }
    }

    return {
      resume: function () { ac(); loadAsset('sfx-tick'); loadAsset('sfx-ticks-run') },
      preload: function () { loadAsset('sfx-tick'); loadAsset('sfx-ticks-run') },
      ensureAsset: ensureAsset,
      playAssetAndWait: playAssetAndWait,
      /* 文字渐显 / 阶段推进 / 按钮确认 —— 优先用真素材 */
      tick: function () { if (!playAsset('sfx-tick', 0.45)) tone(1760, 0.035, 'square', 0.022) },
      confirm: function () { if (!playAsset('sfx-tick', 0.85)) { tone(660, 0.09, 'triangle', 0.07); tone(990, 0.17, 'triangle', 0.055, 0.085) } },
      tickRun: function () { playAsset('sfx-ticks-run', 0.5) },
      step: function () { if (!playAsset('sfx-tick', 0.6)) { tone(880, 0.05, 'sine', 0.05); tone(1320, 0.07, 'sine', 0.028, 0.045) } },
      hover: function () { tone(2200, 0.02, 'sine', 0.018) },
      confirm: function () { tone(660, 0.09, 'triangle', 0.07); tone(990, 0.17, 'triangle', 0.055, 0.085) },
      sweep: function () { noise(0.75, 0.035) },
      /* 念台词之前的两声轻提示：这一笔让 TTS 从"浏览器念字"变成"系统播报" */
      cue: function () { tone(1046.5, 0.05, 'sine', 0.028); tone(1568, 0.06, 'sine', 0.02, 0.075) },
      rise: function () { tone(220, 1.1, 'sine', 0.032, 0, 990) },
      chime: function () {
        tone(659.25, 0.9, 'sine', 0.055)
        tone(830.61, 0.9, 'sine', 0.04, 0.09)
        tone(987.77, 1.3, 'sine', 0.045, 0.18)
      }
    }
  })()

  var voice = (function () {
    var supported = typeof window !== 'undefined' && !!window.speechSynthesis &&
      typeof window.SpeechSynthesisUtterance === 'function'
    var voices = []
    var picked = { en: null, zh: null }
    var meter = null
    var saidOnce = false
    var pending = { en: '', zh: '' }

    /* 想让它听起来像"AI 播报"，音色本身比什么都重要。
       同一台机器上，"Microsoft Zira Desktop" 是上世纪拼接合成，念长句塑料味很重；
       Edge 的 "... Online (Natural)"、Chrome 的 "Google ..."、macOS 的 Siri 才是神经网络音色。
       所以这里按分数挑，而不是挨个名字第一个命中。 */
    var NATURAL_HINTS = ['natural', 'neural', 'online', 'premium', 'enhanced', 'siri', 'google']
    var FEMALE_HINTS = [
      'aria', 'jenny', 'michelle', 'emma', 'ava', 'libby', 'sonia', 'maisie',
      'zira', 'samantha', 'karen', 'moira', 'tessa', 'victoria', 'serena', 'allison',
      'susan', 'fiona', 'hazel', 'female', 'woman',
      'xiaoxiao', 'xiaoyi', 'xiaomo', 'huihui', 'yaoyao', '晓晓', '晓伊', '女声'
    ]
    var MALE_HINTS = ['david', 'mark', 'guy', 'ryan', 'george', 'daniel', 'alex', 'fred',
      'male', 'yunxi', 'yunjian', 'kangkang']

    /** 给一个音色打分：神经网络 > 女声 > 语种吻合 > 本地 */
    function score(v, want) {
      var name = String(v.name || '').toLowerCase()
      var lang = String(v.lang || '').toLowerCase()
      var sc = 0
      for (var i = 0; i < NATURAL_HINTS.length; i++) {
        if (name.indexOf(NATURAL_HINTS[i]) !== -1) { sc += 60; break }
      }
      for (var j = 0; j < FEMALE_HINTS.length; j++) {
        if (name.indexOf(FEMALE_HINTS[j]) !== -1) { sc += 40; break }
      }
      for (var k = 0; k < MALE_HINTS.length; k++) {
        if (name.indexOf(MALE_HINTS[k]) !== -1) { sc -= 45; break }
      }
      if (lang.indexOf(want) === 0) sc += 25
      if (v.localService) sc += 4          /* 本地音色起播快，不会先卡半秒 */
      if (v.default) sc += 3
      return sc
    }

    /** 挑某语种最合适的一个音色（want 传 'en' / 'zh' 这样的两字母前缀） */
    function bestFor(want) {
      if (!voices.length) return null
      if (C.voiceName) {
        for (var i = 0; i < voices.length; i++) {
          var v = voices[i]
          if (v.name === C.voiceName && String(v.lang || '').toLowerCase().indexOf(want) === 0) return v
        }
      }
      var pool = []
      for (var j = 0; j < voices.length; j++) {
        if (String(voices[j].lang || '').toLowerCase().indexOf(want) === 0) pool.push(voices[j])
      }
      if (!pool.length) pool = voices.slice()
      var best = null
      var bs = -1e9
      for (var n = 0; n < pool.length; n++) {
        var sc = score(pool[n], want)
        if (sc > bs) { bs = sc; best = pool[n] }
      }
      return best
    }

    function setMeter(on) { if (meter) meter.classList.toggle('dsu-on', !!on) }

    function load() {
      if (!supported) return
      try { voices = window.speechSynthesis.getVoices() || [] } catch (e) { voices = [] }
      picked.en = bestFor('en')
      picked.zh = bestFor('zh')
    }

    /** 全大写名字有些引擎会一个字母一个字母念，转成 Title Case 更像在叫名字 */
    function spokenName(name) {
      return String(name || '').replace(/\S+/g, function (w) {
        return (/^[A-Z0-9.\-]+$/.test(w) && w.length > 1) ? w.charAt(0) + w.slice(1).toLowerCase() : w
      })
    }

    function utter(text, lang) {
      try {
        var u = new window.SpeechSynthesisUtterance(text)
        var v = lang.indexOf('zh') === 0 ? picked.zh : picked.en
        if (v) { u.voice = v; u.lang = v.lang || lang } else u.lang = lang
        /* 神经网络音色在 .95 / 1.02 这个档位最像"系统在播报"：
           再快就赶，再慢就假；音调略抬一点显得干净利落 */
        u.rate = clamp01(C.voiceRate, 0.5, 2)
        u.pitch = clamp01(C.voicePitch, 0, 2)
        u.volume = clamp01(C.voiceVolume, 0, 1)
        u.onstart = function () { setMeter(true) }
        u.onend = function () { setMeter(false) }
        u.onerror = function () { setMeter(false) }
        window.speechSynthesis.speak(u)
        return true
      } catch (e) { return false }
    }

    /** 一句话的时长估算（个别引擎不触发 onend 时兜底；中文按字、英文按字符） */
    function estimateMs(items) {
      var chars = 0
      var rate = clamp01(C.voiceRate, 0.5, 2) || 1
      for (var i = 0; i < items.length; i++) {
        var t = String(items[i].t || '')
        chars += /[\u4e00-\u9fa5]/.test(t) ? t.length * 1.7 : t.length
      }
      return Math.round((chars / 13) * 1000 / rate) + 460
    }

    function buildUtter(text, lang) {
      var u = new window.SpeechSynthesisUtterance(text)
      var v = lang.indexOf('zh') === 0 ? picked.zh : picked.en
      if (v) { u.voice = v; u.lang = v.lang || lang } else u.lang = lang
      u.rate = clamp01(C.voiceRate, 0.5, 2)
      u.pitch = clamp01(C.voicePitch, 0, 2)
      u.volume = clamp01(C.voiceVolume, 0, 1)
      return u
    }

    return {
      supported: supported,
      load: load,
      attach: function (node) { meter = node },

      /**
       * 念一行，返回"这一行实际花了多久(ms)"的 Promise。
       *
       * 三个关键决定：
       *  - **不 cancel 上一句**。原来每步都 cancel，用户点快一点、或者
       *    hold 短于台词长度，语音就被硬生生掐断 —— 那正是要避免的。
       *    speechSynthesis 本身是队列，不 cancel 就是顺序播报。
       *  - 提示音响过之后留 `voiceLead` 的空白再开口，这是旁白的呼吸感。
       *  - 等 `onend` 才 resolve，动画据此决定这一步停多久；个别引擎不触发
       *    onend 时按估算兜底，绝不把动画卡死。
       */
      line: function (en, zh, asset) {
        /* 有真声素材就优先用素材（音色就是你给的那个）；拿不到再回落 TTS */
        if (asset && C.voice && C.voiceSource !== 'tts' && !finished) {
          return audio.ensureAsset(asset).then(function (ok) {
            if (!ok || finished) return 0
            if (C.voiceCue !== false) audio.cue()
            return audio.playAssetAndWait(asset, 0.85).then(function (ms) {
              if (ms > 0) setMeter(true)
              return ms
            })
          }).then(function (ms) {
            if (ms > 0) { saidOnce = true; return ms }
            return ttsLine(en, zh)
          })
        }
        return ttsLine(en, zh)
      },

      /** TTS 路径：素材缺失 / voiceSource=tts / 终幕那条动态名字 */
      tts: function (en, zh) { return ttsLine(en, zh) },

      /** 不等待的版本：设置页试听 / 任何"念完就行"的场合 */
      say: function (en, zh) { return this.line(en, zh) },

      /** 浏览器要求"先有用户手势"才放声：第一次点击/按键解锁 + 补播当前行 */
      unlock: function () {
        try { if (supported) window.speechSynthesis.resume() } catch (e) {}
        audio.resume()
        /* 预热：先无声念一个空格，把引擎唤醒，避免第一句被吃掉开头半个字 */
        if (supported && !saidOnce) {
          try {
            var w = new window.SpeechSynthesisUtterance(' ')
            w.volume = 0
            var v = picked.en || picked.zh
            if (v) { w.voice = v; w.lang = v.lang }
            window.speechSynthesis.speak(w)
          } catch (e) { /* noop */ }
        }
        if (!saidOnce && C.voice && (pending.en || pending.zh)) this.say(pending.en, pending.zh)
      },
      speakName: spokenName,
      current: function () {
        var a = picked.en ? picked.en.name : ''
        var b = picked.zh ? picked.zh.name : ''
        return a === b ? a : (a + (b ? '  /  ' + b : ''))
      },
      listVoices: function () { return voices.slice() },
      /** 只有这里才真的掐断语音（跳过 / 揭幕） */
      stop: function () { try { if (supported) window.speechSynthesis.cancel() } catch (e) {} setMeter(false) }
    }

    /** TTS 合成并等它念完，resolve 实际时长(ms)；拿不到引擎时 resolve 0。 */
    function ttsLine(en, zh) {
      return new Promise(function (resolve) {
        if (!supported || !C.voice || finished) { resolve(0); return }
        pending = { en: en || '', zh: zh || '' }
        var items = []
        var mode = C.voiceLang
        if (mode === 'zh') { if (zh) items.push({ t: zh, l: 'zh-CN' }) }
        else if (mode === 'both') {
          if (zh) items.push({ t: zh, l: 'zh-CN' })
          if (en) items.push({ t: en, l: 'en-US' })
        } else if (en) { items.push({ t: en, l: 'en-US' }) }
        if (!items.length) { resolve(0); return }

        saidOnce = true
        if (C.voiceCue !== false) audio.cue()

        var startedAt = Date.now()
        var est = estimateMs(items)
        var lead = clamp01(C.voiceLead, 0, 1200)
        var settled = false
        var watchdog = null

        function settle() {
          if (settled) return
          settled = true
          if (watchdog) clearTimeout(watchdog)
          setMeter(false)
          resolve(Math.max(0, Date.now() - startedAt))
        }

        setTimeout(function () {
          if (finished) { settle(); return }
          var last = items.length - 1
          for (var i = 0; i <= last; i++) {
            var u = buildUtter(items[i].t, items[i].l)
            if (i === last) {
              u.onstart = function () { setMeter(true) }
              u.onend = settle
              u.onerror = settle
            }
            try { window.speechSynthesis.speak(u) } catch (e) { if (i === last) settle() }
          }
          watchdog = setTimeout(settle, est + 900)
        }, lead)
      })
    }
  })()

  /* 语音/音效接线：声卡要等用户手势才能出声，这里挂一次性解锁 */
  voice.attach(q('.dsu-voice'))
  ;(function preloadVoices() {
    if (C.voiceSource === 'tts') return
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].audio) audio.ensureAsset(STEPS[i].audio)
    audio.ensureAsset('line-6')   /* 终幕欢迎语 */
  })()
  ;(function wireSound() {
    voice.load()
    if (voice.supported && typeof window.speechSynthesis.addEventListener === 'function') {
      try { window.speechSynthesis.addEventListener('voiceschanged', function () { voice.load() }) } catch (e) {}
    }
    var unlocked = false
    function unlock() {
      if (unlocked) return
      unlocked = true
      voice.unlock()
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('keydown', unlock, true)
      document.removeEventListener('touchstart', unlock, true)
    }
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', unlock, true)
    document.addEventListener('touchstart', unlock, true)
  })()

  /* ── 时间线 ───────────────────────────────────────────────────────────── */
  function run() {
    return Promise.resolve()
      /* 第一幕：黑幕 --> DeepSeek 标识 */
      .then(function () { return wait(820) })
      .then(function () {
        ui.blackInner.classList.add('dsu-in')
        audio.rise()
        return wait(240)
      })
      .then(function () {
        ui.blackEn.classList.add('dsu-tighten')
        return wait(880)
      })
      .then(function () {
        ui.sweep.classList.add('dsu-go')
        return wait(760)
      })
      /* 过场：过曝洗白 */
      .then(function () {
        ui.blackInner.classList.add('dsu-out')
        audio.sweep()
        ui.wash.style.transition = 'opacity ' + ms(220) + 'ms linear'
        ui.wash.style.opacity = '1'
        return wait(260)
      })
      .then(function () {
        ui.plate.style.transition = 'opacity ' + ms(900) + 'ms ease'
        ui.plate.style.opacity = '1'
        ui.watermark.style.transition = 'opacity ' + ms(1100) + 'ms ease'
        ui.watermark.style.opacity = '1'
        ui.wash.style.transition = 'opacity ' + ms(720) + 'ms cubic-bezier(.2,.9,.2,1)'
        ui.wash.style.opacity = '0'
        ui.black.style.transition = 'opacity ' + ms(720) + 'ms ease'
        ui.black.style.opacity = '0'
        return wait(760)
      })
      /* 第二幕：品牌块 / 页脚 / 进度条 */
      .then(function () {
        ui.brand.classList.add('dsu-in')
        if (C.allowSkip) ui.skip.classList.add('dsu-in')
        ui.foot.classList.add('dsu-in')
        ui.stepcount.classList.add('dsu-in')
        ui.idline.classList.add('dsu-in')
        ui.frame.classList.add('dsu-in')
        ui.slats.classList.add('dsu-in')
        ui.meta.classList.add('dsu-in')
        ui.vignette.classList.add('dsu-in')
        ui.voice.classList.add('dsu-in')
        setProgress(0.12)
        setStepCount(0, 'BOOT')
        setSlats(0)
        setSubtitle('系统自检中…', 'SYSTEM SELF-CHECK')
        if (C.allowSkip) ui.skip.classList.add('dsu-in')
        return wait(700)
      })
      .then(function () { ui.black.style.display = 'none'; sweep() })
      /* 六个阶段 */
      .then(function () { return stepLoop() })
      /* 终幕 */
      .then(function () { return finale() })
      .catch(function (err) {
        try { console.warn('[dsh-haavk] 动画异常，直接揭幕：', err) } catch (e2) {}
        return finish()
      })
  }

  function stepLoop() {
    var chain = Promise.resolve()
    STEPS.forEach(function (step, i) {
      chain = chain.then(function () {
        if (finished) return
        var n = i + 1
        /* 身份读数讲的是「身份已确认」，只属于前两幕。第 3 幕起是「接收访问需求」，
           这句信息已经过期，跟着身份核验一起退场，不再一路挂到终幕。 */
        if (i >= 2) ui.idline.classList.remove('dsu-in')
        setStepCount(n, step.badge)
        setSlats(n)
        setProgress(step.progress)
        setSubtitle(step.log, step.logEn)
        audio.step()
        /* 语音在这里起头，但**不阻塞**下面的文字渐显 —— 两者同时发生 */
        var spoke = voice.line(step.say, step.zh, step.audio)

        ui.status.classList.toggle('dsu-zhline', true)
        /* 先摘掉 dsu-in 并强制一次样式计算，新的逐字 span 才会重新走渐显动画 */
        ui.status.classList.remove('dsu-in')
        ui.subEn.classList.remove('dsu-in')
        void ui.status.offsetWidth
        typeIn(ui.statusZh, step.zh, 46)
        typeIn(ui.subEn, step.en, 13)
        ui.caret.classList.toggle('dsu-on', !!step.action && step.action !== 'auto')
        requestAnimationFrame(function () {
          if (finished) return
          ui.status.classList.add('dsu-in')
          ui.subEn.classList.add('dsu-in')
        })
        ui.rule.classList.add('dsu-in')

        if (step.assembleLogo) assembleLogo()
        if (step.reticle) {
          /* 照原片：准星出现时中央只留状态字，菱形徽记和虚线收掉，别挤成一团 */
          ui.logo.classList.remove('dsu-in')
          ui.dots.hidden = true
          ui.reticle.classList.add('dsu-in')
          sweep()
        }
        if (step.hex) startHex()

        /* 这一步停多久 = max(视觉基准, 实际播报时长 + 收尾留白) —— 台词长就多停，
           台词短也不会干等。用户点得快时同样等这一句念完，不掐断。 */
        function holdFor(spoken) {
          var base = Math.max(ms(step.hold), (spoken || 0) + ms(240))
          if (silentPace()) base = Math.max(base, (spoken || 0) + ms(SILENT_STEP_PAD))
          /* spoken 与 base 都已是折算后的毫秒，用 waitRaw 避免二次缩放 */
          return waitRaw(Math.max(0, base - (spoken || 0)))
        }

        if (step.action === 'grant' || step.action === 'confirm') {
          showAction(step)
          var dwell = ms(silentPace() ? SILENT_CONFIRM_DWELL : 520)
          return waitRaw(dwell).then(function () { return waitAction() }).then(function () {
            hideAction()
            audio.confirm()
            ui.caret.classList.remove('dsu-on')
            return spoke
          }).then(function () { return waitRaw(ms(silentPace() ? 900 : 320)) })
        }
        if (step.hex) {
          return spoke.then(holdFor).then(function () { stopHex() })
        }
        return spoke.then(holdFor)
      })
    })
    return chain
  }

  function assembleLogo() {
    ui.logo.classList.add('dsu-in')
    ui.dots.hidden = false
    var path = ui.logo.querySelector('path')
    if (path && typeof path.getTotalLength === 'function') {
      try {
        var len = path.getTotalLength()
        path.style.fill = 'none'
        path.style.stroke = 'currentColor'
        path.style.strokeWidth = '1.1'
        path.style.strokeDasharray = len
        path.style.strokeDashoffset = len
        /* 参考片的"一笔画成"：先勾线，再落墨成面 */
        path.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: ms(1400), easing: 'cubic-bezier(.55,.06,.24,1)', fill: 'forwards' }
        )
        setTimeout(function () {
          path.style.transition = 'fill ' + ms(420) + 'ms ease, stroke-width ' + ms(420) + 'ms ease'
          path.style.fill = ''
          path.style.strokeWidth = '0'
        }, ms(1450))
      } catch (err) { /* Web Animations 不可用时直接落墨 */ }
    }
    return wait(300)
  }

  function showAction(step) {
    ui.btnZh.textContent = step.btnZh
    ui.btnEn.textContent = step.btnEn
    ui.card.hidden = step.action !== 'confirm'
    if (step.action === 'confirm') {
      ui.card.innerHTML = ''
      /* 纯中文标签 + 数字/名称，去掉英文双写与主机行，别堆信息 */
      var rows = [
        ['身份名称', C.identity, true],
        ['身份编号', C.identityId, false],
        ['权限等级', C.accessLevel, false]
      ]
      rows.forEach(function (r) {
        var row = el('div', 'dsu-card-row')
        row.appendChild(el('span', null, r[0]))
        row.appendChild(el('b', r[2] ? 'dsu-zhname' : null, r[1]))
        ui.card.appendChild(row)
      })
    }
    ui.hint.innerHTML = '按 <kbd>Enter</kbd> / <kbd>Space</kbd>，或点击按钮继续'
    ui.action.classList.add('dsu-in')
    ui.btn.classList.add('dsu-pulse')
  }

  function hideAction() {
    ui.action.classList.remove('dsu-in')
    ui.btn.classList.remove('dsu-pulse')
  }

  function finale() {
    if (finished) return Promise.resolve()
    setStepCount(6, 'WELCOME')
    setSlats(6)
    setProgress(1)
    /* 底部日志和终幕里的「欢迎 xxx 访问」区分开，避免同一句出现两遍 */
    setSubtitle('身份验证完成，会话已建立', 'IDENTITY VERIFIED · SESSION ESTABLISHED')
    audio.chime()
    /* 终幕欢迎语：用从 Video Project 3 截出来的真声素材（line-6）。
       素材缺失 / voiceSource=tts / voice 关闭时自动静音，不会退回 TTS 念白 ——
       因为这条素材是「欢迎访问」整句，和动态身份名称无关。 */
    var welcome = voice.line(null, null, 'line-6')

    ui.status.classList.remove('dsu-in')
    ui.subEn.classList.remove('dsu-in')
    ui.rule.classList.remove('dsu-in')
    ui.reticle.classList.remove('dsu-in')
    stopHex()
    /* 中央区（状态行/分隔线/徽记/虚线）整体退场：不清掉会和 WELCOME 版式叠字 */
    ui.center.classList.add('dsu-off')
    ui.dots.hidden = true

    return wait(360)
      .then(function () {
        ui.welcome.classList.add('dsu-in')
        ui.idline.classList.remove('dsu-in')
        return wait(420)
      })
      .then(function () {
        /* 结尾色散故障：分片位移 + 0.5px 模糊 + 混合模式，读起来像镜头色散 */
        var targets = [ui.w1, ui.w2, ui.w4]
        targets.forEach(function (t) {
          t.classList.add('dsu-glitch')
          t.setAttribute('data-text', t.textContent)
        })
        ui.w2.classList.add('dsu-glitch-box')   /* 黑底白字那块换加色混合 */
        void ui.welcome.offsetWidth
        targets.forEach(function (t) { t.classList.add('dsu-on') })
        return wait(640)
      })
      /* 光晕从中心炸开 + 变形光条横扫 + 文字青色 halation */
      .then(function () {
        root.classList.add('dsu-peak')
        ui.bloom.classList.add('dsu-go')
        ui.streak.classList.add('dsu-go')
        return wait(430)
      })
      /* 光晕最亮那一下补一记极短高光（是"眨一下"，不是长时间糊白） */
      .then(function () {
        ui.flash.style.transition = 'opacity ' + ms(70) + 'ms linear'
        ui.flash.style.opacity = '0.72'
        return wait(90)
      })
      .then(function () {
        ui.flash.style.transition = 'opacity ' + ms(340) + 'ms cubic-bezier(0.4, 0, 0.2, 1)'
        ui.flash.style.opacity = '0'
        return wait(320)
      })
      /* 欢迎语没播完就不揭幕（素材缺失时这个 Promise 立刻 resolve，不影响节奏） */
      .then(function () { return welcome })
      /* 无声时不播「欢迎访问」，这一口气会消失，补回来 */
      .then(function () { return waitRaw(silentPace() ? ms(SILENT_FINALE_PAD) : 0) })
      /* 揭幕：整个机位后撤 + 轻微失焦，比单纯淡出更有镜头感 */
      .then(function () {
        root.classList.add('dsu-handoff')
        return wait(780)
      })
      .then(function () { return finish() })
  }

  function finish() {
    if (finished) return
    finished = true
    releaseAll()
    stopHex()
    if (trickleTimer) { clearInterval(trickleTimer); trickleTimer = null }
    voice.stop()
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
    try {
      if (C.mode === 'session') window.sessionStorage.setItem('dsh-haavk:shown', '1')
      if (C.mode === 'daily') {
        window.localStorage.setItem('dsh-haavk:day', new Date().toISOString().slice(0, 10))
      }
    } catch (err) { /* 隐私模式下不可写，忽略 */ }
    /* 解锁：Host 注入的关键样式用 html.dsu-lock 锁滚动，这里必须一并摘掉，
       否则揭幕后主界面会永远滚不动。 */
    document.documentElement.classList.remove('dsu-lock')
    document.documentElement.style.overflow = ''
    if (document.body) document.body.style.overflow = ''
    root.classList.remove('dsu-boot')
    root.classList.add('dsu-gone')
    setTimeout(function () {
      if (root && root.parentNode) root.parentNode.removeChild(root)
      try { window.dispatchEvent(new CustomEvent('dsh-startup:done')) } catch (err) { /* noop */ }
    }, ms(900))
  }

  function requestSkip() {
    if (skipped || finished) return
    skipped = true
    releaseAll()
    finish()
  }

  if (C.allowSkip && ui.skip) {
    ui.skip.hidden = false
    ui.skip.addEventListener('click', function (e) { e.stopPropagation(); requestSkip() })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') requestSkip()
    })
  } else if (ui.skip) {
    ui.skip.hidden = true
  }

  /* 对外 API：settings 面板里的"立即预览"按钮和重播都走它 */
  window.__DSH_STARTUP_API__ = {
    /* 设置页试听与冒烟测试用：直接念一行 */
    speak: function (en, zh) { voice.say(en, zh) },
    speakName: function (n) { return voice.speakName(n) },
    get voice() { return voice.current() },
    replay: injectSelf,
    skip: requestSkip,
    finish: finish,
    config: C
  }

  /* ══════════════════════════════════════════════════════════════════════
   * 哈夫克全域互联终端（portal 主题）
   * ----------------------------------------------------------------------
   * 复刻《三角洲行动》哈夫克阵营的开机画面：浅蓝白斜切底 + 四角刻度 +
   * 右侧竖排标尺；左列菱形徽记与 HAAVK 字标，右列「哈夫克全域互联终端」
   * 标题与八行系统清单，底部 55ms / CN UID 状态条与一条贯穿全宽的进度线。
   *
   * 序列沿用 STEPS 的节奏（每步点亮 1–2 行清单），终幕讲究"收得住"：
   *   八行全绿 → 停一拍 → 标题/清单/标尺/状态条分层退场 → 徽记落印 →
   *   WELCOME 交叉淡入 → 整片浅色场溶解回应用。
   * 全程不缩放、不失焦：全屏浅色上的模糊会显脏，硬切和模糊淡出正是
   * 上一版"结尾不自然"的来源。
   *
   * window.__DSH_STARTUP_PORTAL__ = false 可退回旧的 run() 开幕序列。
   * ══════════════════════════════════════════════════════════════════════ */
  var TERM_LINES = [
    '正在遍历员工级别矩阵',
    '正在启动员工效率监控系统',
    '正在挂载 RELINK 脑机链路',
    '正在装载曼德尔砖算力',
    '正在校准天网节点拓扑',
    '正在同步 ERAIS 资源配比',
    '每一秒，都在投资未来……',
    '请稍候，进一步需要时间……'
  ]
  /* 右下角的五大技术模块：逐步点亮，是这块屏的"硬实力"注脚 */
  var TERM_MODS = [
    ['RELINK', '脑机系统'],
    ['MANDELBRICK', '曼德尔砖'],
    ['ERAIS', '资源平衡'],
    ['SKYNET', '天网'],
    ['DARKSTAR', '暗星计划']
  ]
  /* 第 n 步结束时应该点亮的行数（STEPS 五步 → 八行） */
  /* 底部滚动播报：一条永远走不出去的内部频道，填住状态条上方的空带 */
  var TERM_TICKER = [
    'HAAVK GLOBAL INTERLINK TERMINAL',
    'NODE 04 / SHENZHEN RELAY',
    'ERAIS RESOURCE RATIO NOMINAL',
    'MANDELBRICK CACHE WARM',
    'SKYNET TOPOLOGY SYNCED',
    'DARKSTAR PROJECT · CLASSIFIED',
    'OPERATOR CLEARANCE LEVEL 4',
    'INFINITE INFORMATION'
  ]
  var TERM_REVEAL = [2, 4, 6, 7, 8]
  var TERM_UID = 'CN UID:38228093479085077899.202609240017'
  var TERM_MS = [38, 44, 51, 55, 55]
  /* 每行读完后右侧带出的读数：像"这条记录已经从磁盘里读出来了" */
  var TERM_READ = [
    '0x3F7A · 128', '0x5C21 · 096', '0x7A80 · 214', '0x1D9E · 064',
    '0x6B34 · 512', '0x2E07 · 032', '0xA4F1 · 001', '0xFF00 · 000'
  ]

  var portalEl = null
  function pq(sel) { return portalEl ? portalEl.querySelector(sel) : null }
  function pqAll(sel) { return portalEl ? portalEl.querySelectorAll(sel) : [] }

  /* 状态条右侧的信号塔（四格，参考图里是满格） */
  function svgSignal() {
    var ns = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 16 12')
    svg.setAttribute('width', '16')
    svg.setAttribute('height', '12')
    var hs = [4, 7, 10, 13]
    for (var i = 0; i < hs.length; i++) {
      var r = document.createElementNS(ns, 'rect')
      r.setAttribute('x', String(i * 4))
      r.setAttribute('y', String(12 - hs[i]))
      r.setAttribute('width', '2.6')
      r.setAttribute('height', String(hs[i]))
      r.setAttribute('rx', '0.6')
      r.setAttribute('fill', i < 3 ? 'rgba(35,98,175,0.55)' : 'rgba(35,98,175,0.28)')
      svg.appendChild(r)
    }
    return svg
  }

  /* 逐字拆解：每个字符带递增的 transition-delay，行点亮时字是一个一个浮出来的，
     读起来像"正在读取"而不是整行硬切 */
  function termChars(text, stagger, base) {
    var out = ''
    for (var i = 0; i < text.length; i++) {
      out += '<span class="dsu-t-c" style="transition-delay:' +
        Math.round(base + i * stagger) + 'ms">' + text.charAt(i) + '</span>'
    }
    return out
  }

  /* 确定性伪随机十六进制流（不用 Math.random，重放时长得一样） */
  function termStream(seed, n) {
    var s = ''
    var v = seed
    for (var i = 0; i < n; i++) {
      v = (v * 1103515245 + 12345) & 0x7fffffff
      var d = v % 16
      s += d < 10 ? String(d) : String.fromCharCode(87 + d)
      if (i % 7 === 6) s += ' '
    }
    return s
  }

  /* 多行数据流：一行一行往下滚，比一根横着缩着的长串更像"在读盘" */
  function termStreamLines(seed, lines, cols) {
    var out = ''
    for (var i = 0; i < lines; i++) {
      out += '<span>' + termStream(seed + i * 131, cols) + '</span>'
    }
    return out
  }

  function buildPortal() {
    portalEl = el('div', 'dsu-portal')

    var list = ''
    for (var i = 0; i < TERM_LINES.length; i++) {
      list += '<li class="dsu-t-line' + (i === TERM_LINES.length - 2 ? ' dsu-t-last' : '') + '">' +
        '<i class="dsu-t-dot"></i><span class="dsu-t-tx">' +
        termChars(TERM_LINES[i], 30, i % 2 ? 130 : 0) + '</span>' +
        '<i class="dsu-t-rd">' + TERM_READ[i] + '</i></li>'
    }
    /* HAAVK 字标逐字母升起 */
    var word = ''
    for (var w = 0; w < 5; w++) {
      word += '<span style="transition-delay:' + (240 + w * 90) + 'ms">' + 'HAAVK'.charAt(w) + '</span>'
    }
    var stream = termStreamLines(0x1a2b3c, 8, 44)
    var mods = ''
    for (var m = 0; m < TERM_MODS.length; m++) {
      mods += '<span class="dsu-t-mod"><i></i><b>' + TERM_MODS[m][0] +
        '</b><em>' + TERM_MODS[m][1] + '</em></span>'
    }

    /* 左侧波形：19 根竖条，每根错开的动画时长让它们不像"整齐的柱状图" */
    var wave = ''
    for (var b = 0; b < 19; b++) {
      wave += '<i style="animation-duration:' + (1500 + (b % 5) * 420) +
        'ms;animation-delay:' + (b * 70 % 900) + 'ms"></i>'
    }
    /* 右侧状态格：12 x 4，逐格错峰呼吸，读作"节点正在被轮询" */
    var cells = ''
    for (var c = 0; c < 48; c++) {
      cells += '<span style="animation-delay:' + ((c * 137) % 2600) + 'ms"></span>'
    }
    var ticker = TERM_TICKER.concat(TERM_TICKER).map(function (t) {
      return '<span>' + t + '</span>'
    }).join('')

    portalEl.innerHTML =
      '<div class="dsu-t-bg"></div>' +
      '<div class="dsu-t-grid"></div>' +
      '<div class="dsu-t-beam"></div>' +
      '<div class="dsu-t-ruler"></div>' +
      '<div class="dsu-t-stage">' +
      '<div class="dsu-t-sig-panel"><b>LINK SIGNAL</b><div class="dsu-t-wave">' + wave +
        '</div><em><span>RX 2.4Gb/s</span><span>LAT 12ms</span></em></div>' +
      '<div class="dsu-t-heat"><b>NODE MATRIX</b><i>' + cells + '</i></div>' +
      '<div class="dsu-t-ticker"><div>' + ticker + '</div></div>' +
      '<div class="dsu-t-tag bl">SKYNET NODE 04 · SECURE CHANNEL</div>' +
      '<div class="dsu-t-tag br">ERAIS LOAD 61% · LINK STABLE</div>' +
      '<div class="dsu-t-brand">' +
        '<div class="dsu-t-mark"><i class="dsu-t-scan"></i><i class="dsu-t-halo"></i>' +
          '<i class="dsu-t-glow"></i></div>' +
        '<div class="dsu-t-word">' + word + '</div>' +
      '</div>' +
      '<div class="dsu-t-panel">' +
        '<div class="dsu-t-title"><i></i><b>哈夫克全域互联终端</b><i></i></div>' +
        '<ul class="dsu-t-list">' + list + '</ul>' +
        '<div class="dsu-t-stream"><div class="dsu-t-flow">' + stream + stream + '</div></div>' +
        '<div class="dsu-t-mods">' + mods + '</div>' +
      '</div>' +
      '<div class="dsu-t-prog"><i></i></div>' +
      '<div class="dsu-t-bar">' +
        '<span class="dsu-t-count"></span>' +
        '<span class="dsu-t-ms">55ms</span>' +
        '<span class="dsu-t-uid">' + TERM_UID + '</span>' +
        '<span class="dsu-t-state"><b></b><i></i></span>' +
        '<span class="dsu-t-sig"></span>' +
        '<span class="dsu-t-foot"></span>' +
      '</div>' +
      '</div>' +
      '<div class="dsu-t-finale">' +
        '<svg class="dsu-t-dmark" viewBox="0 0 244 268" aria-hidden="true">' +
          '<path pathLength="1" fill-rule="evenodd" d="' + MARK_PATH + '"/>' +
        '</svg>' +
        '<div class="dsu-t-tick"><i></i><i></i><i></i><i></i></div>' +
        '<b class="dsu-t-f-top">HAAVK GLOBAL INTERLINK · SESSION 0001</b>' +
        '<b class="dsu-t-f-bot">CLEARANCE 4 · ALL CHANNELS NOMINAL</b>' +
        '<div class="dsu-t-hud">' +
          '<div class="dsu-t-hud-blk"><b>OPERATOR</b><i>HAAVK-01 / LV 4</i></div>' +
          '<div class="dsu-t-hud-blk"><b>SESSION</b><i>0001 · 55ms</i></div>' +
          '<div class="dsu-t-hud-blk"><b>NODES</b><i>04 / 04 ONLINE</i></div>' +
          '<div class="dsu-t-hud-blk"><b>CHANNELS</b><i>12 / 12 NOMINAL</i></div>' +
        '</div>' +
      '</div>' +
      '<div class="dsu-t-veil"></div>'

    pq('.dsu-t-mark').appendChild(svgMark())
    pq('.dsu-t-sig').appendChild(svgSignal())
    pq('.dsu-t-state b').textContent = '建立安全通道'
    pq('.dsu-t-state i').textContent = 'SECURE HANDSHAKE'
    var foot = pq('.dsu-t-foot')
    if (foot) foot.textContent = C.footer
    termCount(0, 'BOOT')

    root.appendChild(portalEl)
  }

  /* 点亮第 n 行（n 为累计行数）；最新点亮的那一行挂 dsu-live，
     行尾有点状光标在跳 —— 让人一眼看出"现在正读到这里" */
  function termReveal(n) {
    var lines = pqAll('.dsu-t-line')
    /* 一次点亮两行时也要错开 90ms：两行同时翻出来是"跳"，一行接一行才是"读" */
    var fresh = 0
    for (var i = 0; i < lines.length; i++) {
      if (i < n && !lines[i].classList.contains('dsu-on')) {
        lines[i].style.transitionDelay = (fresh * 90) + 'ms'
        fresh++
      } else if (i >= n) {
        lines[i].style.transitionDelay = ''
      }
      if (i < n) lines[i].classList.add('dsu-on')
      else lines[i].classList.remove('dsu-on')
      if (i < n) lines[i].classList.add('dsu-done')
      else lines[i].classList.remove('dsu-done')
      if (i === n - 1) lines[i].classList.add('dsu-live')
      else lines[i].classList.remove('dsu-live')
    }
  }

  /* 徽记：先描边勾出轮廓，落墨成实心，之后交给 CSS 的呼吸 */
  function termMark() {
    var mark = pq('.dsu-t-mark')
    if (!mark) return
    var path = mark.querySelector('path')
    var len = 0
    try { len = path && path.getTotalLength ? path.getTotalLength() : 0 } catch (e) { len = 0 }
    if (len) {
      mark.style.setProperty('--dsu-mark-len', String(Math.round(len)))
      mark.style.setProperty('--dsu-mark-speed', String(C.speed))
    }
    mark.classList.add('dsu-draw')
    return wait(1420).then(function () {
      if (finished || skipped) return
      /* 先落墨、后撤描边：两个类同时在的那 900ms 正是"渗进去"的过程。
         原来这里是 remove+add 同帧执行，所以线框到实心是一帧跳变 */
      mark.classList.add('dsu-ink')
      return wait(900)
    }).then(function () {
      if (finished || skipped) return
      mark.classList.remove('dsu-draw')
    })
  }

  /* 逐步点亮技术模块：第 n 步点亮前 n 个 */
  function termMods(n) {
    var items = pqAll('.dsu-t-mod')
    for (var i = 0; i < items.length; i++) {
      if (i < n) items[i].classList.add('dsu-on')
      else items[i].classList.remove('dsu-on')
    }
  }

  /* 换一段文案：旧字留一个残影往上飘走，新字从下浮上来。
     直接改 textContent 是"硬切"，一步一换、五步五下，就是用户说的"明显切换感" */
  function termSwapText(node, text) {
    if (!node) return
    /* 用缓存判断是否真的要换：原来读 node.textContent 会把所有子节点的文字拼起来，
       还得先清空再重建 —— 每次换字都触发一次强制同步布局 */
    if (node._dsuText === text) return
    node._dsuText = text
    if (!node.classList.contains('dsu-t-swap')) node.classList.add('dsu-t-swap')

    /* 旧的那一版不删，就地降级成残影自己飘走。
       注意要连"裸文本节点"一起收：buildPortal 初次填充用的是 textContent，
       留下的是文本节点而不是元素；只遍历 children 的话，这段旧字会一直占着
       流内位置，新字被挤到它后面 —— 状态条上就会出现两句话并排
       （实测「建立安全通道」+「开始读取权限」同屏）。 */
    var kids = []
    for (var i = 0; i < node.childNodes.length; i++) kids.push(node.childNodes[i])
    for (var k = 0; k < kids.length; k++) {
      var g = kids[k]
      if (g.nodeType === 3) {
        /* 文本节点没有 class，先包进一个残影 span 再让它飘走 */
        var wrap = el('span', 'dsu-t-ghost', g.nodeValue)
        node.insertBefore(wrap, g)
        node.removeChild(g)
        g = wrap
      } else {
        if (g.classList.contains('dsu-t-ghost')) continue
        g.classList.remove('dsu-t-live')
        /* 换动画名即可重播：不读 offsetWidth、不重建节点 */
        g.classList.add('dsu-t-ghost')
      }
      ;(function (ghost) {
        setTimeout(function () {
          if (ghost.parentNode) ghost.parentNode.removeChild(ghost)
        }, 470)
      })(g)
    }

    /* 新的一版永远是新建元素，动画天然从第一帧开始，不需要强制重排 */
    node.appendChild(el('span', 'dsu-t-live', text))
  }

  function termState(zh, en) {
    termSwapText(pq('.dsu-t-state b'), zh)
    termSwapText(pq('.dsu-t-state i'), en)
  }

  /* 状态条读数（[ 05 / 06 ] VERIFY）也走同一套交叉淡入 */
  function termCount(i, code) {
    var total = STEPS.length + 1
    termSwapText(pq('.dsu-t-count'),
      '[ ' + String(i).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') + ' ] ' + code)
  }

  var trickleTimer = null
  var trickleAt = 0
  var progShown = 0
  var progRaf = null

  /* 进度的"渗流"：两幕之间不停在死点，而是每隔一小段往前蹭一点，
     永远差最后一点点到目标 —— 看起来像真在等 I/O，而不是等定时器 */
  /* 进度条真正的动画：每帧朝目标值追，差值大时快、接近时慢（ease-out），
     所以任何一次 termProgress 都是"滑过去"而不是"跳过去" —— 步进间还有渗流
     在往前蹭，整条线一直在动，不会卡在死点等定时器 */
  function progPaint() {
    var bar = pq('.dsu-t-prog i')
    if (bar) bar.style.width = (progShown * 100).toFixed(2) + '%'
    var knob = pq('.dsu-t-prog')
    if (knob) knob.style.setProperty('--dsu-prog', (progShown * 100).toFixed(1) + '%')
  }

  function progStep() {
    progRaf = null
    if (finished || skipped) return
    var d = trickleAt - progShown
    if (d < 0.0004) { progShown = trickleAt; progPaint(); return }
    /* 追目标时只往上走：慢一点没关系，但绝不能往回缩 —— 进度条倒退最刺眼 */
    progShown = Math.min(trickleAt, progShown + Math.max(d * 0.16, 0.0012))
    progPaint()
    progRaf = requestAnimationFrame(progStep)
  }

  function progKick() {
    if (progRaf === null) progRaf = requestAnimationFrame(progStep)
  }

  function termTrickle(p) {
    if (trickleTimer) { clearInterval(trickleTimer); trickleTimer = null }
    trickleAt = p
    if (finished || skipped) return
    trickleTimer = setInterval(function () {
      if (finished || skipped || trickleAt >= 1) {
        if (trickleTimer) { clearInterval(trickleTimer); trickleTimer = null }
        return
      }
      /* 渗流有上限：只在这一幕的目标值附近蹭，不会窜到下一幕的目标之上，
         否则下一幕把目标往回设时进度条会倒退 */
      var cap = Math.min(1, trickleAt + 0.075)
      trickleAt = Math.min(cap, trickleAt + (1 - trickleAt) * 0.05)
      progKick()
    }, 380)
  }

  function termProgress(p) {
    if (trickleTimer) { clearInterval(trickleTimer); trickleTimer = null }
    /* 目标也只进不退 */
    trickleAt = Math.max(trickleAt, p)
    progKick()
  }

  /* 毫秒读数一路爬上去：38 → 44 → 51 → 55，中段逐帧递增，像在被测出来 */
  function termMsTo(target) {
    var msEl = pq('.dsu-t-ms')
    if (!msEl) return
    var from = msEl._v === undefined ? target : msEl._v
    msEl._v = target
    if (from === target) { msEl.textContent = target + 'ms'; return }
    var t0 = 0
    var step = Math.max(1, Math.round(Math.abs(target - from) / 6))
    var dir = target > from ? 1 : -1
    var cur = from
    var timer = setInterval(function () {
      if (finished || skipped) { clearInterval(timer); return }
      cur += dir * step
      t0++
      if ((dir > 0 && cur >= target) || (dir < 0 && cur <= target)) {
        cur = target
        clearInterval(timer)
      }
      msEl.textContent = cur + 'ms'
    }, 55)
  }

  /* 数据流换一批：每步重新滚一段，配合"正在读"的语义 */
  function termStreamSwap(seed) {
    var host = pq('.dsu-t-flow')
    if (!host) return
    var block = termStreamLines(seed, 8, 44)
    /* 不重启动画、也不量 offsetWidth：原来的写法每步都会强制同步布局，
       而且会让整条流"跳回顶部"，读起来就是一下明显的切换。
       内容总高不变，滚动动画自己接着走，换的是字，不是位置。 */
    host.innerHTML = block + block
  }

  /* 一步之内也不再"一声令下全变"：清单先亮、读数跟上、状态条最后落。
     错开 90~210ms 的几笔，眼球才有地方停，读起来是"推进"而不是"切屏" */
  function portalSteps() {
    var chain = Promise.resolve()
    STEPS.forEach(function (step, i) {
      chain = chain.then(function () {
        if (finished || skipped) return
        /* ① 清单与进度：最先动 */
        termReveal(TERM_REVEAL[i] || TERM_LINES.length)
        termProgress(step.progress)
        termTrickle(step.progress)
        setSlats(i + 1)
        audio.tick()
        return waitRaw(ms(90))
      })
      .then(function () {
        if (finished || skipped) return
        /* ② 数据流与读数：紧随其后 */
        termStreamSwap(0x1a2b3c + (i + 1) * 7919)
        termMsTo(TERM_MS[i] === undefined ? 55 : TERM_MS[i])
        termMods(Math.min(TERM_MODS.length, i + 1))
        return waitRaw(ms(210))
      })
      .then(function () {
        if (finished || skipped) return
        /* ③ 状态文案：最后收口，和前两笔错开，避免和清单同帧 */
        termState(step.zh, step.en)
        termCount(i + 1, step.badge)
        var rest = (silentPace() ? 1800 : step.hold + 620) - 300
        return waitRaw(ms(Math.max(300, rest)))
      })
    })
    return chain
  }

  function portalFinale() {
    if (finished || skipped) return Promise.resolve()
    /* 1) 最后一个状态：八行全绿、进度到顶、"核验通过" */
    termReveal(TERM_LINES.length)
    termProgress(1)
    if (trickleTimer) { clearInterval(trickleTimer); trickleTimer = null }
    termState('核验通过 · 会话已建立', 'SESSION ESTABLISHED')
    termCount(STEPS.length + 1, 'WELCOME')
    termMsTo(55)
    /* 终幕欢迎语，与旧 finale 共用同一条真声素材 */
    var welcome = voice.line(null, null, 'line-6')

    /* 2) 停一拍让人看清"全部完成"，再分层退场（不是一刀切） */
    return wait(680)
      .then(function () {
        audio.chime()
        ui.brand.classList.remove('dsu-in')
        ui.meta.classList.remove('dsu-in')
        ui.slats.classList.remove('dsu-in')
        ui.skip.classList.remove('dsu-in')
        portalEl.classList.add('dsu-settle')
        /* 终幕托底和退场同一拍启动：菱形坐标框一边自己描出来，
           一边接住正在退场的终端版面 —— 屏幕不会有"两件事同时在演"的拥挤感，
           也不会出现"清空后重新布景"的空档。 */
        portalEl.classList.add('dsu-finale')
        /* 水印与暗角在 portal 之前、收不到兄弟选择器，挂根上的状态类一起收 */
        root.classList.add('dsu-settling')
        return wait(900)
      })
      /* 3) 徽记先退干净，WELCOME 才进来 —— 两个 logo 同时挂在屏上
         会读成"重影"，这是上一版结尾发飘的主因，所以要严格错开 */
      /* 缩短"空场"：徽记退到七成时 WELCOME 就开始起，
         两者擦身而过而不是先后登场 —— 这一拍原本是整段里最空的地方 */
      .then(function () {
        portalEl.classList.add('dsu-brand-out')
        return wait(520)
      })
      .then(function () {
        ui.welcome.classList.add('dsu-in')
        return wait(900)
      })
      .then(function () { return welcome })
      /* 无声时不播欢迎语，这一口气补回来 */
      .then(function () { return waitRaw(silentPace() ? ms(1500) : ms(720)) })
      /* 4) 先洗白：一层同色雾把版心残影吃掉，WELCOME 留在雾里再呼吸半拍 */
      .then(function () {
        portalEl.classList.add('dsu-veil')
        return wait(760)
      })
      /* 5) WELCOME 极缓地往前推一点（1 → 1.03），像镜头慢慢收进它里面 */
      .then(function () {
        ui.welcome.classList.add('dsu-rise')
        return wait(900)
      })
      /* 6) 再化开：白场整体淡出回应用。留足 1100ms，谁都看不出它是"啪一下没了" */
      .then(function () {
        root.classList.add('dsu-void')
        return wait(1100)
      })
      .then(function () { finish() })
  }

  function runPortal() {
    if (window.__DSH_STARTUP_PORTAL__ === false) return run()
    root.classList.add('dsu-mode-portal')
    try {
      buildPortal()
    } catch (err) {
      /* 主题搭建失败就退回原开幕序列，绝不留黑屏 */
      try { console.warn('[dsh-startup] portal 搭建失败，退回原序列', err) } catch (e) { /* noop */ }
      root.classList.remove('dsu-mode-portal')
      if (portalEl && portalEl.parentNode) portalEl.parentNode.removeChild(portalEl)
      portalEl = null
      return run()
    }
    return Promise.resolve()
      .then(function () { return wait(160) })
      /* 底色、四角刻度、标尺先到位，徽记随后，标题与清单最后 */
      .then(function () {
        portalEl.classList.add('dsu-in')
        /* 原版 HUD 不丢：左上品牌块、版本行 + 实时时钟、阶段格，
           全部按终端配色复用，和深色状态条是同一套读数 */
        ui.brand.classList.add('dsu-in')
        if (C.allowSkip) ui.skip.classList.add('dsu-in')
        ui.meta.classList.add('dsu-in')
        ui.slats.classList.add('dsu-in')
        setSlats(0)
        /* 徽记自己有一条 1.4s 的描边动画，字标在它描到一半时逐字母升起 */
        return termMark()
      })
      .then(function () {
        var brand = pq('.dsu-t-brand')
        if (brand) brand.classList.add('dsu-word')
        return wait(340)
      })
      .then(function () {
        portalEl.classList.add('dsu-ready')
        setProgress(0.08)
        return wait(620)
      })
      .then(function () { return portalSteps() })
      .then(function () { return portalFinale() })
      .catch(function (err) {
        try { console.warn('[dsh-startup] portal 主题失败，直接收尾', err) } catch (e) { /* noop */ }
        finish()
      })
  }

  /* 锁滚动，动画期间不露出下面的应用 */
  document.documentElement.classList.add('dsu-lock')
  document.documentElement.style.overflow = 'hidden'
  if (document.body) document.body.style.overflow = 'hidden'
  setProgress(0.05)
  root.classList.remove('dsu-boot')

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { runPortal() })
  } else {
    runPortal()
  }
})()
