# Staging Validation

This backend now ships with a cross-platform staging validator:

```bash
cd backend-ts
npm run staging:check -- --base-url http://127.0.0.1:18000
```

It can also be invoked from the repository root through the wrappers:

```bash
bash smoke.sh preflight --report ./staging-preflight.json
bash smoke.sh strict --base-url http://127.0.0.1:18000 --api-key "$API_KEY"
bash smoke.sh real-chain --base-url http://127.0.0.1:18000 --api-key "$API_KEY"

pwsh ./smoke.ps1 preflight --report .\staging-preflight.json
pwsh ./smoke.ps1 strict --base-url http://127.0.0.1:18000 --api-key "$env:API_KEY"
pwsh ./smoke.ps1 real-chain --base-url http://127.0.0.1:18000 --api-key "$env:API_KEY"
```

## Modes

### Preflight Only

Checks:
- env-driven external-delivery prerequisites for:
  - LLM generation
  - search enrichment
  - webhook publish
  - native Bilibili publish
- optional JSON report output without contacting the running API

Use when:
- You want to see which live-secret or delivery prerequisites are still missing before starting a release rehearsal
- You have a staging env file but do not yet want to depend on a running API process
- You need to distinguish "env/config is incomplete" from "runtime is up but failing readiness"

Example:

```bash
cd backend-ts
npm run staging:check -- \
  --preflight-only \
  --env-file .env.staging \
  --report ../staging-preflight.json
```

### Baseline

Checks:
- `GET /health`
- `GET /admin`
- CSS / JS assets referenced by `/admin`

Use when:
- You only need to verify that the API and admin bundle are reachable.

Example:

```bash
cd backend-ts
npm run staging:check -- --base-url http://127.0.0.1:18000
```

### Strict

Checks:
- baseline checks
- `GET /readiness`
- `GET /api/admin/overview`
- `GET /api/admin/bilibili/status`
- delivery-capable diagnostics contract for the current effective publish mode
- canonical capability contract parity (`delivery_capability_blockers` + `delivery_capabilities`)

Use when:
- You have an `API_KEY`
- You want to confirm the deployed server is not just alive, but operational
- The target runtime already has its foundation dependencies available, especially database schema and Redis connectivity, because `readiness.ready=true` is part of the strict gate

Example:

```bash
cd backend-ts
npm run staging:check -- \
  --base-url http://127.0.0.1:18000 \
  --api-key "$API_KEY" \
  --strict
```

### Pre-release Real Chain

Checks:
- strict checks
- `delivery_ready=true`
- `effective_publish_mode=native_bilibili`
- `release_gates.pre_release_real_chain_ready=true`
- `release_gates.real_auth_ready=true`
- `release_gates.dependency_ready=true`
- `release_gates.worker_or_publish_ready=true`
- `release_gates.native_publish_enabled=true`
- `release_gates.credential_present=true`
- `release_gates.credential_complete=true`

Use when:
- You are validating the native Bilibili publish path before release

Example:

```bash
cd backend-ts
npm run staging:check -- \
  --base-url http://127.0.0.1:18000 \
  --api-key "$API_KEY" \
  --strict \
  --pre-release-real-chain \
  --report ../staging-report.json
```

## Environment Matrix

| Area | Variables | When required | Notes |
|------|-----------|---------------|-------|
| Admin API | `API_KEY` | strict / pre-release real chain | Used for admin route validation |
| Database | `DATABASE_URL` | deployment-specific | Validator reports it from env when present |
| Worker Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` | when Worker runs against Redis | Worker queue config reads these directly |
| API readiness compatibility | `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | recommended for explicit staging config | Main service still surfaces these values in readiness config |
| Gateway publish | `GATEWAY_TOKEN`, `GATEWAY_HMAC_SECRET` | when using `/gateway/publish` | Not required for baseline admin checks |
| LLM | `LLM_PROVIDER`, `LLM_API_KEY` | if `LLM_PROVIDER != mock` | Mock mode is acceptable for non-production smoke |
| Search enhancement | `SEARCH_PROVIDER`, `SEARCH_API_KEY`, `SEARCH_CX` (Google only) | when validating real search augmentation | Missing search config does not block baseline, but preflight will mark search as incomplete |
| Publisher webhook | `PUBLISHER_MODE=webhook`, `PUBLISHER_WEBHOOK_URL`, `PUBLISHER_WEBHOOK_TOKEN` | webhook delivery path | `PUBLISHER_WEBHOOK_URL` is the gating input |
| Native / real Bilibili auth | active DB credential or env trio `BILIBILI_SESSDATA`, `BILIBILI_BILI_JCT`, `BILIBILI_BUVID3` | native / real publish and polling | The validator treats either source as acceptable at runtime |
| Bilibili runtime tuning | `BILIBILI_BASE_URL`, `BILIBILI_USER_AGENT`, `BILIBILI_TIMEOUT`, `BILIBILI_RETRIES`, `BILIBILI_DEDEUSERID`, `BILIBILI_BUVID4` | optional tuning | Useful for staging parity with production |
| Native publish switches | `BILIBILI_ENABLED=true`, `BILIBILI_PUBLISH_ENABLED=true` | pre-release real chain | This forces `effective_publish_mode=native_bilibili` |
| Polling | `BILIBILI_POLL_ENABLED`, `BILIBILI_POLL_INTERVAL_SECONDS`, `BILIBILI_RATE_LIMIT_PER_MINUTE` | when validating poller behavior | Polling is optional for pure publish validation |
| Credential storage | `CREDENTIAL_ENCRYPTION_KEY` (`BILIBILI_COOKIE_ENCRYPTION_KEY` legacy alias) | when credentials are stored in DB | Strongly recommended in staged environments |
| Multi-platform gateway | `PLATFORM_BILIBILI_ENABLED`, `PLATFORM_DOUYIN_ENABLED`, `PLATFORM_KUAISHOU_ENABLED`, and matching `*_PUBLISH_SOURCE` | when validating `/gateway/publish/:platform` | Separate from native Bilibili publish mode |

## Notes

- The validator loads `backend-ts/.env` and repository-root `.env` automatically when present.
- Wrapper mode aliases:
  - `smoke.sh preflight` / `smoke.ps1 preflight` => `--preflight-only`
  - `smoke.sh strict` / `smoke.ps1 strict` => `--strict`
  - `smoke.sh real-chain` / `smoke.ps1 real-chain` => `--strict --pre-release-real-chain`
- Use `--env-file <path>` to point at a different staging env file.
- Use `--report <path>` to write a JSON dry-run report for release records.
- Use `--preflight-only` when you want an env-level readiness report without hitting `/health`, `/readiness`, or admin endpoints.
- If no API key is provided, the validator exits in degraded mode after the basic health/admin asset checks.
- The repository `cloud-validate` workflow now treats `preflight_ready` as a blocking gate before strict checks. It injects CI placeholder inputs so the wrapper/workflow/env contract must remain complete even in CI.
- When running locally, start the server from `backend-ts/` (or ensure `process.cwd()` resolves to that directory) so `/admin` can locate `public/admin`, and provide a reachable Redis runtime before expecting `--strict` to pass.
- `--preflight-only` cannot prove runtime facts such as Redis reachability, migrated schema state, or whether an active DB credential currently exists. It is a prerequisite inspection step, not a substitute for strict or pre-release real-chain validation.
