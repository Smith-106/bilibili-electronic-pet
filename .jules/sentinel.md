# Sentinel Journal

## 2026-03-24 - [Admin API Key URL Leakage]
**Learning:** Passing admin credentials via `?api_key=` leaks secrets into browser history, referrers, and logs, so URL-based transport is not acceptable even on internal admin surfaces.
**Action:** Keep API keys in request headers only (`x-api-key`) and avoid query-string credential helpers in frontend code.
