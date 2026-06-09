param(
  [string]$KeyPath = $env:BILI_PET_DEPLOY_KEY_PATH,
  [string]$User = $env:BILI_PET_DEPLOY_USER,
  [string]$RemoteHost = $env:BILI_PET_DEPLOY_HOST,
  [string]$RemoteAppDir = "/opt/bilibili-electronic-pet",
  [string]$BaseComposeFile = "/opt/bilibili-electronic-pet/docker-compose.deploy.yml",
  [string]$GhcrComposeFile = "/opt/bilibili-electronic-pet/docker-compose.deploy.ghcr.yml",
  [string]$GhcrUsername = $env:BILI_PET_GHCR_USERNAME,
  [string]$ImageRef = $env:BILI_PET_GHCR_IMAGE_REF,
  [string]$GhcrRepository = $env:BILI_PET_GHCR_REPOSITORY,
  [string]$GitRef = "",
  [string]$GhcrToken = "",
  [switch]$PersistLogin,
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

Assert-RequiredValue -Name 'KeyPath' -Value $KeyPath -Hint 'Pass -KeyPath or set BILI_PET_DEPLOY_KEY_PATH.'
Assert-RequiredValue -Name 'User' -Value $User -Hint 'Pass -User or set BILI_PET_DEPLOY_USER.'
Assert-RequiredValue -Name 'RemoteHost' -Value $RemoteHost -Hint 'Pass -RemoteHost or set BILI_PET_DEPLOY_HOST.'
Assert-RequiredValue -Name 'GhcrUsername' -Value $GhcrUsername -Hint 'Pass -GhcrUsername or set BILI_PET_GHCR_USERNAME.'
if ($VerifyPublic) {
  Assert-RequiredValue -Name 'PublicBaseUrl' -Value $PublicBaseUrl -Hint 'Pass -PublicBaseUrl or set BILI_PET_PUBLIC_BASE_URL.'
  $PublicBaseUrl = $PublicBaseUrl.TrimEnd('/')
}
if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "KeyPath does not exist: $KeyPath"
}

$repoRoot = $PSScriptRoot
$overridePath = Join-Path $repoRoot "docker-compose.deploy.ghcr.yml"
if (-not (Test-Path $overridePath)) {
  throw "missing GHCR deploy override: $overridePath"
}

if ($GitRef) {
  $resolver = Join-Path $repoRoot "resolve-ghcr-image-ref.ps1"
  if (-not (Test-Path $resolver)) {
    throw "missing GHCR resolver: $resolver"
  }
  Assert-RequiredValue -Name 'GhcrRepository' -Value $GhcrRepository -Hint 'Pass -GhcrRepository or set BILI_PET_GHCR_REPOSITORY.'
  $ImageRef = (& $resolver -GitRef $GitRef -Repository $GhcrRepository).Trim()
}

if (-not $GhcrToken) {
  $GhcrToken = (& gh auth token).Trim()
}
if (-not $GhcrToken) {
  throw "GHCR token is required"
}
if (-not $ImageRef) {
  throw "ImageRef is required"
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

  $remoteDockerConfig = "/tmp/bili-ghcr-docker-config"
  $remoteLogin = @"
set -euo pipefail
sudo -n rm -rf $remoteDockerConfig
sudo -n mkdir -p $remoteDockerConfig
sudo -n env DOCKER_CONFIG=$remoteDockerConfig docker login ghcr.io -u $GhcrUsername --password-stdin
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
if [ "$logoutFlag" = "0" ]; then
  sudo -n mkdir -p /root/.docker
  sudo -n cp -f $remoteDockerConfig/config.json /root/.docker/config.json
  sudo -n chmod 600 /root/.docker/config.json
fi
export GHCR_IMAGE_REF='$ImageRef'
sudo -n env DOCKER_CONFIG=$remoteDockerConfig GHCR_IMAGE_REF='$ImageRef' docker-compose -f $BaseComposeFile -f $GhcrComposeFile pull migrate api worker
sudo -n env DOCKER_CONFIG=$remoteDockerConfig GHCR_IMAGE_REF='$ImageRef' docker-compose -f $BaseComposeFile -f $GhcrComposeFile run --rm migrate
sudo -n env DOCKER_CONFIG=$remoteDockerConfig GHCR_IMAGE_REF='$ImageRef' docker-compose -f $BaseComposeFile -f $GhcrComposeFile up -d --force-recreate api worker
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  status=`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1 2>/dev/null || echo missing)
  echo "api_health=`$status"
  if [ "`$status" = "healthy" ]; then
    break
  fi
  sleep 5
done
[ "`$(sudo -n docker inspect --format '{{.State.Health.Status}}' bilibili-electronic-pet_api_1)" = "healthy" ]
echo "ghcr_image_ref=$ImageRef"
sudo -n docker ps --format '{{.Names}} {{.Image}} {{.Status}}' | grep '^bilibili-electronic-pet_'
if [ "$logoutFlag" = "1" ]; then
  sudo -n rm -rf $remoteDockerConfig
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
    $asset = & curl.exe -fsSL -H "Cache-Control: no-cache" -H "Pragma: no-cache" "$PublicBaseUrl/admin?bust=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" | Select-String -Pattern '/assets/index-[A-Za-z0-9_-]+\.js' -AllMatches | ForEach-Object { $_.Matches.Value } | Select-Object -First 1
    if (-not $asset) {
      throw "public admin asset verification failed"
    }
    & curl.exe -fsS "$PublicBaseUrl/health"
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
