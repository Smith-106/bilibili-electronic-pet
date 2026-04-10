# Pet Companion Web

Standalone Vite prototype for a browser-side companion surface.

## Current Status

- preserved in the current repository checkpoint
- explicitly isolated from the signed-off Bilibili rollout baseline
- uses a local stub adapter
- not served by `backend-ts/public/admin`
- not wired into the default Docker / compose runtime

## Purpose

This package exists to explore a pet-first companion UI without changing the currently validated admin runtime.

It should be treated as a prototype until a later task explicitly chooses one of these paths:

1. integrate into the main runtime,
2. ship as a separately hosted surface,
3. archive as a prototype-only exploration.

## Local Commands

```bash
npm install
npm test
npm run build
npm run dev
```

## Boundary

Do not describe this package as part of the signed-off native Bilibili rollout path unless a future change explicitly adds runtime/packaging integration and validation.
