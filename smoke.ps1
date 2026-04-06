param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$scriptPath = Join-Path $PSScriptRoot 'backend-ts/scripts/staging-check.mjs'
& node $scriptPath @RemainingArgs
exit $LASTEXITCODE
