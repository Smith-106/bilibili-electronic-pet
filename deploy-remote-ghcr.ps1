param(
  [string]$KeyPath = "C:\Users\32852\Desktop\服务器\azure\ssh-key-2026-02-10.key",
  [string]$User = "azureuser",
  [string]$RemoteHost = "20.194.7.31",
  [string]$RemoteAppDir = "/opt/bilibili-electronic-pet",
  [string]$BaseComposeFile = "/opt/bilibili-electronic-pet/docker-compose.deploy.yml",
  [string]$GhcrComposeFile = "/opt/bilibili-electronic-pet/docker-compose.deploy.ghcr.yml",
  [string]$GhcrUsername = "Smith-106",
  [string]$GhcrToken = "",
  [switch]$PersistLogin,
  [bool]$VerifyPublic = $true
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$overridePath = Join-Path $repoRoot "docker-compose.deploy.ghcr.yml"
if (-not (Test-Path $overridePath)) {
  throw "missing GHCR deploy override: $overridePath"
}

if (-not $GhcrToken) {
  $GhcrToken = (& gh auth token).Trim()
}
if (-not $GhcrToken) {
  throw "GHCR token is required"
}

$remote = "$User@$RemoteHost"
$tmpKey = Join-Path $env:TEMP ("bili-pet-ghcr-key-" + [guid]::NewGuid().ToString("N"))
Copy-Item -LiteralPath $KeyPath -Destination $tmpKey -Force
icacls $tmpKey /inheritance:r | Out-Null
icacls $tmpKey /grant:r "$env:USERNAME`:(F)" | Out-Null

try {
  Write-Output "[deploy-ghcr] uploading GHCR compose override"
  & scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $overridePath "${remote}:$GhcrComposeFile"
  if ($LASTEXITCODE -ne 0) {
    throw "override upload failed"
  }

  $remoteLogin = @"
set -euo pipefail
sudo -n docker login ghcr.io -u $GhcrUsername --password-stdin
"@

  Write-Output "[deploy-ghcr] logging remote docker into GHCR"
  $GhcrToken | & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $remote $remoteLogin
  if ($LASTEXITCODE -ne 0) {
    throw "remote GHCR login failed"
  }

  $logoutFlag = if ($PersistLogin) { "0" } else { "1" }
  $remoteDeploy = @"
set -euo pipefail
cd $RemoteAppDir
sudo -n docker-compose -f $BaseComposeFile -f $GhcrComposeFile pull migrate api worker
sudo -n docker-compose -f $BaseComposeFile -f $GhcrComposeFile run --rm migrate
sudo -n docker-compose -f $BaseComposeFile -f $GhcrComposeFile up -d --force-recreate api worker
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  status=`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1 2>/dev/null || echo missing)
  echo "api_health=`$status"
  if [ "`$status" = "healthy" ]; then
    break
  fi
  sleep 5
done
[ "`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1)" = "healthy" ]
sudo -n docker ps --format '{{.Names}} {{.Image}} {{.Status}}' | grep '^bilibili-electronic-pet_'
if [ "$logoutFlag" = "1" ]; then
  sudo -n docker logout ghcr.io >/dev/null 2>&1 || true
fi
"@

  Write-Output "[deploy-ghcr] pulling and switching runtime to GHCR image"
  $remoteOutput = & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $remote $remoteDeploy
  if ($LASTEXITCODE -ne 0) {
    throw "remote GHCR deploy failed"
  }
  $remoteOutput | Write-Output

  if ($VerifyPublic) {
    Write-Output "[deploy-ghcr] verifying public health and admin"
    $asset = & curl.exe -fsSL -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://pet.nikoniko.tech/admin?bust=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" | Select-String -Pattern '/assets/index-[A-Za-z0-9_-]+\.js' -AllMatches | ForEach-Object { $_.Matches.Value } | Select-Object -First 1
    if (-not $asset) {
      throw "public admin asset verification failed"
    }
    & curl.exe -fsS https://pet.nikoniko.tech/health
    if ($LASTEXITCODE -ne 0) {
      throw "public health verification failed"
    }
    Write-Output "[deploy-ghcr] public admin asset $asset"
  }
} finally {
  if (Test-Path $tmpKey) {
    Remove-Item -LiteralPath $tmpKey -Force
  }
}
