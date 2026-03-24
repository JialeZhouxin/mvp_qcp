Param(
  [string]$RedisHost = "127.0.0.1",
  [int]$RedisPort = 6379,
  [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Remove-Item Env:PYTHONHOME -ErrorAction SilentlyContinue
Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue

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

function Assert-CommandExists {
  param([string]$CommandName)
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    Write-Error "Missing command: $CommandName"
    exit 1
  }
}

function Wait-RedisReady {
  param(
    [string]$TargetHost,
    [int]$Port,
    [int]$TimeoutSeconds = 8
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-TcpPort -TargetHost $TargetHost -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Try-StartRedis {
  param(
    [string]$TargetHost,
    [int]$Port
  )
  if (Test-TcpPort -TargetHost $TargetHost -Port $Port) {
    return $true
  }

  $serviceCandidates = @("Redis", "redis", "RedisServer", "redis-server")
  foreach ($serviceName in $serviceCandidates) {
    $svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if (-not $svc) {
      continue
    }
    if ($svc.Status -ne "Running") {
      Start-Service -Name $serviceName -ErrorAction SilentlyContinue
    }
    if (Wait-RedisReady -TargetHost $TargetHost -Port $Port) {
      Write-Host "Redis started by Windows service: $serviceName"
      return $true
    }
  }

  $redisServer = Get-Command "redis-server" -ErrorAction SilentlyContinue
  if ($redisServer) {
    Start-Process powershell -ArgumentList @(
      "-NoProfile",
      "-NoExit",
      "-Command",
      "redis-server --bind $TargetHost --port $Port"
    )
    if (Wait-RedisReady -TargetHost $TargetHost -Port $Port) {
      Write-Host "Redis started by redis-server command."
      return $true
    }
  }

  return $false
}

Write-Host "[0/7] Checking prerequisites..."
Assert-CommandExists -CommandName "uv"
Assert-CommandExists -CommandName "npm"

if (-not (Test-Path $backend)) {
  Write-Error "backend folder not found: $backend"
  exit 1
}
if (-not (Test-Path $frontend)) {
  Write-Error "frontend folder not found: $frontend"
  exit 1
}

Write-Host "[1/7] Checking Redis connectivity..."
if (-not (Test-TcpPort -TargetHost $RedisHost -Port $RedisPort)) {
  Write-Host "Redis is not reachable, trying to start Redis..."
  if (-not (Try-StartRedis -TargetHost $RedisHost -Port $RedisPort)) {
    Write-Error "Redis startup failed. Ensure Redis service or redis-server is available."
    exit 1
  }
}
Write-Host "Redis is reachable: $RedisHost`:$RedisPort"

Write-Host "[2/7] Checking backend Python version (must be 3.11)..."
Push-Location $backend
try {
  uv run python -c "import sys; assert sys.version_info[:2] == (3, 11), f'Expected 3.11, got {sys.version}'"
} catch {
  Write-Error "Backend Python is not 3.11. Recreate venv: uv venv --python 3.11"
  Pop-Location
  exit 1
}
Pop-Location

Write-Host "[3/7] Checking backend dependencies..."
Push-Location $backend
try {
  uv run python -c "import fastapi, sqlmodel, redis, celery, qibo, docker, requests; print('backend deps ok')"
} catch {
  if ($InstallDeps) {
    Write-Host "Installing backend dependencies..."
    uv pip install -r requirements.txt
    uv run python -c "import fastapi, sqlmodel, redis, celery, qibo, docker, requests; print('backend deps ok')"
  } else {
    Write-Error "Backend dependencies missing. Run: cd `"$backend`"; uv pip install -r requirements.txt"
    Pop-Location
    exit 1
  }
}
Pop-Location

Write-Host "[4/7] Checking frontend dependencies..."
if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
  if ($InstallDeps) {
    Push-Location $frontend
    try {
      npm install
    } finally {
      Pop-Location
    }
  } else {
    Write-Error "frontend/node_modules not found. Run: cd `"$frontend`"; npm install"
    exit 1
  }
}

Write-Host "[5/7] Starting backend API..."
Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-NoExit",
  "-Command",
  "$env:EXECUTION_BACKEND='local'; cd `"$backend`"; uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

Write-Host "[6/7] Starting Celery worker..."
Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-NoExit",
  "-Command",
  "$env:EXECUTION_BACKEND='local'; cd `"$backend`"; uv run celery -A app.worker.celery_app:celery_app worker --loglevel=info --pool=solo"
)

Write-Host "[7/7] Starting frontend..."
Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-NoExit",
  "-Command",
  "cd `"$frontend`"; npm run dev"
)

Write-Host "All start commands dispatched. Local host mode uses EXECUTION_BACKEND=local; Docker Compose keeps EXECUTION_BACKEND=docker."
Write-Host "Use scripts/dev-health-check.ps1 to verify runtime health."
