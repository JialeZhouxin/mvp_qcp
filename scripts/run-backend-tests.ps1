$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"

if (!(Test-Path $backend)) {
  Write-Error "backend 目录不存在: $backend"
  exit 1
}

Write-Host "进入 backend 目录: $backend"
Set-Location $backend

Write-Host "执行后端 smoke 测试..."
uv run pytest -q tests/test_mvp_smoke.py

if ($LASTEXITCODE -eq 0) {
  Write-Host "后端 smoke 测试通过。"
} else {
  Write-Error "后端 smoke 测试失败，退出码: $LASTEXITCODE"
  exit $LASTEXITCODE
}
