# Staging Validation

This backend now ships with a cross-platform staging validator:

```bash
cd backend-ts
npm run staging:check -- --base-url http://127.0.0.1:18000
```

It can also be invoked from the repository root through the wrappers:

```bash
bash smoke.sh preflight --report ./staging-preflight.json
bash smoke.sh expanded-preflight --report ./expanded-scope-preflight.json
bash smoke.sh strict --base-url http://127.0.0.1:18000 --api-key "$API_KEY"
bash smoke.sh real-chain --base-url http://127.0.0.1:18000 --api-key "$API_KEY"
bash smoke.sh qq-onebot --report ./.artifacts/staging/qq-onebot-local.json
bash smoke.sh qq-e2e --report ./.artifacts/staging/qq-e2e-local.json

pwsh ./smoke.ps1 preflight --report .\staging-preflight.json
pwsh ./smoke.ps1 expanded-preflight --report .\expanded-scope-preflight.json
pwsh ./smoke.ps1 strict --base-url http://127.0.0.1:18000 --api-key "$env:API_KEY"
pwsh ./smoke.ps1 real-chain --base-url http://127.0.0.1:18000 --api-key "$env:API_KEY"
pwsh ./smoke.ps1 qq-onebot --report .\.artifacts\staging\qq-onebot-local.json
pwsh ./smoke.ps1 qq-e2e --report .\.artifacts\staging\qq-e2e-local.json
```

When wrapper modes (`preflight`, `expanded-preflight`, `strict`, `real-chain`, `qq-onebot`, `qq-e2e`) run without `--report`, wrappers now auto-write evidence JSON to:

- `./.artifacts/staging/<mode>-<UTC timestamp>.json`

Override the output directory with `SMOKE_REPORT_DIR`.

For direct `npm --prefix ... -- --report <relative-path>` smoke invocations launched from the repository root, QQ smoke scripts also resolve relative report paths against the original invocation directory, so `./.artifacts/staging/...` still lands in the repository-root evidence folder.

QQ-specific smoke layers:
- `qq-onebot`: validates `qq-sidecar -> OneBot HTTP` against a local mock OneBot endpoint
- `qq-e2e`: validates `backend-ts /gateway/publish/qq -> qq-sidecar -> OneBot HTTP` with local mock dependencies

## Modes

### Preflight Only

Checks:
- env-driven external-delivery prerequisites for:
  - LLM generation
  - search enrichment
  - webhook publish
- native Bilibili publish
- comment ingress auth
- optional JSON report output without contacting the running API
Environment focus (no runtime needed):
- LLM real chain: `LLM_PROVIDER` ≠ `mock` → require `LLM_API_KEY`
- LLM fallback: strict / real-chain candidates require `LLM_FALLBACK_TO_MOCK=false`
- Search: `SEARCH_API_KEY` (and `SEARCH_CX` when `SEARCH_PROVIDER=google`)
- Webhook: `PUBLISHER_MODE=webhook` → require `PUBLISHER_WEBHOOK_URL` (+ optional `PUBLISHER_WEBHOOK_TOKEN`)
- Native Bilibili: `BILIBILI_ENABLED=true` AND `BILIBILI_PUBLISH_ENABLED=true` → require DB credential or env trio `BILIBILI_SESSDATA` / `BILIBILI_BILI_JCT` / `BILIBILI_BUVID3` (+ optional `BILIBILI_BUVID4`) and `CREDENTIAL_ENCRYPTION_KEY`
- Comment ingress: strict / real-chain candidates require `COMMENT_INGRESS_TOKEN`
- Admin key is not required; runtime does not have to be up


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

### Expanded-Scope Preflight

Checks:
- standard preflight capability checks
- expanded-scope external platform trial inputs:
  - `PLATFORM_DOUYIN_ENABLED=true`
  - `PLATFORM_DOUYIN_WEBHOOK_URL`
  - `PLATFORM_DOUYIN_PUBLISH_SOURCE`
  - `PLATFORM_QQ_ENABLED=true`
  - `PLATFORM_QQ_WEBHOOK_URL`
  - `PLATFORM_QQ_PUBLISH_SOURCE`
- optional `PLATFORM_DOUYIN_WEBHOOK_TOKEN` and `PLATFORM_QQ_WEBHOOK_TOKEN`

Use when:
- you want to validate the checker-side prerequisites for the expanded-scope staging run
- you need to separate missing `PLATFORM_DOUYIN_*` / `PLATFORM_QQ_*` inputs from later remote/WAF/runtime failures

Examples:

```bash
bash smoke.sh expanded-preflight --env-file ../.env.expanded-scope.preflight.example
pwsh ./smoke.ps1 expanded-preflight --env-file ..\.env.expanded-scope.preflight.example
```

This mode validates checker-side inputs only. It does not prove the live host can reach the configured endpoints.

For the final expanded-scope evidence package, use these repo-managed templates:

- `backend-ts/EXPANDED_SCOPE_STAGING_TEMPLATE.md`
- `backend-ts/staging-report.expanded-scope.template.json`

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
- `real_auth_ready` should now be read as “runtime auth probe succeeded”, not merely “credential fields are populated”

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

### Validation inputs by capability

| Capability | Minimal (mock/manual) | Preflight required | Strict required | Real-chain required |
|------------|-----------------------|--------------------|-----------------|---------------------|
| LLM generation | `LLM_PROVIDER=mock` | `LLM_PROVIDER` ≠ `mock` + `LLM_API_KEY` | runtime running | runtime running |
| Search enrichment | `SEARCH_PROVIDER=serpapi` | `SEARCH_API_KEY` (+ `SEARCH_CX` if Google) | runtime running | runtime running |
| Webhook publish | `PUBLISHER_MODE=manual_queue` | `PUBLISHER_MODE=webhook` + `PUBLISHER_WEBHOOK_URL` (+ `PUBLISHER_WEBHOOK_TOKEN`) | runtime running | runtime running |
| Native Bilibili publish | switches off | `BILIBILI_ENABLED=true`, `BILIBILI_PUBLISH_ENABLED=true`, native credential (DB or env trio) + `CREDENTIAL_ENCRYPTION_KEY` | runtime running | `delivery_ready=true`, release gates true, and runtime auth probe must succeed |
| Comment ingress auth | optional in local dev | `COMMENT_INGRESS_TOKEN` | `/readiness.product_ready=true` requires runtime token configured | same as strict |

### Runtime and admin requirements

- Admin API auth: `API_KEY` (strict / real-chain)
- Comment ingress auth: `COMMENT_INGRESS_TOKEN` (strict / real-chain)
- Foundation: `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` (strict expects readiness to be true)
- Readiness compatibility: `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` (reported for parity, still accepted)
- Gateway publish: `GATEWAY_TOKEN`, `GATEWAY_HMAC_SECRET` (only for `/gateway/publish`)
- Poller tuning: `BILIBILI_POLL_ENABLED`, `BILIBILI_POLL_INTERVAL_SECONDS`, `BILIBILI_RATE_LIMIT_PER_MINUTE` (optional)
- Credential storage: `CREDENTIAL_ENCRYPTION_KEY` (alias `BILIBILI_COOKIE_ENCRYPTION_KEY`)
- Multi-platform gateway: `PLATFORM_*_ENABLED`, `PLATFORM_*_PUBLISH_SOURCE` (independent of native Bilibili publish)
- Release smoke flags (wrappers): `BASE_URL`, `API_KEY`, `COMMENT_INGRESS_TOKEN`, `ENV_FILE`, `REPORT_PATH`, `STRICT_SMOKE`, `PRE_RELEASE_REAL_CHAIN`
## Notes

- The validator loads `backend-ts/.env` and repository-root `.env` automatically when present.
- Wrapper mode aliases:
  - `smoke.sh preflight` / `smoke.ps1 preflight` => `--preflight-only`
  - `smoke.sh strict` / `smoke.ps1 strict` => `--strict`
  - `smoke.sh real-chain` / `smoke.ps1 real-chain` => `--strict --pre-release-real-chain`
- Use `--env-file <path>` to point at a different staging env file.
- Use `--report <path>` to write a JSON report for release records.
- If wrapper mode is used without `--report`, `smoke.sh` / `smoke.ps1` auto-generate report paths under `./.artifacts/staging/`.
- If `--report` (or `REPORT_PATH`) is set, the validator writes report JSON for preflight, pass, and fail outcomes.
- Strict/real-chain reports now include:
  - `runtime_summary`: target-runtime state derived from `/readiness` and `/api/admin/bilibili/status`
  - `input_scopes`: explains the difference between checker-env inputs and target-runtime observations
  - `checker_env_differs_from_target_runtime`: warning emitted when checker-side preflight/env inputs disagree with a passing target runtime
- Use `--preflight-only` when you want an env-level readiness report without hitting `/health`, `/readiness`, or admin endpoints.
- If no API key is provided, the validator exits in degraded mode after the basic health/admin asset checks.
- The repository `cloud-validate` workflow now treats `preflight_ready` as a blocking gate before strict checks. It injects CI placeholder inputs so the wrapper/workflow/env contract must remain complete even in CI.
- When running locally, start the server from `backend-ts/` (or ensure `process.cwd()` resolves to that directory) so `/admin` can locate `public/admin`, and provide a reachable Redis runtime before expecting `--strict` to pass.
- For a repo-managed local strict rehearsal path, copy `.env.strict.local.example` to `.env.strict.local` and run:
  - `pwsh ./rehearse-local.ps1 strict`
  - or `bash ./rehearse-local.sh strict`
- For an expanded-scope preflight scaffold, copy `.env.expanded-scope.preflight.example` to a local file and run:
  - `pwsh ./smoke.ps1 expanded-preflight --env-file .\.env.expanded-scope.preflight`
  - or `bash ./smoke.sh expanded-preflight --env-file ./.env.expanded-scope.preflight`
- For the final operator summary and JSON evidence shape, copy or reference:
  - `backend-ts/EXPANDED_SCOPE_STAGING_TEMPLATE.md`
  - `backend-ts/staging-report.expanded-scope.template.json`
- For a repo-managed local native real-chain rehearsal scaffold, copy `.env.real-chain.local.example` to `.env.real-chain.local` and run:
  - `pwsh ./rehearse-local.ps1 real-chain`
  - or `bash ./rehearse-local.sh real-chain`
- Those helpers build the backend, start local Redis, launch the API with `node --env-file=<env file>`, run strict validation, and then clean up the API process automatically.
- Helpers now default env selection by mode:
  - `strict` → `.env.strict.local`
  - `real-chain` → `.env.real-chain.local`
- In `real-chain` mode, helpers now fail fast if `.env.real-chain.local` still contains scaffold placeholders for native credentials or encryption key.
- `--preflight-only` cannot prove runtime facts such as Redis reachability, migrated schema state, or whether an active DB credential currently exists. It is a prerequisite inspection step, not a substitute for strict or pre-release real-chain validation.
- `--pre-release-real-chain` is now harder to satisfy with placeholder native credentials alone; the target runtime must surface a successful native auth probe before `real_auth_ready=true`.
