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

Examples:
  pwsh ./smoke.ps1 preflight --report .\preflight.json
  pwsh ./smoke.ps1 strict --base-url http://127.0.0.1:18000 --api-key $env:API_KEY
  pwsh ./smoke.ps1 real-chain --base-url $env:BASE_URL --api-key $env:API_KEY
'@ | Write-Output
}

if ($finalArgs.Count -gt 0) {
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
      $finalArgs = @('--preflight-only') + $tailArgs
    }
    'strict' {
      $finalArgs = @('--strict') + $tailArgs
    }
    'real-chain' {
      $finalArgs = @('--strict', '--pre-release-real-chain') + $tailArgs
    }
  }
}

& node $scriptPath @finalArgs
exit $LASTEXITCODE
