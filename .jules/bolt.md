## 2026-03-22 - [Rate Limiter Hot Path]
**Learning:** The Bilibili integration hits `RateLimiter` before every external API call, so list-rebuild pruning turns request bursts into unnecessary O(n) work as polling volume grows.
**Action:** Keep sliding-window counters in queue-like structures here and benchmark expired-entry cleanup before touching higher-level poller logic.
