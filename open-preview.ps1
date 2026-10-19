#Requires -Version 5.1
<#
  dsh-haavk 离线预览（Windows）
  不装插件、不依赖 DSH，直接用浏览器打开仓库自带的预览页。
  用法：.\open-preview.ps1
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'

$here = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$page = Join-Path $here 'preview\index.html'

if (-not (Test-Path $page)) {
    Write-Host "[x] 找不到预览页: $page" -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '  dsh-haavk - 启动动画离线预览' -ForegroundColor Cyan
Write-Host '  ------------------------------------------------'
Write-Host "  预览页: $page"
Write-Host ''
Write-Host '  打开后:'
Write-Host '    1) 自动播放一遍完整的启动动画'
Write-Host '    2) 右上角控制台可改身份名称 / 权限等级 / 主题 / 速度'
Write-Host '    3) 第 1、2 步需要你点按钮或按 Enter 才会继续'
Write-Host '    4) 右上角 SKIP 或 Esc 可跳过; 点「设置面板预览」看 DSH 设置页里的样子'
Write-Host ''

Start-Process $page
exit 0
