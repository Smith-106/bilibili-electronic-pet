# Remote Deployment

## Live Server

- Host: `20.194.7.31`
- SSH user: `azureuser`
- App directory: `/opt/bilibili-electronic-pet`
- Runtime env file: `/etc/bilibili-pet/pre-release.env`
- Active compose stack: `docker-compose.deploy.yml` with `docker-compose.deploy.ghcr.yml` override
- Active runtime image on 2026-04-09: `ghcr.io/smith-106/bilibili-electronic-pet:sha-d3af305361bf8e63d20f97ccb315faecfcd97cb0`
- Public readiness on 2026-04-09: `ready=true`, `foundation_ready=true`, `delivery_ready=true`, `effective_publish_mode=native_bilibili`

## Scope Split (2026-04-13)

- The last public or remote verification still corresponds to the historical `v0.2.1` admin plus native-Bilibili baseline.
- The repository now also contains a richer pet-core companion path and a governed `douyin-sidecar` external trial, but those additions are only verified locally in the current workspace.
- Do not describe the expanded pet-first or multi-platform scope as deployed until a fresh remote rollout, staging validation, and release signoff are completed for that scope.

Public probe evidence on 2026-04-13 matches that warning:

- `GET /health` and `GET /readiness` still return a healthy historical baseline
- `GET /companion/state-v2` returns `404`
- `GET /api/admin/pet/overview` returns `404`
- `GET /api/admin/platforms` returns `404`

Remote status probe on 2026-04-13 also confirmed the live host is healthy but still pinned to:

- `ghcr.io/smith-106/bilibili-electronic-pet:sha-013e756e659131d04aba51659b6bb9eabac96b40`

## Expanded Scope Rollout Attempt (2026-04-13)

- A source rollout from commit `ce28d215143bf5ac5a5779c0ffecf77e921a8aa4` succeeded and applied the pet-core migration remotely.
- A follow-up source rollout from commit `1a7ad7f4fdf6316c941cff75b2c3f1f2a55afe89` aligned platform health reporting with actual runtime readiness.
- The live host is now running local images:
  - `bilibili-electronic-pet_api:latest`
  - `bilibili-electronic-pet_worker:latest`
- Public behavior after rollout:
  - `GET /companion/state-v2` returns `200`
  - `GET /api/admin/pet/overview` returns `401`
  - `GET /api/admin/platforms` returns `401`
  - `GET /readiness` now exposes product-level fields

## Remaining Remote Gap

- The remote env still has no `PLATFORM_DOUYIN_*` settings, so the deployed runtime reports:
  - `platform_trial:no_external_platform_enabled`
  - `platform_trial:no_connected_rollout`
- This means the pet-core surface is live, but the first external-platform trial is not yet operational on the deployed host.

## Douyin Trial Verification (2026-04-13)

- A fresh read-only probe confirmed:
  - `PUBLISHER_WEBHOOK_URL` is present
  - `PUBLISHER_WEBHOOK_TOKEN` is absent
  - `PLATFORM_DOUYIN_ENABLED` is absent
  - `PLATFORM_DOUYIN_WEBHOOK_URL` is absent
  - `PLATFORM_DOUYIN_WEBHOOK_TOKEN` is absent
  - `PLATFORM_DOUYIN_PUBLISH_SOURCE` is absent
- The current generic webhook target redacts to:
  - `https://hooks.nikoniko.tech/<redacted:0chars>`
- Direct POSTs from the live host to that generic target were repeated with both payload shapes:
  - legacy webhook body `{ comment_id, reply_text }`
  - Douyin sidecar body `{ platform, comment_id, reply_text, force_publish, trace_id }`
- Both requests returned HTTP `403` with a Cloudflare challenge page (`Just a moment...`), so the existing generic webhook is not a verified Douyin-capable sidecar endpoint.
- No dedicated Douyin endpoint path or extra external credential was found in the repo or in the live env, so EXEC-003 did not apply any new `PLATFORM_DOUYIN_*` values.
- Current live evidence after the blocked verification remains:
  - public `GET /readiness` -> `product_ready=false`
  - `product_blockers=["platform_trial:no_external_platform_enabled","platform_trial:no_connected_rollout"]`
  - internal `GET /api/admin/platforms` -> `douyin.enabled=false`, `adapterKey="douyin-sidecar-trial"`
  - internal `POST /gateway/publish/douyin` -> `403 {"detail":"platform_disabled"}`
- Conclusion: remote Douyin trial enablement is blocked by missing external sidecar infrastructure or WAF/endpoint provisioning outside this repository. Do not claim the external-platform rollout is enabled until a dedicated verified endpoint path exists.

## Repo-Local Retry Pack For Douyin Trial

The repo can still prepare the next retry even before the external endpoint exists.

### Required Sidecar Contract

The runtime currently posts this JSON body for sidecar publishing:

```json
{
  "platform": "douyin",
  "comment_id": "<comment-id>",
  "reply_text": "<reply-text>",
  "force_publish": false,
  "trace_id": "<trace-id>"
}
```

Request headers:

- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer <PLATFORM_DOUYIN_WEBHOOK_TOKEN>` only when token is configured

Expected downstream behavior:

- accepts the payload from the live host without Cloudflare/WAF challenge
- returns JSON
- may include:
  - `published`
  - `reason`
  - `published_at`

### Required Remote Env For Honest Enablement

At minimum the live env must set:

- `PLATFORM_DOUYIN_ENABLED=true`
- `PLATFORM_DOUYIN_WEBHOOK_URL=<verified douyin sidecar endpoint>`

Recommended:

- `PLATFORM_DOUYIN_WEBHOOK_TOKEN=<bearer token>`
- `PLATFORM_DOUYIN_PUBLISH_SOURCE=<operator-visible label>`

### Deterministic Retry Sequence

1. Confirm the external endpoint path and auth contract outside the repo.
2. Apply the final `PLATFORM_DOUYIN_*` env on `/etc/bilibili-pet/pre-release.env`.
3. Recreate remote `api` and `worker`.
4. Run `./deploy-remote.ps1 status` and confirm:
   - `PLATFORM_DOUYIN_*` is no longer absent in the redacted env section
   - public `/readiness` no longer reports `platform_trial:no_external_platform_enabled`
5. Run remote/public/internal probes again.
6. Run a real `/gateway/publish/douyin` smoke publish and archive the result.

### Do Not Treat These As Evidence

The following are not sufficient to mark Douyin trial as enabled:

- only having `PUBLISHER_WEBHOOK_URL`
- local-only tests with `https://sidecar.example.test/publish`
- a public `/health` success without updated `product_ready` / `product_blockers`
- any path that still returns Cloudflare challenge HTML from the live host

## Current Deployment Modes

- `deploy-remote.ps1`
  - Unified entrypoint for remote deployment operations.
  - Modes:
    - `./deploy-remote.ps1 admin`
    - `./deploy-remote.ps1 source -Ref origin/master`
    - `./deploy-remote.ps1 ghcr`
    - `./deploy-remote.ps1 status`

- `deploy-admin-remote.ps1`
  - Use only when the live runtime is intentionally on the local-image compose path, or when you explicitly want an ephemeral container-only admin hot patch.
  - Uploads `backend-ts/public/admin/**`, injects the files into the running `api` container, and can persist or recreate against the local-image compose path.
  - Refuses by default to replace a GHCR-backed runtime with the local-image compose path. Override only with `-AllowImageSourceChange`.

- `deploy-remote-source.ps1`
  - Use when backend or worker code changed and you intentionally want a host-side source rebuild, or when a fully reproducible local-image rebuild is required.
  - Archives a Git ref, uploads it to the server, ensures swap exists, rebuilds the local Docker images, runs Prisma migrate, recreates `api` and `worker`, and verifies the public site.
  - Refuses by default to replace a GHCR-backed runtime with local images. Override only with `-AllowImageSourceChange`.

- `deploy-remote-ghcr.ps1`
  - Preferred live rollout path when the target image is already published to GHCR.
  - Uploads `docker-compose.deploy.ghcr.yml`, performs a temporary GHCR login on the server, pulls the selected GHCR image ref, recreates `api` and `worker`, verifies the public site, and logs out by default.
  - Supports pinned deploys via `-ImageRef ghcr.io/smith-106/bilibili-electronic-pet:sha-<commit>`.
  - Also supports ref-based deploys via `-GitRef origin/master`, which resolves to the matching published `sha-<commit>` tag.

- `resolve-ghcr-image-ref.ps1`
  - Resolves a Git ref to a GHCR image reference.
  - Example: `./resolve-ghcr-image-ref.ps1 -GitRef origin/master`

- `deploy-remote-status.ps1`
  - Read-only remote status probe.
  - Reports current remote container image sources, container health, tracked deploy files, swap status, and public admin/readiness state.

## Server Resource Note

- The host has about `853MiB` RAM.
- A persistent `4GiB` swap file at `/swapfile-bili` is now provisioned so full remote Docker builds can complete.

## GHCR Status

- GHCR release publishing is working from GitHub Actions.
- A validated GHCR override is now tracked in `docker-compose.deploy.ghcr.yml`.
- The live server is currently running through the GHCR override path with a pinned `sha-<commit>` image.
- Without persisted GHCR credentials, future pulls still require a fresh authenticated deploy action.

## Recommended Operational Rule

- Preferred live rollout for the current host: run `./deploy-remote.ps1 ghcr -GitRef origin/master`
- Deploy a pinned GHCR image: run `./deploy-remote.ps1 ghcr -ImageRef ghcr.io/smith-106/bilibili-electronic-pet:sha-<commit>`
- Frontend-only admin hot patch on a local-image runtime: run `./deploy-remote.ps1 admin`
- Host-side source rebuild or intentional runtime-source switch: run `./deploy-remote.ps1 source -Ref origin/master -AllowImageSourceChange`
- Inspect live runtime source and public status: run `./deploy-remote.ps1 status`

For the pet-core plus multi-platform expansion, add an explicit post-deploy check that covers `/companion/state-v2`, `/api/admin/pet/overview`, `/api/admin/platforms`, and the updated `/readiness` product gates before claiming customer-ready status.
