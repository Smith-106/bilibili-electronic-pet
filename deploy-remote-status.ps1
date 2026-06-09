param(
  [string]$KeyPath = $env:BILI_PET_DEPLOY_KEY_PATH,
  [string]$User = $env:BILI_PET_DEPLOY_USER,
  [string]$RemoteHost = $env:BILI_PET_DEPLOY_HOST,
  [string]$RemoteAppDir = "/opt/bilibili-electronic-pet",
  [string]$PublicBaseUrl = $env:BILI_PET_PUBLIC_BASE_URL,
  [bool]$VerifyPublic = $true
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = "Stop"

function Assert-RequiredValue {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [AllowEmptyString()][string]$Value,
    [Parameter(Mandatory = $true)][string]$Hint
  )

  if (-not $Value) {
    throw "$Name is required. $Hint"
  }
}

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

function Invoke-RemoteScript {
  param(
    [Parameter(Mandatory = $true)][string]$Script
  )

  $normalizedScript = $Script -replace "`r`n", "`n"
  $localScript = Join-Path $env:TEMP ("bili-pet-remote-" + [guid]::NewGuid().ToString("N") + ".sh")
  $remoteScriptPath = "/tmp/bili-pet-remote-$([guid]::NewGuid().ToString("N")).sh"
  $sshArgs = @('-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=30', '-i', $tmpKey)
  try {
    [System.IO.File]::WriteAllText($localScript, $normalizedScript, [Text.UTF8Encoding]::new($false))

    $uploaded = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
      & scp @sshArgs $localScript "${remote}:$remoteScriptPath"
      if ($LASTEXITCODE -eq 0) {
        $uploaded = $true
        break
      }
      if ($attempt -lt 3) {
        Start-Sleep -Seconds (5 * $attempt)
      }
    }
    if (-not $uploaded) {
      throw "remote script upload failed"
    }

    & ssh @sshArgs $remote "bash $remoteScriptPath; code=`$?; rm -f $remoteScriptPath; exit `$code"
  } finally {
    if (Test-Path $localScript) {
      Remove-Item -LiteralPath $localScript -Force
    }
  }
}

Assert-RequiredValue -Name 'KeyPath' -Value $KeyPath -Hint 'Pass -KeyPath or set BILI_PET_DEPLOY_KEY_PATH.'
Assert-RequiredValue -Name 'User' -Value $User -Hint 'Pass -User or set BILI_PET_DEPLOY_USER.'
Assert-RequiredValue -Name 'RemoteHost' -Value $RemoteHost -Hint 'Pass -RemoteHost or set BILI_PET_DEPLOY_HOST.'
if ($VerifyPublic) {
  Assert-RequiredValue -Name 'PublicBaseUrl' -Value $PublicBaseUrl -Hint 'Pass -PublicBaseUrl or set BILI_PET_PUBLIC_BASE_URL.'
  $PublicBaseUrl = $PublicBaseUrl.TrimEnd('/')
}
if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "KeyPath does not exist: $KeyPath"
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
for key in API_KEY COMMENT_INGRESS_TOKEN GATEWAY_TOKEN GATEWAY_HMAC_SECRET LLM_FALLBACK_TO_MOCK NODE_ENV PUBLISHER_WEBHOOK_URL PUBLISHER_WEBHOOK_TOKEN PLATFORM_DOUYIN_ENABLED PLATFORM_DOUYIN_WEBHOOK_URL PLATFORM_DOUYIN_WEBHOOK_TOKEN PLATFORM_DOUYIN_PUBLISH_SOURCE; do
  if sudo -n grep -q "^`${key}=" /etc/bilibili-pet/pre-release.env 2>/dev/null; then
    echo "`${key}=present"
  else
    echo "`${key}=absent"
  fi
done
echo "== deploy files =="
ls -l $RemoteAppDir/docker-compose.deploy*.yml 2>/dev/null || true
echo "== swap =="
cat /proc/swaps 2>/dev/null || true
"@

  Write-Output "[deploy-status] remote runtime"
  $remoteOutput = Invoke-RemoteScript -Script $remoteScript
  if ($LASTEXITCODE -ne 0) {
    throw "remote status check failed"
  }
  $remoteOutput | Write-Output

  if ($VerifyPublic) {
    Write-Output "[deploy-status] public endpoints"
    $bust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $adminHtml = Invoke-CurlText @('-fsSL', '-H', 'Cache-Control: no-cache', '-H', 'Pragma: no-cache', "$PublicBaseUrl/admin?bust=$bust")
    $asset = $adminHtml | Select-String -Pattern '/assets/index-[A-Za-z0-9_-]+\.js' -AllMatches | ForEach-Object { $_.Matches.Value } | Select-Object -First 1
    if (-not $asset) {
      throw "public admin asset not found"
    }

    $health = Invoke-CurlText @('-fsS', "$PublicBaseUrl/health")
    $readiness = Invoke-CurlText @('-fsS', "$PublicBaseUrl/readiness")
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
