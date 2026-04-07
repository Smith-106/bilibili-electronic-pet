param(
  [ValidateSet('strict', 'real-chain')]
  [string]$Mode = 'strict',
  [string]$EnvFile = '.env.strict.local',
  [string]$BaseUrl = 'http://127.0.0.1:18000',
  [string]$ReportDir = '.artifacts/staging',
  [switch]$KeepRedis
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null

$repoRoot = $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'backend-ts'
$resolvedEnvFile = if ([IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $repoRoot $EnvFile }
$resolvedReportDir = if ([IO.Path]::IsPathRooted($ReportDir)) { $ReportDir } else { Join-Path $repoRoot $ReportDir }

function Show-Usage {
  @'
Usage:
  pwsh ./rehearse-local.ps1 [strict|real-chain] [-EnvFile .env.strict.local] [-BaseUrl http://127.0.0.1:18000]

Behavior:
  1. Builds backend-ts
  2. Starts docker-compose redis
  3. Starts local API with node --env-file=<env file>
  4. Runs staging-check in strict or real-chain mode
  5. Stops the API process and, unless -KeepRedis is set, stops redis

Notes:
  - .env.strict.local.example is a good starting point for strict local rehearsal.
  - real-chain requires a real native auth-capable runtime config; the strict-local example is not enough.
'@ | Write-Output
}

if ($args -contains '--help' -or $args -contains '-h') {
  Show-Usage
  exit 0
}

if (-not (Test-Path $resolvedEnvFile)) {
  throw "Env file not found: $resolvedEnvFile`nHint: copy .env.strict.local.example to .env.strict.local first."
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
