Param(
  [string]$RedisHost = "127.0.0.1",
  [int]$RedisPort = 6379,
  [string]$ApiBase = "http://127.0.0.1:8000",
  [string]$FrontendBase = "http://127.0.0.1:5173"
)

$ErrorActionPreference = "Stop"

function Test-TcpPort {
  param([string]$Host,[int]$Port)
  $tcp = New-Object Net.Sockets.TcpClient
  try {
    $tcp.Connect($Host, $Port)
    return $true
  } catch {
    return $false
  } finally {
    $tcp.Dispose()
  }
}

Write-Host "[1/3] 检查 Redis 端口..."
if (Test-TcpPort -Host $RedisHost -Port $RedisPort) {
  Write-Host "OK Redis 可达: $RedisHost`:$RedisPort"
} else {
  Write-Error "FAIL Redis 不可达: $RedisHost`:$RedisPort"
  exit 1
}

Write-Host "[2/3] 检查 API 健康接口..."
try {
  $apiResp = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/health" -TimeoutSec 5
  if ($apiResp.status -eq "ok") {
    Write-Host "OK API 健康检查通过"
  } else {
    Write-Error "FAIL API 健康状态异常"
    exit 1
  }
} catch {
  Write-Error "FAIL API 不可访问: $ApiBase/api/health"
  exit 1
}

Write-Host "[3/3] 检查前端端口..."
try {
  $frontResp = Invoke-WebRequest -Method Get -Uri $FrontendBase -TimeoutSec 5
  if ($frontResp.StatusCode -ge 200 -and $frontResp.StatusCode -lt 400) {
    Write-Host "OK 前端可访问: $FrontendBase"
  } else {
    Write-Error "FAIL 前端响应异常: $($frontResp.StatusCode)"
    exit 1
  }
} catch {
  Write-Error "FAIL 前端不可访问: $FrontendBase"
  exit 1
}

Write-Host "健康检查全部通过。"
