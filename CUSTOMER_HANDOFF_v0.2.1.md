# Customer Handoff: v0.2.1 Baseline

Date: 2026-04-10  
Project: bilibili电子宠物  
Release tag: `v0.2.1`

## Delivery Status

The v0.2.1 admin plus native-Bilibili baseline was ready for formal customer use.

## Scope Notice

This document is a historical handoff for the verified `v0.2.1` baseline only.

- It covers the admin console and native Bilibili delivery path that were deployed and verified on 2026-04-10.
- It does not cover the newer repo-local pet-core product surface or the governed external-platform trial added after that checkpoint.
- For the current upgrade status, use `CURRENT_STATUS_2026-04-13.md` and `.workflow/active/WFS-complete-electronic-pet-multi-platform/.process/ROLL_OUT_SIGNOFF_2026-04-13.md`.

Current public environment:

- Admin URL: `https://pet.nikoniko.tech/admin`
- Release tag: `v0.2.1`
- GitHub Release: `https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v0.2.1`

## Verified Runtime State

As of the latest deployment verification:

- `api` container: healthy
- `worker` container: healthy
- `redis` container: healthy
- Public `/health`: `{"ok":true}`
- Public `/readiness`:
  - `foundation_ready=true`
  - `delivery_ready=true`
  - `effective_publish_mode=native_bilibili`

## Customer-Facing Validation Summary

The following areas were validated on the public admin surface:

- Login and logout flow
- Dashboard loading
- Jobs page
- Daily metrics page
- Knowledge page
- Role-card page
- Profiles page
- Gateway page
- Audit page
- Bilibili integration page
- Query page

UI quality checks reached:

- Lighthouse Accessibility: `100`
- Lighthouse Best Practices: `100`
- Lighthouse SEO: `100`

## Included Improvements In v0.2.1

- Clarified Bilibili runtime credential state when credentials are runtime-managed outside the admin DB
- Derived dashboard runtime summary from `/readiness` instead of misleading empty runtime panels
- Added favicon and improved admin accessibility labels
- Polished customer-facing admin wording and empty-state behavior
- Guarded remote ops so GHCR-backed live runtime is not silently reverted to local-image compose
- Added workflow archival governance tracking for local operational state

## Known Non-Blocking Notes

- Browser console may still show several deprecation notices from Cloudflare challenge scripts.
- Those messages are emitted by external CDN/protection scripts, not by the project frontend bundle.
- They do not block product usage or delivery readiness.

## Operator References

- Deployment and remote runtime operations:
  - `DEPLOYMENT_REMOTE.md`
- Release / current-state status:
  - `DEVELOPMENT_PROGRESS_2026-04-07.md`
- Workflow archival governance:
  - `WORKFLOW_ARCHIVAL_GOVERNANCE.md`

## Recommended Customer Message

You can now start formal acceptance and daily use on the delivered environment:

- Access the admin panel at `https://pet.nikoniko.tech/admin`
- The delivered release is `v0.2.1`
- The current environment has passed readiness and public admin verification

## Internal Follow-Up Priority

No known repository-owned blocker remained for the v0.2.1 baseline before customer use.

Future work, if requested, should focus on:

1. New business features
2. Additional channel integrations
3. Long-term observability enrichment
4. Optional customer-specific reporting or workflow customization
