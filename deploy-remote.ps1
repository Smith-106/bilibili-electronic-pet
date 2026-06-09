param(
  [ValidateSet('admin', 'source', 'ghcr', 'status')]
  [string]$Mode = 'source',
  [string]$Ref = 'origin/master',
  [string]$KeyPath = $env:BILI_PET_DEPLOY_KEY_PATH,
  [string]$User = $env:BILI_PET_DEPLOY_USER,
  [string]$RemoteHost = $env:BILI_PET_DEPLOY_HOST,
  [string]$PublicBaseUrl = $env:BILI_PET_PUBLIC_BASE_URL,
  [bool]$VerifyPublic = $true,
  [switch]$AllowImageSourceChange,
  [switch]$SkipBuild,
  [switch]$SkipPersistImage,
  [switch]$SkipRecreate,
  [switch]$SkipSwap,
  [switch]$PersistLogin,
  [string]$GhcrUsername = $env:BILI_PET_GHCR_USERNAME,
  [string]$ImageRef = $env:BILI_PET_GHCR_IMAGE_REF,
  [string]$GhcrRepository = $env:BILI_PET_GHCR_REPOSITORY,
  [string]$GitRef = '',
  [string]$GhcrToken = ''
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = 'Stop'

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
if ($VerifyPublic) {
  Assert-RequiredValue -Name 'PublicBaseUrl' -Value $PublicBaseUrl -Hint 'Pass -PublicBaseUrl or set BILI_PET_PUBLIC_BASE_URL.'
}
if ($Mode -eq 'ghcr') {
  Assert-RequiredValue -Name 'GhcrUsername' -Value $GhcrUsername -Hint 'Pass -GhcrUsername or set BILI_PET_GHCR_USERNAME.'
  if ($GitRef) {
    Assert-RequiredValue -Name 'GhcrRepository' -Value $GhcrRepository -Hint 'Pass -GhcrRepository or set BILI_PET_GHCR_REPOSITORY.'
  } else {
    Assert-RequiredValue -Name 'ImageRef' -Value $ImageRef -Hint 'Pass -ImageRef or set BILI_PET_GHCR_IMAGE_REF.'
  }
}
if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "KeyPath does not exist: $KeyPath"
}

$scripts = @{
  admin  = Join-Path $PSScriptRoot 'deploy-admin-remote.ps1'
  source = Join-Path $PSScriptRoot 'deploy-remote-source.ps1'
  ghcr   = Join-Path $PSScriptRoot 'deploy-remote-ghcr.ps1'
  status = Join-Path $PSScriptRoot 'deploy-remote-status.ps1'
}

$target = $scripts[$Mode]
if (-not (Test-Path $target)) {
  throw "missing deploy script: $target"
}

Write-Output "[deploy-remote] mode=$Mode script=$target"

switch ($Mode) {
  'admin' {
    & $target `
      -KeyPath $KeyPath `
      -User $User `
      -RemoteHost $RemoteHost `
      -PublicBaseUrl $PublicBaseUrl `
      -VerifyPublic:$VerifyPublic `
      -AllowImageSourceChange:$AllowImageSourceChange `
      -SkipBuild:$SkipBuild `
      -SkipPersistImage:$SkipPersistImage `
      -SkipRecreate:$SkipRecreate
    break
  }
  'source' {
    & $target `
      -Ref $Ref `
      -KeyPath $KeyPath `
      -User $User `
      -RemoteHost $RemoteHost `
      -PublicBaseUrl $PublicBaseUrl `
      -VerifyPublic:$VerifyPublic `
      -AllowImageSourceChange:$AllowImageSourceChange `
      -SkipSwap:$SkipSwap
    break
  }
  'ghcr' {
    $invokeArgs = @{
      KeyPath = $KeyPath
      User = $User
      RemoteHost = $RemoteHost
      VerifyPublic = $VerifyPublic
      PersistLogin = [bool]$PersistLogin
      GhcrUsername = $GhcrUsername
      ImageRef = $ImageRef
      GhcrRepository = $GhcrRepository
      GitRef = $GitRef
      PublicBaseUrl = $PublicBaseUrl
    }
    if ($GhcrToken) {
      $invokeArgs.GhcrToken = $GhcrToken
    }
    & $target @invokeArgs
    break
  }
  'status' {
    & $target `
      -KeyPath $KeyPath `
      -User $User `
      -RemoteHost $RemoteHost `
      -PublicBaseUrl $PublicBaseUrl `
      -VerifyPublic:$VerifyPublic
    break
  }
}

exit $LASTEXITCODE
