param(
  [string]$GitRef = "origin/master",
  [string]$Repository = "ghcr.io/smith-106/bilibili-electronic-pet",
  [switch]$VerifyPublished = $true
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = "Stop"

$sha = (& git rev-parse $GitRef 2>$null).Trim()
if (-not $sha) {
  throw "cannot resolve git ref: $GitRef"
}

$imageRef = "${Repository}:sha-$sha"

if ($VerifyPublished) {
  $versions = & gh api /user/packages/container/bilibili-electronic-pet/versions --jq ".[].metadata.container.tags[]?" 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "failed to query GHCR package tags"
  }
  $published = @($versions | Where-Object { $_ }) -contains "sha-$sha"
  if (-not $published) {
    throw "GHCR tag not published yet: sha-$sha"
  }
}

Write-Output $imageRef
