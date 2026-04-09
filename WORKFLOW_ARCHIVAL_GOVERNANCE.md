# Workflow Archival Governance

This repository keeps `.workflow/` as local operational state, so workflow session moves and Windows junction redirects are not committed directly.

The Git-trackable source of truth for archival state now lives in:

- `config/workflow-archive-state.json`
- `sync-workflow-archive-state.ps1`

## Current Contract

- Local workflow sessions still originate under `.workflow/active/`.
- Canonical archived sessions live under `.workflow/archives/`.
- On this Windows workspace, the preferred compatibility strategy is `directory_junction_redirect`.
- Historical csv-wave evidence under `.workflow/.csv-wave/` remains immutable.

## Current Archived Sessions

- `WFS-preprod-gap-closure`
- `WFS-frontend-backend-alignment-20260408`

Their canonical copies now live under `.workflow/archives/`, while the old `.workflow/active/<session_id>` paths are expected to resolve through directory junctions.

## Next Candidate

- `WFS-progress-report-followups`

## Applying Or Verifying Local State

Use:

```powershell
./sync-workflow-archive-state.ps1 -Mode verify
./sync-workflow-archive-state.ps1 -Mode apply
```

`verify` reports whether the local ignored `.workflow` tree matches the tracked state file.

`apply` creates or repairs the local archive/junction layout to match the tracked state.

## Why This Exists

Git cannot safely represent the whole ignored `.workflow` tree plus local Windows junctions as ordinary tracked content.

So the repository tracks:

- the archival policy
- the intended archive state
- the replay/verification script

and leaves the concrete `.workflow` filesystem state local.
