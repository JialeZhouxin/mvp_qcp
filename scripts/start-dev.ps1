Param(
  [string]$RedisHost = "127.0.0.1",
  [int]$RedisPort = 6379
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "[1/4] 检查 Redis 连接..."
$tcp = New-Object Net.Sockets.TcpClient
try {
  $tcp.Connect($RedisHost, $RedisPort)
  Write-Host "Redis 可连接: $RedisHost`:$RedisPort"
}
catch {
  Write-Error "Redis 不可连接，请先启动本机 Redis 服务（$RedisHost`:$RedisPort）。"
  exit 1
}
finally {
  $tcp.Dispose()
}

Write-Host "[2/4] 启动后端 API..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/backend'; uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "[3/4] 启动 Celery Worker..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/backend'; uv run celery -A app.worker.celery_app:celery_app worker --loglevel=info --pool=solo"

Write-Host "[4/4] 启动前端..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/frontend'; npm run dev"

Write-Host "开发环境启动命令已下发，请检查新终端窗口日志。"
