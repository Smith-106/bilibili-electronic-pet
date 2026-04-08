param(
  [string]$KeyPath = "C:\Users\32852\Desktop\服务器\azure\ssh-key-2026-02-10.key",
  [string]$User = "azureuser",
  [string]$RemoteHost = "20.194.7.31",
  [string]$RemoteAppDir = "/opt/bilibili-electronic-pet",
  [string]$ApiContainer = "bilibili-electronic-pet_api_1",
  [string]$ComposeFile = "/opt/bilibili-electronic-pet/docker-compose.deploy.yml",
  [switch]$SkipBuild,
  [switch]$SkipPersistImage,
  [switch]$SkipRecreate,
  [switch]$VerifyPublic = $true
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$adminDir = Join-Path $repoRoot "backend-ts/public/admin"
$indexPath = Join-Path $adminDir "index.html"

if (-not $SkipBuild) {
  Write-Output "[deploy-admin] building frontend bundle"
  & npm.cmd --prefix (Join-Path $repoRoot "frontend") run build
  if ($LASTEXITCODE -ne 0) {
    throw "frontend build failed"
  }
}

if (-not (Test-Path $indexPath)) {
  throw "missing admin bundle: $indexPath"
}

$indexHtml = Get-Content -LiteralPath $indexPath -Raw
$scriptRefs = [regex]::Matches($indexHtml, '/assets/[^"]+\.js') | ForEach-Object { $_.Value.TrimStart('/') }
$styleRefs = [regex]::Matches($indexHtml, '/assets/[^"]+\.css') | ForEach-Object { $_.Value.TrimStart('/') }
$assetRefs = @(@($scriptRefs) + @($styleRefs) | Select-Object -Unique)
if ($assetRefs.Count -eq 0) {
  throw "no admin assets found in index.html"
}

$tmpKey = Join-Path $env:TEMP ("bili-pet-admin-deploy-key-" + [guid]::NewGuid().ToString("N"))
Copy-Item -LiteralPath $KeyPath -Destination $tmpKey -Force
icacls $tmpKey /inheritance:r | Out-Null
icacls $tmpKey /grant:r "$env:USERNAME`:(F)" | Out-Null

$remote = "$User@$RemoteHost"
$remoteBundleDir = "/tmp/bili-admin-bundle"

try {
  Write-Output "[deploy-admin] preparing remote bundle directory"
  & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $remote "rm -rf $remoteBundleDir && mkdir -p $remoteBundleDir/assets"
  if ($LASTEXITCODE -ne 0) {
    throw "remote bundle directory preparation failed"
  }

  Write-Output "[deploy-admin] uploading index.html"
  & scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $indexPath "${remote}:$remoteBundleDir/index.html"
  if ($LASTEXITCODE -ne 0) {
    throw "index.html upload failed"
  }

  foreach ($asset in $assetRefs) {
    $localAsset = Join-Path $adminDir ($asset -replace '^assets/', 'assets\')
    if (-not (Test-Path $localAsset)) {
      throw "missing local asset: $localAsset"
    }
    Write-Output "[deploy-admin] uploading $asset"
    & scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $localAsset "${remote}:$remoteBundleDir/$asset"
    if ($LASTEXITCODE -ne 0) {
      throw "asset upload failed: $asset"
    }
  }

  $persistFlag = if ($SkipPersistImage) { "0" } else { "1" }
  $recreateFlag = if ($SkipRecreate) { "0" } else { "1" }
  $publicFlag = if ($VerifyPublic) { "1" } else { "0" }

$remoteScript = @"
set -euo pipefail
sudo -n docker cp $remoteBundleDir/. ${ApiContainer}:/app/public/admin/
if [ "$persistFlag" = "1" ]; then
  sudo -n docker commit $ApiContainer bilibili-electronic-pet_api:latest >/tmp/bili-admin-commit.out
fi
if [ "$recreateFlag" = "1" ]; then
  sudo -n docker-compose -f $ComposeFile up -d --force-recreate api
else
  sudo -n docker restart $ApiContainer
fi
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  status=`$(sudo -n docker inspect --format '{{.State.Health.Status}}' $ApiContainer 2>/dev/null || echo missing)
  echo "api_health=`$status"
  if [ "`$status" = "healthy" ]; then
    break
  fi
  sleep 5
done
[ "`$(sudo -n docker inspect --format '{{.State.Health.Status}}' $ApiContainer)" = "healthy" ]
sudo -n docker exec $ApiContainer sh -lc 'grep -o "/assets/index-[A-Za-z0-9_-]*\.js" /app/public/admin/index.html | head -n 1'
curl -fsS http://127.0.0.1:18000/health
rm -rf $remoteBundleDir
"@

  Write-Output "[deploy-admin] applying bundle on remote container"
  & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $remote $remoteScript
  if ($LASTEXITCODE -ne 0) {
    throw "remote apply failed"
  }

  if ($VerifyPublic) {
    $expectedAsset = "/" + ($scriptRefs | Select-Object -First 1)
    Write-Output "[deploy-admin] verifying public admin asset $expectedAsset"
    $verified = $false
    for ($i = 0; $i -lt 12; $i++) {
      $bust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
      $html = curl.exe -fsSL -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://pet.nikoniko.tech/admin?bust=$bust"
      if ($html -match [regex]::Escape($expectedAsset)) {
        $verified = $true
        break
      }
      Start-Sleep -Seconds 5
    }
    if (-not $verified) {
      throw "public verification failed for asset $expectedAsset"
    }

    & curl.exe -fsS https://pet.nikoniko.tech/health
    if ($LASTEXITCODE -ne 0) {
      throw "public health verification failed"
    }
  }
} finally {
  if (Test-Path $tmpKey) {
    Remove-Item -LiteralPath $tmpKey -Force
  }
}
