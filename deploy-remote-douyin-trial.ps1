param(
  [ValidateSet('plan', 'apply', 'status', 'smoke', 'full')]
  [string]$Mode = 'plan',
  [string]$KeyPath = "C:\Users\32852\Desktop\服务器\azure\ssh-key-2026-02-10.key",
  [string]$User = 'azureuser',
  [string]$RemoteHost = '20.194.7.31',
  [string]$RemoteEnvFile = '/etc/bilibili-pet/pre-release.env',
  [string]$WebhookUrl = '',
  [string]$WebhookToken = '',
  [string]$PublishSource = 'douyin-sidecar-trial',
  [string]$ApiKey = '',
  [string]$CommentId = '',
  [string]$ReplyText = 'douyin trial smoke publish',
  [switch]$SkipSmoke
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = 'Stop'

function New-ScopedKeyCopy {
  param([Parameter(Mandatory = $true)][string]$SourcePath)

  $tempKey = Join-Path $env:TEMP ("bili-pet-douyin-key-" + [guid]::NewGuid().ToString("N"))
  Copy-Item -LiteralPath $SourcePath -Destination $tempKey -Force
  icacls $tempKey /inheritance:r | Out-Null
  icacls $tempKey /grant:r "$env:USERNAME`:(F)" | Out-Null
  return $tempKey
}

function Invoke-Remote {
  param(
    [Parameter(Mandatory = $true)][string]$Remote,
    [Parameter(Mandatory = $true)][string]$TempKey,
    [Parameter(Mandatory = $true)][string]$Script
  )

  $output = & ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $TempKey $Remote $Script
  if ($LASTEXITCODE -ne 0) {
    throw "remote command failed"
  }
  return $output
}

function Show-Plan {
  Write-Output "[douyin-trial] mode=plan"
  Write-Output "[douyin-trial] remote env file: $RemoteEnvFile"
  Write-Output "[douyin-trial] required env keys:"
  Write-Output "  - PLATFORM_DOUYIN_ENABLED=true"
  Write-Output "  - PLATFORM_DOUYIN_WEBHOOK_URL=<verified endpoint>"
  Write-Output "  - PLATFORM_DOUYIN_PUBLISH_SOURCE=$PublishSource"
  Write-Output "  - PLATFORM_DOUYIN_WEBHOOK_TOKEN=<token> (optional unless downstream requires bearer auth)"
  Write-Output "[douyin-trial] smoke publish requires a valid admin API key and an endpoint reachable from the live host."
  if ($WebhookUrl) {
    Write-Output "[douyin-trial] planned webhook url: $WebhookUrl"
  }
}

function Invoke-Status {
  Write-Output "[douyin-trial] running remote status"
  & (Join-Path $PSScriptRoot 'deploy-remote-status.ps1') `
    -KeyPath $KeyPath `
    -User $User `
    -RemoteHost $RemoteHost `
    -VerifyPublic:$true
  if ($LASTEXITCODE -ne 0) {
    throw "deploy-remote-status failed"
  }
}

function Invoke-Apply {
  param(
    [Parameter(Mandatory = $true)][string]$Remote,
    [Parameter(Mandatory = $true)][string]$TempKey
  )

  if (-not $WebhookUrl) {
    throw "WebhookUrl is required for apply/full modes."
  }

  $escapedWebhookUrl = $WebhookUrl.Replace("'", "'\"'\"'")
  $escapedWebhookToken = $WebhookToken.Replace("'", "'\"'\"'")
  $escapedPublishSource = $PublishSource.Replace("'", "'\"'\"'")

  $remoteScript = @"
set -euo pipefail
backup_path="${RemoteEnvFile}.douyin-backup-\$(date +%Y%m%dT%H%M%S)"
sudo -n cp ${RemoteEnvFile} "\$backup_path"
sudo -n python3 - <<'PY'
from pathlib import Path

env_path = Path("${RemoteEnvFile}")
lines = env_path.read_text(encoding="utf-8").splitlines()
updates = {
    "PLATFORM_DOUYIN_ENABLED": "true",
    "PLATFORM_DOUYIN_WEBHOOK_URL": '${escapedWebhookUrl}',
    "PLATFORM_DOUYIN_PUBLISH_SOURCE": '${escapedPublishSource}',
}
token_value = '${escapedWebhookToken}'
if token_value:
    updates["PLATFORM_DOUYIN_WEBHOOK_TOKEN"] = token_value

seen = set()
result = []
for line in lines:
    if "=" not in line or line.lstrip().startswith("#"):
        result.append(line)
        continue
    key, _ = line.split("=", 1)
    key = key.strip()
    if key in updates:
        result.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        result.append(line)

for key, value in updates.items():
    if key not in seen:
        result.append(f"{key}={value}")

env_path.write_text("\n".join(result) + "\n", encoding="utf-8")
PY
cd /opt/bilibili-electronic-pet
sudo -n docker-compose -f docker-compose.deploy.yml up -d --force-recreate api worker
echo "backup_path=\$backup_path"
"@

  $result = Invoke-Remote -Remote $Remote -TempKey $TempKey -Script $remoteScript
  $result | Write-Output
}

function Invoke-Smoke {
  param(
    [Parameter(Mandatory = $true)][string]$Remote,
    [Parameter(Mandatory = $true)][string]$TempKey
  )

  if (-not $ApiKey) {
    throw "ApiKey is required for smoke/full modes."
  }

  $actualCommentId = if ($CommentId) { $CommentId } else { "douyin-trial-smoke-" + [guid]::NewGuid().ToString("N").Substring(0, 8) }
  $escapedApiKey = $ApiKey.Replace("'", "'\"'\"'")
  $escapedCommentId = $actualCommentId.Replace("'", "'\"'\"'")
  $escapedReplyText = $ReplyText.Replace("'", "'\"'\"'")

  $remoteScript = @"
set -euo pipefail
curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'x-api-key: ${escapedApiKey}' \
  --data '{"comment_id":"${escapedCommentId}","reply_text":"${escapedReplyText}","trace_id":"${escapedCommentId}"}' \
  http://127.0.0.1:18000/gateway/publish/douyin
"@

  $result = Invoke-Remote -Remote $Remote -TempKey $TempKey -Script $remoteScript
  $result | Write-Output
}

$remote = "$User@$RemoteHost"
$tempKey = $null

try {
  if ($Mode -eq 'plan') {
    Show-Plan
    return
  }

  $tempKey = New-ScopedKeyCopy -SourcePath $KeyPath

  switch ($Mode) {
    'status' {
      Invoke-Status
    }
    'apply' {
      Invoke-Apply -Remote $remote -TempKey $tempKey
      Invoke-Status
    }
    'smoke' {
      Invoke-Smoke -Remote $remote -TempKey $tempKey
    }
    'full' {
      Invoke-Apply -Remote $remote -TempKey $tempKey
      Invoke-Status
      if (-not $SkipSmoke) {
        Invoke-Smoke -Remote $remote -TempKey $tempKey
      }
    }
  }
} finally {
  if ($tempKey -and (Test-Path $tempKey)) {
    Remove-Item -LiteralPath $tempKey -Force
  }
}
