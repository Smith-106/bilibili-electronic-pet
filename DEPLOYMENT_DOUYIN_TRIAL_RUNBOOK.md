# Douyin Trial Remote Runbook

This runbook is the operator-facing companion to `deploy-remote-douyin-trial.ps1`.

It exists so the external endpoint provider, deploy operator, and smoke-publish operator can run one shared sequence without re-deriving the contract from scattered notes.

## Preconditions

Before running anything in this file, all of the following must be true:

- a verified Douyin-capable sidecar endpoint exists
- the live host can reach that endpoint without Cloudflare/WAF challenge
- the final `PLATFORM_DOUYIN_*` values are known
- an admin API key is available for the smoke publish step

## Required Inputs

- `PLATFORM_DOUYIN_ENABLED=true`
- `PLATFORM_DOUYIN_WEBHOOK_URL=<verified endpoint>`
- `PLATFORM_DOUYIN_PUBLISH_SOURCE=<operator-visible label>`
- optional `PLATFORM_DOUYIN_WEBHOOK_TOKEN=<bearer token>`

## Payload Contract

The runtime sends:

```json
{
  "platform": "douyin",
  "comment_id": "<comment-id>",
  "reply_text": "<reply-text>",
  "force_publish": false,
  "trace_id": "<trace-id>"
}
```

Headers:

- `Content-Type: application/json`
- `Accept: application/json`
- optional `Authorization: Bearer <PLATFORM_DOUYIN_WEBHOOK_TOKEN>`

## Optional Local Docker Rehearsal

If you want to validate the contract locally before touching the remote host:

```powershell
docker compose --profile sidecar up -d douyin-sidecar
```

Default local endpoints:

- `http://127.0.0.1:8081/health`
- `http://127.0.0.1:8081/publish`

When wiring the main app to this local sidecar, use:

- `PLATFORM_DOUYIN_ENABLED=true`
- `PLATFORM_DOUYIN_WEBHOOK_URL=http://127.0.0.1:8081/publish`
- `PLATFORM_DOUYIN_WEBHOOK_TOKEN=<same value as DOUYIN_SIDECAR_TOKEN>`
- `PLATFORM_DOUYIN_PUBLISH_SOURCE=douyin-sidecar-trial`

## Dry Plan

```powershell
pwsh ./deploy-remote-douyin-trial.ps1 plan `
  -WebhookUrl "https://<verified-endpoint>" `
  -PublishSource "douyin-sidecar-trial"
```

## Apply Env And Recreate Runtime

```powershell
pwsh ./deploy-remote-douyin-trial.ps1 apply `
  -WebhookUrl "https://<verified-endpoint>" `
  -WebhookToken "<token-if-required>" `
  -PublishSource "douyin-sidecar-trial"
```

This step:

- backs up `/etc/bilibili-pet/pre-release.env`
- writes the `PLATFORM_DOUYIN_*` keys
- recreates `api` and `worker`
- runs remote status afterwards

## Probe Runtime

```powershell
pwsh ./deploy-remote-douyin-trial.ps1 status
```

Confirm all of the following:

- redacted env shows `PLATFORM_DOUYIN_*` as present
- `/readiness` no longer shows:
  - `platform_trial:no_external_platform_enabled`
  - `platform_trial:no_connected_rollout`
- `product_ready` and `product_blockers` are visible in status output

## Smoke Publish

```powershell
pwsh ./deploy-remote-douyin-trial.ps1 smoke `
  -ApiKey "<admin-api-key>" `
  -ReplyText "douyin trial smoke publish"
```

## One-Shot Flow

```powershell
pwsh ./deploy-remote-douyin-trial.ps1 full `
  -WebhookUrl "https://<verified-endpoint>" `
  -WebhookToken "<token-if-required>" `
  -PublishSource "douyin-sidecar-trial" `
  -ApiKey "<admin-api-key>"
```

## Success Conditions

- remote env presence is correct
- public `/readiness` no longer reports the old `platform_trial:*` blockers
- internal `POST /gateway/publish/douyin` no longer returns `platform_disabled`
- smoke publish result can be archived into the expanded-scope staging evidence package

## Stop Conditions

Stop immediately if any of the following remains true:

- endpoint still returns Cloudflare challenge HTML
- `PLATFORM_DOUYIN_WEBHOOK_URL` is still absent after apply
- `/gateway/publish/douyin` still returns `platform_disabled`
- smoke publish returns a non-JSON or clearly invalid response

## Evidence To Update After Success

- [DEPLOYMENT_REMOTE.md](D:/工作目录/bilibili电子宠物/DEPLOYMENT_REMOTE.md)
- [EXPANDED_SCOPE_STAGING_TEMPLATE.md](D:/工作目录/bilibili电子宠物/backend-ts/EXPANDED_SCOPE_STAGING_TEMPLATE.md)
- [staging-report.expanded-scope.template.json](D:/工作目录/bilibili电子宠物/backend-ts/staging-report.expanded-scope.template.json)
- `.workflow/active/WFS-complete-electronic-pet-multi-platform/.process/ROLL_OUT_SIGNOFF_2026-04-13.md`
