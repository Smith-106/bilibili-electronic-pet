param(
  [string]$KeyPath = "C:\Users\32852\Desktop\服务器\azure\ssh-key-2026-02-10.key",
  [string]$User = "azureuser",
  [string]$RemoteHost = "20.194.7.31",
  [string]$RemoteAppDir = "/opt/bilibili-electronic-pet",
  [bool]$VerifyPublic = $true
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = "Stop"

function Invoke-CurlText {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $fullArgs = @('--retry', '3', '--retry-all-errors', '--connect-timeout', '10') + $Arguments
  $output = & curl.exe @fullArgs
  if ($LASTEXITCODE -ne 0) {
    throw "curl failed: $([string]::Join(' ', $Arguments))"
  }
  return $output
}

$remote = "$User@$RemoteHost"
$tmpKey = Join-Path $env:TEMP ("bili-pet-status-key-" + [guid]::NewGuid().ToString("N"))
Copy-Item -LiteralPath $KeyPath -Destination $tmpKey -Force
icacls $tmpKey /inheritance:r | Out-Null
icacls $tmpKey /grant:r "$env:USERNAME`:(F)" | Out-Null

try {
  $remoteScript = @"
set -euo pipefail
echo "== containers =="
sudo -n docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}' | grep '^bilibili-electronic-pet_' || true
echo "== health =="
sudo -n docker inspect --format '{{.Name}}|{{.Config.Image}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' bilibili-electronic-pet_api_1 bilibili-electronic-pet_worker_1 2>/dev/null || true
echo "== redacted env =="
for key in PUBLISHER_WEBHOOK_URL PUBLISHER_WEBHOOK_TOKEN PLATFORM_DOUYIN_ENABLED PLATFORM_DOUYIN_WEBHOOK_URL PLATFORM_DOUYIN_WEBHOOK_TOKEN PLATFORM_DOUYIN_PUBLISH_SOURCE; do
  if sudo -n grep -q "^${key}=" /etc/bilibili-pet/pre-release.env 2>/dev/null; then
    echo "${key}=present"
  else
    echo "${key}=absent"
  fi
done
echo "== deploy files =="
ls -l $RemoteAppDir/docker-compose.deploy*.yml 2>/dev/null || true
echo "== swap =="
cat /proc/swaps 2>/dev/null || true
"@

  Write-Output "[deploy-status] remote runtime"
  $remoteOutput = & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $remote $remoteScript
  if ($LASTEXITCODE -ne 0) {
    throw "remote status check failed"
  }
  $remoteOutput | Write-Output

  if ($VerifyPublic) {
    Write-Output "[deploy-status] public endpoints"
    $bust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $adminHtml = Invoke-CurlText @('-fsSL', '-H', 'Cache-Control: no-cache', '-H', 'Pragma: no-cache', "https://pet.nikoniko.tech/admin?bust=$bust")
    $asset = $adminHtml | Select-String -Pattern '/assets/index-[A-Za-z0-9_-]+\.js' -AllMatches | ForEach-Object { $_.Matches.Value } | Select-Object -First 1
    if (-not $asset) {
      throw "public admin asset not found"
    }

    $health = Invoke-CurlText @('-fsS', 'https://pet.nikoniko.tech/health')
    $readiness = Invoke-CurlText @('-fsS', 'https://pet.nikoniko.tech/readiness')
    $readinessObj = $readiness | ConvertFrom-Json

    Write-Output "admin_asset=$asset"
    Write-Output "health=$health"
    Write-Output ("readiness_ready={0} foundation_ready={1} delivery_ready={2}" -f $readinessObj.ready, $readinessObj.foundation_ready, $readinessObj.delivery_ready)
    if ($null -ne $readinessObj.product_ready) {
      Write-Output ("product_ready={0}" -f $readinessObj.product_ready)
    }
    if ($readinessObj.product_blockers) {
      Write-Output ("product_blockers={0}" -f (($readinessObj.product_blockers | ForEach-Object { $_ }) -join ';'))
    }

    $effectiveMode = $null
    if ($readinessObj.bilibili_diagnostics -and $readinessObj.bilibili_diagnostics.effective_publish_mode) {
      $effectiveMode = $readinessObj.bilibili_diagnostics.effective_publish_mode
    } elseif ($readinessObj.delivery_signals -and $readinessObj.delivery_signals.effective_publish_mode) {
      $effectiveMode = $readinessObj.delivery_signals.effective_publish_mode
    }
    if ($effectiveMode) {
      Write-Output "effective_publish_mode=$effectiveMode"
    }
  }
} finally {
  if (Test-Path $tmpKey) {
    Remove-Item -LiteralPath $tmpKey -Force
  }
}
