# Pet Companion Web

Standalone Vite surface for the browser-side companion experience.

## Current Status

- preserved in the current repository checkpoint
- included in the repo-controlled signed-off `Bilibili-first admin/backend/companion MVP` baseline
- prefers the backend `/companion/state-v2` endpoint and falls back to a local stub adapter only for browser degradation
- built into `backend-ts/public/companion`
- served by backend at `/companion`
- copied into the default backend image as a companion static surface
- current backend companion state is synthesized from persisted memory management data when available
- protected companion actions call backend `/companion/actions` with an admin session or API key

## Purpose

This package provides the pet-first UI for the current backend-served companion runtime while keeping external platform trials gated.

## Local Commands

```bash
npm install
npm test
npm run build
npm run dev
```

## Boundary

Describe this package as part of the repo-controlled companion MVP only when the backend-served `/companion`, `/companion/state-v2`, and protected `/companion/actions` checks pass. Do not use it as evidence that QQ / Douyin external platform trials are signed off.
