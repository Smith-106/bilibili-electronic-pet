# Expanded-Scope Strict Staging Template

Use this template only after the external Douyin trial unlock is complete.

This document is meant to become the operator-readable summary that accompanies the machine-readable JSON report from `staging-check`.

## Header

- Date:
- Operator:
- Target base URL:
- Target runtime revision/image:
- Source session:
- External endpoint reference:

## Preconditions

- `EXEC-001` completed
- `EXEC-002` completed
- `EXEC-003A` completed
- `EXT-003B` completed
- `PLATFORM_DOUYIN_*` verified on the live host
- remote endpoint reachable from the live host without Cloudflare/WAF challenge

## Commands Run

### Expanded-scope preflight

```bash
bash smoke.sh expanded-preflight --env-file ./.env.expanded-scope.preflight --report ./.artifacts/staging/expanded-preflight-<timestamp>.json
```

### Strict staging

```bash
bash smoke.sh strict --base-url <target-base-url> --api-key "<api-key>" --report ./.artifacts/staging/strict-expanded-scope-<timestamp>.json
```

### Optional real-chain check

```bash
bash smoke.sh real-chain --base-url <target-base-url> --api-key "<api-key>" --report ./.artifacts/staging/real-chain-<timestamp>.json
```

## Required Runtime Checks

- `GET /health`
- `GET /readiness`
- `GET /companion/state-v2`
- `GET /api/admin/pet/overview`
- `GET /api/admin/platforms`
- `POST /gateway/publish/douyin` smoke publish

## Decision Summary

- `product_ready`:
- `product_blockers`:
- `external_platform_trial.active_platforms`:
- `douyin.enabled`:
- `douyin.status`:
- smoke publish result:

## Evidence Files

- preflight JSON:
- strict JSON:
- real-chain JSON:
- remote env probe:
- public probe:
- internal admin probe:
- smoke publish proof:

## Verdict

Choose exactly one:

- expanded scope is now eligible for customer-ready wording
- expanded scope remains candidate-only

## Residual Blockers

- blocker 1:
- blocker 2:

## Notes

- Do not mark this template as evidence until all placeholders above are replaced with real results.

