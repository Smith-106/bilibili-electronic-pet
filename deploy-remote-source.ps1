param(
  [string]$Ref = "origin/master",
  [string]$KeyPath = "C:\Users\32852\Desktop\服务器\azure\ssh-key-2026-02-10.key",
  [string]$User = "azureuser",
  [string]$RemoteHost = "20.194.7.31",
  [string]$RemoteAppDir = "/opt/bilibili-electronic-pet",
  [string]$ComposeFile = "/opt/bilibili-electronic-pet/docker-compose.deploy.yml",
  [int]$SwapGiB = 4,
  [switch]$SkipSwap,
  [switch]$VerifyPublic = $true
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$remote = "$User@$RemoteHost"

$archivePath = Join-Path $env:TEMP ("bili-pet-src-" + [guid]::NewGuid().ToString("N") + ".tar")
$tmpKey = Join-Path $env:TEMP ("bili-pet-src-key-" + [guid]::NewGuid().ToString("N"))

Write-Output "[deploy-source] creating archive from $Ref"
& git archive --format=tar --output $archivePath $Ref
if ($LASTEXITCODE -ne 0) {
  throw "git archive failed for ref $Ref"
}

Copy-Item -LiteralPath $KeyPath -Destination $tmpKey -Force
icacls $tmpKey /inheritance:r | Out-Null
icacls $tmpKey /grant:r "$env:USERNAME`:(F)" | Out-Null

try {
  $swapFlag = if ($SkipSwap) { "0" } else { "1" }

  Write-Output "[deploy-source] uploading source archive"
  & scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $archivePath "${remote}:/tmp/bili-pet-source.tar"
  if ($LASTEXITCODE -ne 0) {
    throw "archive upload failed"
  }

  $remoteScript = @"
set -euo pipefail
if [ "$swapFlag" = "1" ]; then
  if [ ! -f /swapfile-bili ]; then
    sudo -n fallocate -l ${SwapGiB}G /swapfile-bili || sudo -n dd if=/dev/zero of=/swapfile-bili bs=1M count=$($SwapGiB * 1024) status=progress
    sudo -n chmod 600 /swapfile-bili
    sudo -n mkswap /swapfile-bili
    if ! grep -q '^/swapfile-bili ' /etc/fstab; then
      echo '/swapfile-bili none swap sw 0 0' | sudo -n tee -a /etc/fstab >/dev/null
    fi
  fi
  sudo -n /sbin/swapon /swapfile-bili || true
fi

mkdir -p $RemoteAppDir
tar -xf /tmp/bili-pet-source.tar -C $RemoteAppDir
rm -f /tmp/bili-pet-source.tar

cd $RemoteAppDir
sudo -n docker build -f backend-ts/Dockerfile -t bilibili-electronic-pet_api:latest -t bilibili-electronic-pet_worker:latest -t bilibili-electronic-pet_migrate:latest .
sudo -n docker-compose -f $ComposeFile run --rm migrate
sudo -n docker-compose -f $ComposeFile up -d --force-recreate api worker

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  status=`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1 2>/dev/null || echo missing)
  echo "api_health=`$status"
  if [ "`$status" = "healthy" ]; then
    break
  fi
  sleep 5
done
[ "`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1)" = "healthy" ]
sudo -n docker exec bilibili-electronic-pet_api_1 sh -lc 'grep -o "/assets/index-[A-Za-z0-9_-]*\.js" /app/public/admin/index.html | head -n 1'
curl -fsS http://127.0.0.1:18000/health
"@

  Write-Output "[deploy-source] applying archive and rebuilding remotely"
  $remoteOutput = & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $remote $remoteScript
  if ($LASTEXITCODE -ne 0) {
    throw "remote rebuild failed"
  }

  $remoteOutput | Write-Output
  $expectedAsset = ($remoteOutput | Select-String -Pattern '/assets/index-[A-Za-z0-9_-]+\.js' -AllMatches | ForEach-Object { $_.Matches.Value } | Select-Object -Last 1)
  if (-not $expectedAsset) {
    throw "could not determine expected public asset"
  }

  if ($VerifyPublic) {
    Write-Output "[deploy-source] verifying public asset $expectedAsset"
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
  if (Test-Path $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }
  if (Test-Path $tmpKey) {
    Remove-Item -LiteralPath $tmpKey -Force
  }
}
