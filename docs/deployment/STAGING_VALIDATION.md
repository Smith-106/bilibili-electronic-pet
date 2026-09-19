# Staging Validation

`backend-ts/scripts/staging-check.mjs` is the single entry point for validating a
running deployment. It runs in three modes plus a preflight-only prerequisite
inspection, and writes a JSON report for preflight / pass / fail outcomes.

This document is the canonical reference for the validation modes and the
environment-variable matrix. It was consolidated into `docs/deployment/` during
the docs-structure cleanup (it replaces the deleted
`backend-ts/STAGING_VALIDATION.md`, which several docs still linked to).

## Invocation

```bash
cd backend-ts
npm run staging:check -- [options]
```

| Flag | Effect |
|------|--------|
| `--base-url <url>` | API base URL (default `http://127.0.0.1:18000`). |
| `--api-key <key>` | Admin API key for authenticated checks. |
| `--env-file <path>` | Explicit env file to load before checks. |
| `--preflight-only` | Print external-delivery prerequisites without hitting the runtime. |
| `--expanded-scope-trial` | Also require external-platform (Douyin/QQ) trial inputs during preflight. |
| `--strict` | Require delivery-capable diagnostics checks. |
| `--pre-release-real-chain` | Require native Bilibili pre-release gates. |
| `--report <path>` | Write a JSON report (preflight / pass / fail). |
| `--help` | Show usage. |

Environment fallbacks: `BASE_URL`, `API_KEY`, `COMMENT_INGRESS_TOKEN`,
`ENV_FILE`, `STRICT_SMOKE`, `PRE_RELEASE_REAL_CHAIN`, `REPORT_PATH`.

## Recommended order

1. `--preflight-only` — confirm every env/secret/publish-mode prerequisite for
   real delivery is present (no runtime calls).
2. baseline or `--strict` — confirm the running API, background resources, and
   `/readiness` are healthy.
3. `--pre-release-real-chain` — only for a native Bilibili publish rehearsal.

## Wrappers

`smoke.sh` / `smoke.ps1` (repo root) and `rehearse-local.sh` /
`rehearse-local.ps1` wrap `staging-check` with mode aliases:

- `preflight` → `--preflight-only`
- `strict` → `--strict`
- `real-chain` → `--pre-release-real-chain`

Reports land under `SMOKE_REPORT_DIR` (or the `--report` / `REPORT_PATH` path).

## Environment matrix

`required` reflects the strictest mode that needs the variable (`strict` /
`real-chain` / `expanded-scope-trial`). `optional` variables are reported but
never block.

| Variable | Required when | Notes |
|----------|---------------|-------|
| `API_KEY` | strict, real-chain | Admin auth for protected endpoints. |
| `COMMENT_INGRESS_TOKEN` | strict, real-chain | Webhook ingress auth. |
| `LLM_API_KEY` | when `LLM_PROVIDER != mock` | Provider key. |
| `LLM_PROVIDER` | optional | `mock` skips the API-key requirement. |
| `LLM_FALLBACK_TO_MOCK=false` | strict, real-chain | Proves fallback is disabled. |
| `PUBLISHER_MODE` | strict | `manual_queue` / `webhook` / `real`. |
| `PUBLISHER_WEBHOOK_URL` | strict + webhook mode | Outbound publish target. |
| `BILIBILI_ENABLED` | real-chain | Platform gate. |
| `BILIBILI_PUBLISH_ENABLED` | real-chain | Publish gate. |
| `BILIBILI_POLL_ENABLED` | optional | Comment poller gate. |
| `BILIBILI_SESSDATA`/`BILIBILI_BILI_JCT`/`BILIBILI_BUVID3` | real-chain | Credential set. |
| `CREDENTIAL_ENCRYPTION_KEY` (or legacy `BILIBILI_COOKIE_ENCRYPTION_KEY`) | optional | At-rest credential encryption (fail-closed when set). |
| `PLATFORM_DOUYIN_ENABLED` | expanded-scope-trial | Douyin platform gate. |
| `PLATFORM_DOUYIN_WEBHOOK_URL` | expanded-scope-trial | Douyin publish target. |
| `PLATFORM_DOUYIN_WEBHOOK_TOKEN` | optional | Douyin webhook auth. |
| `PLATFORM_DOUYIN_PUBLISH_SOURCE` | expanded-scope-trial | Publish source label. |
| `PLATFORM_QQ_ENABLED` | expanded-scope-trial | QQ platform gate. |
| `PLATFORM_QQ_WEBHOOK_URL` | expanded-scope-trial | QQ publish target. |
| `PLATFORM_QQ_WEBHOOK_TOKEN` | optional | QQ webhook auth. |
| `PLATFORM_QQ_PUBLISH_SOURCE` | expanded-scope-trial | Publish source label. |
| `DATABASE_URL` | optional | Default `file:./dev.db`. |
| `REDIS_HOST` / `REDIS_PORT` | optional | BullMQ/redis runtime. |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | optional | Legacy compat. |
| `GATEWAY_TOKEN` / `GATEWAY_HMAC_SECRET` | optional | Gateway auth. |

## Report shape

Strict / real-chain reports include `runtime_summary` and `input_scopes` so the
checker-side env/preflight context is kept separate from the target-runtime
state — `checker_env_differs_from_target_runtime` is emitted as a warning when
they diverge rather than as a confusing "self-contradictory" failure.

## CI note

`cloud-validate` runs preflight as a blocking gate, then strict validation with
a migrated temp SQLite DB, `API_KEY`, and `COMMENT_INGRESS_TOKEN`. CI preflight
proves the capability matrix stays complete; it is **not** proof of real
external delivery — `/readiness.product_ready=true`, strict smoke, and
real-chain smoke are still required for that.
