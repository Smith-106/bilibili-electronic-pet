# Sentinel Journal

## 2026-03-24 - [Admin API Key URL Leakage]
**Learning:** Passing admin credentials via `?api_key=` leaks secrets into browser history, referrers, and logs, so URL-based transport is not acceptable even on internal admin surfaces.
**Action:** Keep API keys in request headers only (`x-api-key`) and avoid query-string credential helpers in frontend code.

## 2026-03-24 - [Dashboard innerHTML injection]
**Vulnerability:** Admin dashboard rendered server-provided error text and JSON payload directly inside template-literal `innerHTML`, which could enable DOM XSS if upstream strings contain HTML/script.
**Learning:** Even internal admin views are untrusted rendering boundaries when they display API responses/errors.
**Prevention:** Insert dynamic strings via `textContent` after creating static markup; reserve `innerHTML` for trusted static scaffolding only.

## 2026-03-25 - [Admin error detail overexposure]
**Vulnerability:** `app/static/admin/admin.js` `getErrorText` returned raw `error.detail` objects and arbitrary messages, exposing backend internals in copyable admin toasts.
**Learning:** Reusing backend `detail` directly at UI layer creates broad leakage risk when one helper is called from many flows.
**Prevention:** Centralize strict allowlist sanitization (code-like tokens only) in shared error helper and fallback to generic messages for everything else.
