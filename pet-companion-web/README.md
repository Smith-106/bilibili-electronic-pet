# Pet Companion Web

Standalone Vite prototype for a browser-side companion surface.

## Current Status

- preserved in the current repository checkpoint
- explicitly isolated from the signed-off Bilibili rollout baseline
- prefers the backend `/companion/state` endpoint and falls back to a local stub adapter
- built into `backend-ts/public/companion`
- served by backend at `/companion`
- copied into the default backend image as a companion static surface
- current backend companion state is synthesized from persisted memory management data when available

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

Do not describe this package as part of the signed-off native Bilibili rollout path unless a future change explicitly adds business-runtime integration beyond static hosting and validation.
