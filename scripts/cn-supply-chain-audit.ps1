Param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string[]]$AllowedImageRegistries = @("docker.io"),
  [string[]]$AllowedNpmHosts = @("registry.npmjs.org", "registry.npmmirror.com"),
  [switch]$FailOnUnknownImageRegistries,
  [switch]$FailOnUnknownNpmHosts
)

$ErrorActionPreference = "Stop"

function Get-NormalizedSet {
  param([string[]]$Items)
  $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($item in $Items) {
    if (-not [string]::IsNullOrWhiteSpace($item)) {
      [void]$set.Add($item.Trim())
    }
  }
  return $set
}

function Get-ImageRegistry {
  param([string]$ImageRef)

  if ([string]::IsNullOrWhiteSpace($ImageRef)) {
    return $null
  }

  $value = $ImageRef.Trim().Trim("'`"")
  if ($value -match ":-([^}]+)\}") {
    $value = $Matches[1]
  }
  if ($value -match "^\$\{[^}]+\}$") {
    return "<dynamic>"
  }

  $segments = $value.Split("/")
  if ($segments.Length -gt 1) {
    $first = $segments[0]
    if ($first -eq "localhost" -or $first.Contains(".") -or $first.Contains(":")) {
      return $first
    }
  }
  return "docker.io"
}

function Read-ComposeImageRegistries {
  param([string[]]$ComposePaths)

  $registries = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($path in $ComposePaths) {
    if (-not (Test-Path $path)) {
      continue
    }

    $lines = Get-Content -Path $path
    foreach ($line in $lines) {
      if ($line -match "^\s*image:\s*(.+?)\s*$") {
        $registry = Get-ImageRegistry -ImageRef $Matches[1]
        if (-not [string]::IsNullOrWhiteSpace($registry)) {
          [void]$registries.Add($registry)
        }
      }
    }
  }
  return $registries
}

function Read-NpmHosts {
  param([string]$PackageLockPath)

  $hosts = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  if (-not (Test-Path $PackageLockPath)) {
    return $hosts
  }

  $matches = Select-String -Path $PackageLockPath -Pattern '"resolved"\s*:\s*"([^"]+)"'
  foreach ($match in $matches) {
    $url = $match.Matches[0].Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($url)) {
      continue
    }
    try {
      $uri = [Uri]$url
      if (-not [string]::IsNullOrWhiteSpace($uri.Host)) {
        [void]$hosts.Add($uri.Host)
      }
    } catch {
      Write-Warning "Skip invalid resolved url: $url"
    }
  }
  return $hosts
}

$composePaths = @(
  (Join-Path $ProjectRoot "docker-compose.yml"),
  (Join-Path $ProjectRoot "docker-compose.cn.yml")
)

$imageRegistries = Read-ComposeImageRegistries -ComposePaths $composePaths
$npmHosts = Read-NpmHosts -PackageLockPath (Join-Path $ProjectRoot "frontend/package-lock.json")

$allowedImageSet = Get-NormalizedSet -Items $AllowedImageRegistries
$allowedNpmSet = Get-NormalizedSet -Items $AllowedNpmHosts

$unknownRegistries = @($imageRegistries | Where-Object { -not $allowedImageSet.Contains($_) } | Sort-Object -Unique)
$unknownNpmHosts = @($npmHosts | Where-Object { -not $allowedNpmSet.Contains($_) } | Sort-Object -Unique)

Write-Host "=== Supply Chain Audit (CN) ==="
Write-Host "Project root: $ProjectRoot"
Write-Host ""

Write-Host "[Docker image registries]"
if ($imageRegistries.Count -eq 0) {
  Write-Host "  (none found)"
} else {
  foreach ($registry in ($imageRegistries | Sort-Object)) {
    Write-Host "  - $registry"
  }
}
Write-Host ""

Write-Host "[NPM resolved hosts from package-lock.json]"
if ($npmHosts.Count -eq 0) {
  Write-Host "  (none found)"
} else {
  foreach ($npmHost in ($npmHosts | Sort-Object)) {
    Write-Host "  - $npmHost"
  }
}
Write-Host ""

if ($unknownRegistries.Count -gt 0) {
  Write-Warning "Unknown Docker registries: $($unknownRegistries -join ', ')"
}
if ($unknownNpmHosts.Count -gt 0) {
  Write-Warning "Unknown NPM hosts: $($unknownNpmHosts -join ', ')"
}

if ($FailOnUnknownImageRegistries -and $unknownRegistries.Count -gt 0) {
  Write-Error "Fail because unknown Docker registries were detected."
  exit 1
}
if ($FailOnUnknownNpmHosts -and $unknownNpmHosts.Count -gt 0) {
  Write-Error "Fail because unknown NPM hosts were detected."
  exit 1
}

Write-Host "Audit finished."
