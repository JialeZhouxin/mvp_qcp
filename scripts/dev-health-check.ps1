Param(
  [string]$RedisHost = "127.0.0.1",
  [int]$RedisPort = 6379,
  [string]$ApiBase = "http://127.0.0.1:8000",
  [string]$FrontendBase = "http://127.0.0.1:5173",
  [switch]$Deep,
  [switch]$Docker
)

$ErrorActionPreference = "Stop"

function Test-TcpPort {
  param(
    [string]$TargetHost,
    [int]$Port
  )
  $tcp = New-Object Net.Sockets.TcpClient
  try {
    $tcp.Connect($TargetHost, $Port)
    return $true
  } catch {
    return $false
  } finally {
    $tcp.Dispose()
  }
}

function Assert-Ok {
  param(
    [bool]$Condition,
    [string]$OkMessage,
    [string]$FailMessage
  )
  if ($Condition) {
    Write-Host "OK  $OkMessage"
    return
  }
  Write-Error "FAIL $FailMessage"
  exit 1
}

function Assert-DockerComposeServices {
  param([string[]]$RequiredServices)

  $runningOutput = docker compose ps --services --filter status=running 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "FAIL docker compose is not available or the compose project is not running."
    exit 1
  }

  $runningServices = @($runningOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  foreach ($service in $RequiredServices) {
    if ($runningServices -notcontains $service) {
      Write-Error "FAIL docker compose service is not running: $service"
      exit 1
    }
  }

  Write-Host "OK  docker compose services running: $($RequiredServices -join ', ')"
}

if ($Docker) {
  Write-Host "[0/4] Checking Docker Compose services..."
  Assert-DockerComposeServices -RequiredServices @("redis", "backend", "worker", "frontend")
}

Write-Host "[1/4] Checking Redis..."
Assert-Ok -Condition (Test-TcpPort -TargetHost $RedisHost -Port $RedisPort) `
  -OkMessage "Redis reachable at $RedisHost`:$RedisPort" `
  -FailMessage "Redis not reachable at $RedisHost`:$RedisPort"

Write-Host "[2/4] Checking API health endpoint..."
try {
  $apiResp = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/health" -TimeoutSec 6
  Assert-Ok -Condition ($apiResp.status -eq "ok") `
    -OkMessage "API health is ok at $ApiBase/api/health" `
    -FailMessage "API health response is unexpected"
} catch {
  Write-Error "FAIL API unreachable: $ApiBase/api/health"
  exit 1
}

Write-Host "[3/4] Checking frontend endpoint..."
try {
  $frontResp = Invoke-WebRequest -Method Get -Uri $FrontendBase -TimeoutSec 6
  Assert-Ok -Condition ($frontResp.StatusCode -ge 200 -and $frontResp.StatusCode -lt 400) `
    -OkMessage "Frontend reachable at $FrontendBase" `
    -FailMessage "Frontend status code: $($frontResp.StatusCode)"
} catch {
  Write-Error "FAIL Frontend unreachable: $FrontendBase"
  exit 1
}

Write-Host "[4/4] Checking API auth+task contract (optional)..."
if (-not $Deep) {
  Write-Host "SKIP Use -Deep to run register/login/task submit/status contract check."
  Write-Host "Health check passed."
  exit 0
}

$username = "health_" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$password = "pass123456"

try {
  $registerBody = @{ username = $username; password = $password } | ConvertTo-Json
  $null = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/auth/register" -Body $registerBody -ContentType "application/json" -TimeoutSec 10

  $loginBody = @{ username = $username; password = $password } | ConvertTo-Json
  $loginResp = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/auth/login" -Body $loginBody -ContentType "application/json" -TimeoutSec 10
  $token = $loginResp.access_token
  Assert-Ok -Condition (-not [string]::IsNullOrWhiteSpace($token)) `
    -OkMessage "Login token acquired" `
    -FailMessage "Login token missing"

  $headers = @{ Authorization = "Bearer $token" }
  $code = "def main():`n    return {'counts': {'00': 2, '11': 2}}"
  $submitBody = @{ code = $code } | ConvertTo-Json
  $submitResp = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/tasks/submit" -Headers $headers -Body $submitBody -ContentType "application/json" -TimeoutSec 10

  $taskId = $submitResp.task_id
  Assert-Ok -Condition ($taskId -gt 0) `
    -OkMessage "Task submitted: id=$taskId" `
    -FailMessage "Task submit response invalid"

  $statusResp = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/tasks/$taskId" -Headers $headers -TimeoutSec 10
  Assert-Ok -Condition (-not [string]::IsNullOrWhiteSpace($statusResp.status)) `
    -OkMessage "Task status returned: $($statusResp.status)" `
    -FailMessage "Task status missing"
} catch {
  Write-Error "FAIL Deep check failed: $($_.Exception.Message)"
  exit 1
}

Write-Host "Health check passed."
