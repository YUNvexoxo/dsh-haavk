#Requires -Version 5.1
<#
  dsh-haavk 安装脚本（Windows · Windows PowerShell 5.1 / PowerShell 7 均可）

  用法（在解压后的插件目录里）：
    .\install.ps1                     自动检测 web / desktop profile 并安装
    .\install.ps1 -Profile web        只装 web profile
    .\install.ps1 -Profile desktop    只装 desktop profile（桌面端需完全退出）
    .\install.ps1 -Pkg .\dsh-haavk-1.8.0.tgz   指定要安装的包

  说明：
    · 宿主 DSH 需要有全局 `dsh` 命令：npm i -g @deepseek-ai/dsh
    · 桌面端（DeepSeek Harness Desktop）装插件前请**完全退出**，profile 加锁期间装不进去
    · 检测到的 profile 目录默认在 %USERPROFILE%\.dsh\profiles\，可用 DSH_HOME 覆盖
#>
[CmdletBinding()]
param(
    [ValidateSet('auto', 'web', 'desktop')]
    [string]$Profile = 'auto',

    [string]$Pkg = ''
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Write-Head($text) {
    Write-Host ''
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
}
function Write-Step($text) { Write-Host $text -ForegroundColor Gray }
function Write-Ok($text)   { Write-Host "      > $text" -ForegroundColor Green }
function Write-Bad($text)  { Write-Host "      > $text" -ForegroundColor Yellow }

$here = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
Write-Head 'dsh-haavk 安装'
Write-Step "  包目录：$here"

# ── 1. 找待安装的包 ──────────────────────────────────────────────────────────
if (-not $Pkg) {
    if (Test-Path (Join-Path $here 'package.json')) {
        $Pkg = $here
    } elseif (Test-Path (Join-Path $here 'plugin\package.json')) {
        $Pkg = Join-Path $here 'plugin'
    } else {
        $tgz = Get-ChildItem -Path $here -Filter '*.tgz' -File -ErrorAction SilentlyContinue |
               Sort-Object Name -Descending | Select-Object -First 1
        if ($tgz) { $Pkg = $tgz.FullName }
    }
}
if (-not $Pkg -or -not (Test-Path $Pkg)) {
    Write-Host '[x] 在当前目录里找不到 package.json / plugin\package.json / *.tgz' -ForegroundColor Red
    Write-Step '    把这个脚本放在解压后的插件目录根（和 package.json 同级）再跑，'
    Write-Step '    或者用 -Pkg <路径> 明确指定。'
    exit 1
}
Write-Step "[1/3] 待安装的包：$Pkg"

# ── 2. 找 dsh ────────────────────────────────────────────────────────────────
$dsh = Get-Command dsh -ErrorAction SilentlyContinue
if (-not $dsh) {
    Write-Host '[x] PATH 里找不到 dsh 命令。' -ForegroundColor Red
    Write-Step '    先装一次宿主：npm i -g @deepseek-ai/dsh'
    Write-Step '    （桌面端用户装它只是为了拿 plugin 子命令，插件仍然装进桌面端的 profile）'
    exit 1
}
Write-Step "[2/3] dsh：$($dsh.Source)"

# ── 3. 检测 profile ──────────────────────────────────────────────────────────
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$has = @{
    web     = Test-Path (Join-Path $dshHome 'profiles\web\package.json')
    desktop = Test-Path (Join-Path $dshHome 'profiles\desktop\package.json')
}

$targets = switch ($Profile) {
    'web'     { @('web') }
    'desktop' { @('desktop') }
    default   { @('web', 'desktop') | Where-Object { $has[$_] } }
}
if (-not $targets) {
    Write-Host "[x] 在 $dshHome\profiles 下没有检测到已初始化的 profile。" -ForegroundColor Red
    Write-Step '    web 用户先跑一次 `dsh web`；桌面端用户先打开一次桌面端再退出。'
    exit 1
}
Write-Step "[3/3] 目标 profile：$($targets -join ', ')  （DSH_HOME=$dshHome）"

$failed = @()
foreach ($t in $targets) {
    Write-Host ''
    Write-Step "--> 安装到 $t profile ..."
    & dsh plugin --profile $t add $Pkg
    if ($LASTEXITCODE -ne 0) {
        $failed += $t
        Write-Bad "$t profile 安装失败，看上面的报错。"
        if ($t -eq 'desktop') { Write-Bad '桌面端请完全退出后再试。' }
        else { Write-Bad '常见原因：插件已装过（先 remove 再装）。' }
    } else {
        Write-Ok "$t profile 安装完成"
    }
}

Write-Head '装完了，接下来'
if ($targets -contains 'web') {
    Write-Step '  web     ：重启 dsh web（关掉启动器窗口再重新双击），刷新页面即可看到启动动画。'
}
if ($targets -contains 'desktop') {
    Write-Step '  desktop ：重新打开 DeepSeek Harness Desktop，点开任意对话即可看到启动动画。'
}
Write-Step ''
Write-Step '  设置页里会多出一项「启动动画」，身份名称、权限等级、配色、速度、语音都能改。'
Write-Step '  卸载：dsh plugin --profile web remove dsh-haavk'
Write-Step '        dsh plugin --profile desktop remove dsh-haavk'
Write-Host ''
if ($failed.Count -gt 0) { exit 1 }
exit 0
