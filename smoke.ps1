param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$scriptPath = Join-Path $scriptRoot 'backend-ts/scripts/staging-check.mjs'
$finalArgs = @($RemainingArgs)

function Show-Usage {
  @'
Usage:
  pwsh ./smoke.ps1 [preflight|expanded-preflight|strict|real-chain|qq-onebot|qq-e2e] [args...]

Modes:
  preflight   => --preflight-only
  expanded-preflight => --preflight-only --expanded-scope-trial
  strict      => --strict
  real-chain  => --strict --pre-release-real-chain
  qq-onebot   => npm --prefix qq-sidecar run smoke:onebot -- [--report <path>]
  qq-e2e      => npm --prefix backend-ts run smoke:qq-sidecar -- [--report <path>]

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
    'expanded-preflight' {
      $mode = 'expanded-preflight'
      $finalArgs = @('--preflight-only', '--expanded-scope-trial') + $tailArgs
    }
    'strict' {
      $mode = 'strict'
      $finalArgs = @('--strict') + $tailArgs
    }
    'real-chain' {
      $mode = 'real-chain'
      $finalArgs = @('--strict', '--pre-release-real-chain') + $tailArgs
    }
    'qq-onebot' {
      $tail = if ($finalArgs.Count -gt 1) { @($finalArgs[1..($finalArgs.Count - 1)]) } else { @() }
      $hasReport = $false
      foreach ($arg in $tail) {
        if ($arg -eq '--report' -or $arg.StartsWith('--report=')) {
          $hasReport = $true
          break
        }
      }
      if (-not $hasReport) {
        $reportDir = if ($env:SMOKE_REPORT_DIR) { $env:SMOKE_REPORT_DIR } else { Join-Path $scriptRoot '.artifacts/staging' }
        New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
        $timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
        $reportPath = Join-Path $reportDir "qq-onebot-$timestamp.json"
        $tail = $tail + @('--report', $reportPath)
        Write-Output "[smoke] auto report path: $reportPath"
      }
      & npm --prefix (Join-Path $scriptRoot 'qq-sidecar') run smoke:onebot -- @tail
      exit $LASTEXITCODE
    }
    'qq-e2e' {
      $tail = if ($finalArgs.Count -gt 1) { @($finalArgs[1..($finalArgs.Count - 1)]) } else { @() }
      $hasReport = $false
      foreach ($arg in $tail) {
        if ($arg -eq '--report' -or $arg.StartsWith('--report=')) {
          $hasReport = $true
          break
        }
      }
      if (-not $hasReport) {
        $reportDir = if ($env:SMOKE_REPORT_DIR) { $env:SMOKE_REPORT_DIR } else { Join-Path $scriptRoot '.artifacts/staging' }
        New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
        $timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
        $reportPath = Join-Path $reportDir "qq-e2e-$timestamp.json"
        $tail = $tail + @('--report', $reportPath)
        Write-Output "[smoke] auto report path: $reportPath"
      }
      & npm --prefix (Join-Path $scriptRoot 'backend-ts') run smoke:qq-sidecar -- @tail
      exit $LASTEXITCODE
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
    $reportDir = if ($env:SMOKE_REPORT_DIR) { $env:SMOKE_REPORT_DIR } else { Join-Path $scriptRoot '.artifacts/staging' }
    New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
    $timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
    $reportPath = Join-Path $reportDir "$mode-$timestamp.json"
    $finalArgs = $finalArgs + @('--report', $reportPath)
    Write-Output "[smoke] auto report path: $reportPath"
  }
}

& node $scriptPath @finalArgs
exit $LASTEXITCODE
