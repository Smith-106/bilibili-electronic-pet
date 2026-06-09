param(
  [string]$Ref = "origin/master",
  [string]$KeyPath = $env:BILI_PET_DEPLOY_KEY_PATH,
  [string]$User = $env:BILI_PET_DEPLOY_USER,
  [string]$RemoteHost = $env:BILI_PET_DEPLOY_HOST,
  [string]$RemoteAppDir = "/opt/bilibili-electronic-pet",
  [string]$ComposeFile = "/opt/bilibili-electronic-pet/docker-compose.deploy.yml",
  [switch]$AllowImageSourceChange,
  [int]$SwapGiB = 4,
  [switch]$SkipSwap,
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

$repoRoot = $PSScriptRoot
$remote = "$User@$RemoteHost"

$archivePath = Join-Path $env:TEMP ("bili-pet-src-" + [guid]::NewGuid().ToString("N") + ".tar")
$tmpKey = Join-Path $env:TEMP ("bili-pet-src-key-" + [guid]::NewGuid().ToString("N"))

Copy-Item -LiteralPath $KeyPath -Destination $tmpKey -Force
icacls $tmpKey /inheritance:r | Out-Null
icacls $tmpKey /grant:r "$env:USERNAME`:(F)" | Out-Null

try {
  Write-Output "[deploy-source] checking current remote image sources"
  $currentImages = & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $tmpKey $remote "sudo -n docker inspect --format '{{.Name}}|{{.Config.Image}}' bilibili-electronic-pet_api_1 bilibili-electronic-pet_worker_1 2>/dev/null || true"
  if ($LASTEXITCODE -ne 0) {
    throw "remote image source probe failed"
  }
  $currentImages = @($currentImages | Where-Object { $_ -and $_.Trim() })
  foreach ($line in $currentImages) {
    Write-Output "[deploy-source] current runtime $line"
  }
  $hasGhcrRuntime = $false
  foreach ($line in $currentImages) {
    $parts = $line -split '\|', 2
    if ($parts.Count -eq 2 -and $parts[1] -like 'ghcr.io/*') {
      $hasGhcrRuntime = $true
      break
    }
  }
  if (-not $AllowImageSourceChange -and $hasGhcrRuntime) {
    throw "live runtime is currently backed by GHCR images. Refusing to switch api/worker back to local-image compose. Use ./deploy-remote.ps1 -Mode ghcr -GitRef $Ref, or rerun with -AllowImageSourceChange if you intentionally want to change runtime source."
  }

  $swapFlag = if ($SkipSwap) { "0" } else { "1" }

  Write-Output "[deploy-source] creating archive from $Ref"
  & git archive --format=tar --output $archivePath $Ref
  if ($LASTEXITCODE -ne 0) {
    throw "git archive failed for ref $Ref"
  }

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
sudo -n docker-compose -f $ComposeFile run --rm migrate < /dev/null
sudo -n docker-compose -f $ComposeFile rm -f -s api worker
sudo -n docker-compose -f $ComposeFile up -d --force-recreate --no-deps api worker

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  status=`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1 2>/dev/null || echo missing)
  echo "api_health=`$status"
  if [ "`$status" = "healthy" ]; then
    break
  fi
  sleep 5
done
[ "`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1)" = "healthy" ]
admin_asset=`$(sudo -n docker exec bilibili-electronic-pet_api_1 sh -lc 'grep -o "/assets/index-[A-Za-z0-9_-]*\.js" /app/public/admin/index.html | head -n 1')
echo "admin_asset=`$admin_asset"
curl -fsS http://127.0.0.1:18000/health
"@

  Write-Output "[deploy-source] applying archive and rebuilding remotely"
  $remoteOutput = Invoke-RemoteScript -Script $remoteScript
  if ($LASTEXITCODE -ne 0) {
    throw "remote rebuild failed"
  }

  $remoteOutput | Write-Output
  $expectedAsset = (
    $remoteOutput |
      ForEach-Object {
        if ($_ -match '^admin_asset=(/assets/index-[A-Za-z0-9_-]+\.js)$') {
          $Matches[1]
        }
      } |
      Select-Object -Last 1
  )
  if (-not $expectedAsset) {
    throw "could not determine expected public asset"
  }

  if ($VerifyPublic) {
    Write-Output "[deploy-source] verifying public asset $expectedAsset"
    $verified = $false
    for ($i = 0; $i -lt 12; $i++) {
      $bust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
      $html = Invoke-CurlText @('-fsSL', '-H', 'Cache-Control: no-cache', '-H', 'Pragma: no-cache', "$PublicBaseUrl/admin?bust=$bust")
      if ($html -match [regex]::Escape($expectedAsset)) {
        $verified = $true
        break
      }
      Start-Sleep -Seconds 5
    }
    if (-not $verified) {
      throw "public verification failed for asset $expectedAsset"
    }

    $health = Invoke-CurlText @('-fsS', "$PublicBaseUrl/health")
    Write-Output "health=$health"

    $readinessJson = Invoke-CurlText @('-fsS', "$PublicBaseUrl/readiness")
    $readinessObj = $readinessJson | ConvertFrom-Json
    if ($null -ne $readinessObj.product_ready) {
      Write-Output ("[deploy-source] product_ready={0}" -f $readinessObj.product_ready)
    }
    if ($readinessObj.product_blockers) {
      Write-Output ("[deploy-source] product_blockers={0}" -f (($readinessObj.product_blockers | ForEach-Object { $_ }) -join ';'))
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
