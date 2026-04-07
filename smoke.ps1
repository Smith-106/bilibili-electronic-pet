param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$scriptPath = Join-Path $PSScriptRoot 'backend-ts/scripts/staging-check.mjs'
$finalArgs = @($RemainingArgs)

function Show-Usage {
  @'
Usage:
  pwsh ./smoke.ps1 [preflight|strict|real-chain] [staging-check args...]

Modes:
  preflight   => --preflight-only
  strict      => --strict
  real-chain  => --strict --pre-release-real-chain

Report behavior:
  If mode is preflight/strict/real-chain and no --report is provided,
  smoke.ps1 auto-writes JSON evidence to:
    .\.artifacts\staging\<mode>-<UTC timestamp>.json
  Override directory via SMOKE_REPORT_DIR.

Examples:
  pwsh ./smoke.ps1 preflight --report .\preflight.json
  pwsh ./smoke.ps1 strict --base-url http://127.0.0.1:18000 --api-key $env:API_KEY
  pwsh ./smoke.ps1 real-chain --base-url $env:BASE_URL --api-key $env:API_KEY
'@ | Write-Output
}

if ($finalArgs.Count -gt 0) {
  $mode = $null
  $tailArgs = @()
  if ($finalArgs.Count -gt 1) {
    $tailArgs = @($finalArgs[1..($finalArgs.Count - 1)])
  }

  switch ($finalArgs[0]) {
    '-h' {
      Show-Usage
      exit 0
    }
    '--help' {
      Show-Usage
      exit 0
    }
    'preflight' {
      $mode = 'preflight'
      $finalArgs = @('--preflight-only') + $tailArgs
    }
    'strict' {
      $mode = 'strict'
      $finalArgs = @('--strict') + $tailArgs
    }
    'real-chain' {
      $mode = 'real-chain'
      $finalArgs = @('--strict', '--pre-release-real-chain') + $tailArgs
    }
  }

  $hasReportArg = $false
  foreach ($arg in $finalArgs) {
    if ($arg -eq '--report' -or $arg.StartsWith('--report=')) {
      $hasReportArg = $true
      break
    }
  }

  if ($mode -and -not $hasReportArg) {
    $reportDir = if ($env:SMOKE_REPORT_DIR) { $env:SMOKE_REPORT_DIR } else { Join-Path $PSScriptRoot '.artifacts/staging' }
    New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
    $timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
    $reportPath = Join-Path $reportDir "$mode-$timestamp.json"
    $finalArgs = $finalArgs + @('--report', $reportPath)
    Write-Output "[smoke] auto report path: $reportPath"
  }
}

& node $scriptPath @finalArgs
exit $LASTEXITCODE
