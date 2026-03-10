Param(
  [string]$ExpectedPython = "3.11",
  [string]$RedisHost = "127.0.0.1",
  [int]$RedisPort = 6379,
  [string]$ApiBase = "http://127.0.0.1:8000",
  [string]$FrontendBase = "http://127.0.0.1:5173",
  [switch]$SkipHealth
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$uvCacheDir = Join-Path $backend ".uv-cache"
$rootPyVersionFile = Join-Path $root ".python-version"
$backendPyVersionFile = Join-Path $backend ".python-version"

function Assert-CommandExists {
  param([string]$CommandName)
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Missing command: $CommandName"
  }
}

function Assert-VersionFile {
  param([string]$FilePath, [string]$Expected)
  if (-not (Test-Path $FilePath)) {
    throw "Version file not found: $FilePath"
  }
  $actual = (Get-Content $FilePath -Raw).Trim()
  if ($actual -ne $Expected) {
    throw "Version mismatch in $FilePath. expected=$Expected actual=$actual"
  }
}

Write-Host "[1/4] Checking required commands..."
Assert-CommandExists -CommandName "uv"
Assert-CommandExists -CommandName "npm"

Write-Host "[2/4] Checking Python version lock files..."
Assert-VersionFile -FilePath $rootPyVersionFile -Expected $ExpectedPython
Assert-VersionFile -FilePath $backendPyVersionFile -Expected $ExpectedPython

Write-Host "[3/4] Checking backend runtime Python version..."
Push-Location $backend
try {
  if (-not (Test-Path $uvCacheDir)) {
    New-Item -ItemType Directory -Path $uvCacheDir | Out-Null
  }
  $env:UV_CACHE_DIR = $uvCacheDir
  uv run python -c "import sys; assert sys.version_info[:2] == (3, 11), f'Expected 3.11, got {sys.version}'"
  if ($LASTEXITCODE -ne 0) {
    throw "uv runtime check failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "[4/4] Running health baseline..."
if ($SkipHealth) {
  Write-Host "SKIP Health checks skipped by -SkipHealth"
  exit 0
}

$healthScript = Join-Path $PSScriptRoot "dev-health-check.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File $healthScript -RedisHost $RedisHost -RedisPort $RedisPort -ApiBase $ApiBase -FrontendBase $FrontendBase -Deep
if ($LASTEXITCODE -ne 0) {
  throw "health baseline failed with exit code $LASTEXITCODE"
}

Write-Host "Daily baseline passed."
