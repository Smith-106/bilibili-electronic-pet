param(
  [ValidateSet('admin', 'source', 'ghcr', 'status')]
  [string]$Mode = 'source',
  [string]$Ref = 'origin/master',
  [string]$KeyPath = "C:\Users\32852\Desktop\服务器\azure\ssh-key-2026-02-10.key",
  [string]$User = 'azureuser',
  [string]$RemoteHost = '20.194.7.31',
  [bool]$VerifyPublic = $true,
  [switch]$AllowImageSourceChange,
  [switch]$SkipBuild,
  [switch]$SkipPersistImage,
  [switch]$SkipRecreate,
  [switch]$SkipSwap,
  [switch]$PersistLogin,
  [string]$GhcrUsername = 'Smith-106',
  [string]$ImageRef = 'ghcr.io/smith-106/bilibili-electronic-pet:latest',
  [string]$GitRef = '',
  [string]$GhcrToken = ''
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null

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
      GitRef = $GitRef
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
      -VerifyPublic:$VerifyPublic
    break
  }
}

exit $LASTEXITCODE
