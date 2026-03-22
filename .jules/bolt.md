## 2026-03-22 - [Rate Limiter Hot Path]
**Learning:** The Bilibili integration hits `RateLimiter` before every external API call, so list-rebuild pruning turns request bursts into unnecessary O(n) work as polling volume grows.
**Action:** Keep sliding-window counters in queue-like structures here and benchmark expired-entry cleanup before touching higher-level poller logic.

## 2026-03-22 - [Poller Double Commit]
**Learning:** Successful Bilibili polls were committing the same BilibiliVideo row twice, so healthy polling throughput paid two transaction round-trips with no extra state durability.
**Action:** When helper methods update a row that the caller is already finalizing, defer the helper commit and batch related status fields into one transaction.

## 2026-03-22 - [Observability Summary Re-Scans]
**Learning:** The admin observability summary was re-counting the same filtered event window per status branch, so one dashboard refresh fanned out into avoidable repeated aggregate scans.
**Action:** For dashboard summaries over the same time window, group once by status and derive totals in Python before reaching for caching or larger architectural changes.
