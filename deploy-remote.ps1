param(
  [ValidateSet('admin', 'source', 'ghcr')]
  [string]$Mode = 'source',
  [string]$Ref = 'origin/master',
  [string]$KeyPath = "C:\Users\32852\Desktop\服务器\azure\ssh-key-2026-02-10.key",
  [string]$User = 'azureuser',
  [string]$RemoteHost = '20.194.7.31',
  [bool]$VerifyPublic = $true,
  [switch]$SkipBuild,
  [switch]$SkipPersistImage,
  [switch]$SkipRecreate,
  [switch]$SkipSwap,
  [switch]$PersistLogin,
  [string]$GhcrUsername = 'Smith-106',
  [string]$GhcrToken = ''
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null

$scripts = @{
  admin  = Join-Path $PSScriptRoot 'deploy-admin-remote.ps1'
  source = Join-Path $PSScriptRoot 'deploy-remote-source.ps1'
  ghcr   = Join-Path $PSScriptRoot 'deploy-remote-ghcr.ps1'
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
    }
    if ($GhcrToken) {
      $invokeArgs.GhcrToken = $GhcrToken
    }
    & $target @invokeArgs
    break
  }
}

exit $LASTEXITCODE
