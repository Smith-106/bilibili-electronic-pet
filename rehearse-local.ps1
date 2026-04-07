param(
  [ValidateSet('strict', 'real-chain')]
  [string]$Mode = 'strict',
  [string]$EnvFile = '',
  [string]$BaseUrl = 'http://127.0.0.1:18000',
  [string]$ReportDir = '.artifacts/staging',
  [switch]$KeepRedis
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null

$repoRoot = $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'backend-ts'
$defaultEnvFile = if ($EnvFile) { $EnvFile } elseif ($Mode -eq 'real-chain') { '.env.real-chain.local' } else { '.env.strict.local' }
$resolvedEnvFile = if ([IO.Path]::IsPathRooted($defaultEnvFile)) { $defaultEnvFile } else { Join-Path $repoRoot $defaultEnvFile }
$resolvedReportDir = if ([IO.Path]::IsPathRooted($ReportDir)) { $ReportDir } else { Join-Path $repoRoot $ReportDir }

function Show-Usage {
  @'
Usage:
  pwsh ./rehearse-local.ps1 [strict|real-chain] [-EnvFile <file>] [-BaseUrl http://127.0.0.1:18000]

Behavior:
  1. Builds backend-ts
  2. Starts docker-compose redis
  3. Starts local API with node --env-file=<env file>
  4. Runs staging-check in strict or real-chain mode
  5. Stops the API process and, unless -KeepRedis is set, stops redis

Notes:
  - strict defaults to .env.strict.local
  - real-chain defaults to .env.real-chain.local
  - .env.strict.local.example is a good starting point for strict local rehearsal.
  - .env.real-chain.local.example is a scaffold for native real-chain rehearsal, but placeholder values will not pass the auth probe.
'@ | Write-Output
}

if ($args -contains '--help' -or $args -contains '-h') {
  Show-Usage
  exit 0
}

if (-not (Test-Path $resolvedEnvFile)) {
  $hint = if ($Mode -eq 'real-chain') {
    'copy .env.real-chain.local.example to .env.real-chain.local first.'
  } else {
    'copy .env.strict.local.example to .env.strict.local first.'
  }
  throw "Env file not found: $resolvedEnvFile`nHint: $hint"
}

$envMap = @{}
foreach ($line in Get-Content -LiteralPath $resolvedEnvFile) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
  $pair = $trimmed -split '=', 2
  $name = $pair[0].Trim()
  $value = if ($pair.Count -gt 1) { $pair[1].Trim().Trim('"') } else { '' }
  $envMap[$name] = $value
}

$apiKey = [string]($envMap['API_KEY'] ?? '')
if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "API_KEY must be present in $resolvedEnvFile for strict or real-chain rehearsal."
}

if ($Mode -eq 'real-chain') {
  $requiredRealChain = @(
    'BILIBILI_ENABLED',
    'BILIBILI_PUBLISH_ENABLED',
    'BILIBILI_SESSDATA',
    'BILIBILI_BILI_JCT',
    'BILIBILI_BUVID3',
    'CREDENTIAL_ENCRYPTION_KEY'
  )
  $missing = @()
  $placeholder = @()
  foreach ($key in $requiredRealChain) {
    $value = [string]($envMap[$key] ?? '')
    if ([string]::IsNullOrWhiteSpace($value)) {
      $missing += $key
      continue
    }
    if ($value -match '^replace-with-' -or $value -match 'placeholder') {
      $placeholder += $key
    }
  }

  if ($envMap['BILIBILI_ENABLED'] -ne 'true' -or $envMap['BILIBILI_PUBLISH_ENABLED'] -ne 'true') {
    throw "real-chain rehearsal requires BILIBILI_ENABLED=true and BILIBILI_PUBLISH_ENABLED=true in $resolvedEnvFile."
  }
  if ($missing.Count -gt 0 -or $placeholder.Count -gt 0) {
    $parts = @()
    if ($missing.Count -gt 0) {
      $parts += "missing: $($missing -join ', ')"
    }
    if ($placeholder.Count -gt 0) {
      $parts += "placeholder values: $($placeholder -join ', ')"
    }
    throw "real-chain rehearsal requires real native credential inputs in $resolvedEnvFile ($($parts -join '; '))."
  }
}

New-Item -ItemType Directory -Force -Path $resolvedReportDir | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$reportPath = Join-Path $resolvedReportDir "$Mode-local-$timestamp.json"

$baseUri = [Uri]$BaseUrl
$port = $baseUri.Port
$hostName = $baseUri.Host

Write-Output "[rehearse-local] building backend"
& npm --prefix $backendRoot run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output "[rehearse-local] ensuring redis is available"
& docker compose up -d redis
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$tmpDir = Join-Path $env:TEMP 'bili-pet-rehearse-local'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$stdoutPath = Join-Path $tmpDir "$Mode-$timestamp-stdout.log"
$stderrPath = Join-Path $tmpDir "$Mode-$timestamp-stderr.log"

$nodeArgs = @("--env-file=$resolvedEnvFile", 'dist/index.js')
$process = $null

try {
  Write-Output "[rehearse-local] starting local API on $BaseUrl"
  $previousPort = $env:PORT
  $previousHost = $env:HOST
  $env:PORT = [string]$port
  $env:HOST = $hostName
  $process = Start-Process node -ArgumentList $nodeArgs -WorkingDirectory $backendRoot -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru

  $healthy = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -UseBasicParsing "$BaseUrl/health" -TimeoutSec 3
      if ($response.StatusCode -eq 200) {
        $healthy = $true
        break
      }
    } catch {
    }
  }

  if (-not $healthy) {
    $stderr = Get-Content -LiteralPath $stderrPath -ErrorAction SilentlyContinue | Out-String
    throw "Local API did not become healthy at $BaseUrl/health`n$stderr"
  }

  $checkArgs = @('--base-url', $BaseUrl, '--api-key', $apiKey, '--env-file', $resolvedEnvFile, '--report', $reportPath)
  if ($Mode -eq 'strict') {
    $checkArgs = @('--strict') + $checkArgs
  } else {
    $checkArgs = @('--strict', '--pre-release-real-chain') + $checkArgs
  }

  Write-Output "[rehearse-local] running staging-check ($Mode)"
  & node (Join-Path $backendRoot 'scripts/staging-check.mjs') @checkArgs
  $exitCode = $LASTEXITCODE
  Write-Output "[rehearse-local] report: $reportPath"
  exit $exitCode
}
finally {
  if ($null -ne $previousPort) {
    $env:PORT = $previousPort
  } else {
    Remove-Item env:PORT -ErrorAction SilentlyContinue
  }
  if ($null -ne $previousHost) {
    $env:HOST = $previousHost
  } else {
    Remove-Item env:HOST -ErrorAction SilentlyContinue
  }
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
  }
  if (-not $KeepRedis) {
    & docker compose stop redis | Out-Null
  }
}
