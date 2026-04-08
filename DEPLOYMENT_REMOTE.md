# Remote Deployment

## Live Server

- Host: `20.194.7.31`
- SSH user: `azureuser`
- App directory: `/opt/bilibili-electronic-pet`
- Runtime env file: `/etc/bilibili-pet/pre-release.env`
- Compose entrypoint: `docker-compose.deploy.yml`

## Current Deployment Modes

- `deploy-admin-remote.ps1`
  - Use when only the admin bundle changed.
  - Uploads `backend-ts/public/admin/**`, injects the files into the running `api` container, persists the container back into `bilibili-electronic-pet_api:latest`, recreates `api`, and verifies the public site.

- `deploy-remote-source.ps1`
  - Use when backend or worker code changed, or when a fully reproducible rebuild is required.
  - Archives a Git ref, uploads it to the server, ensures swap exists, rebuilds the local Docker images, runs Prisma migrate, recreates `api` and `worker`, and verifies the public site.

## Server Resource Note

- The host has about `853MiB` RAM.
- A persistent `4GiB` swap file at `/swapfile-bili` is now provisioned so full remote Docker builds can complete.

## GHCR Status

- GHCR release publishing is working from GitHub Actions.
- The live server does not yet consume GHCR images. It currently runs local images referenced by `docker-compose.deploy.yml`.

## Recommended Operational Rule

- Frontend-only admin changes: run `./deploy-admin-remote.ps1`
- Full application changes: run `./deploy-remote-source.ps1 -Ref origin/master`
