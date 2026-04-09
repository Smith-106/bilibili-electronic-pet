# Remote Deployment

## Live Server

- Host: `20.194.7.31`
- SSH user: `azureuser`
- App directory: `/opt/bilibili-electronic-pet`
- Runtime env file: `/etc/bilibili-pet/pre-release.env`
- Active compose stack: `docker-compose.deploy.yml` with `docker-compose.deploy.ghcr.yml` override
- Active runtime image on 2026-04-09: `ghcr.io/smith-106/bilibili-electronic-pet:sha-d3af305361bf8e63d20f97ccb315faecfcd97cb0`
- Public readiness on 2026-04-09: `ready=true`, `foundation_ready=true`, `delivery_ready=true`, `effective_publish_mode=native_bilibili`

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
