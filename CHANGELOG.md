# Changelog

本文件记录 bilibili-electronic-pet 的版本变更。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.2.4] - 2026-07-16

### Fixed

- **test: per-worker SQLite 文件隔离消除 worker-integration flake** (`fc1069d`, ISS-20260710-004)
  - vitest forks pool 多 worker 并发复用模块级 prismaSingleton 写同一 `file:./dev.db` 致 `worker-integration.test.ts` ~40% flake 失败。并发写抛 `PrismaClientKnownRequestError`（写锁），不被 `isPublishLogStorageError` 认（仅认 schema 错误）→ `publishIntentWithResult` findFirst rethrow → outer catch → `published=false` → 断言失败。
  - 修复：`test/setup-memory-db.ts`（setupFiles）用 `VITEST_WORKER_ID` 命名 per-worker 临时 SQLite 文件，`node:sqlite` `DatabaseSync` 同步执行 `prisma/migrations` SQL 建 schema，设 `DATABASE_URL` 指向该文件，`globalThis` once-guard 避免同 worker 多文件重复建。**关键陷阱**：setup 绝不 import `src/lib/prisma.ts`（会在 mock 单元测试的 `vi.mock` 生效前实例化真实 adapter，破坏调用计数断言）。
  - `src/lib/prisma.ts` 与 `isPublishLogStorageError` 零改动（Fix-Don't-Hide：真实 DB 故障 MUST 上浮 readiness 信号）。
- **ui: 12 个管理后台内联 SVG 补 a11y 属性** (`981a5f6`, ISS-20260712-002)
  - `frontend/src/pages/` 下 8 个页面文件的 12 处内联 `<svg>` 补 `aria-hidden="true" focusable="false"`，闭环 ISS-20260712-002，避免屏幕阅读器误读装饰性图标。

### Changed

- **refactor(backoff): backoffMap 模块单例封装为 BackoffStateContainer** (`6bf6557`, MAINT-006)
  - `backend-ts/src/services/backoff-decision.ts` 的模块级裸 `Map<string, BackoffState>` 封装为 `BackoffStateContainer` 类 + `createBackoffStateContainer` 工厂。公共 API（`isPersonaInBackoff` / `applyBackoff` / `rebuildBackoffFromDb`）签名与行为不变，模块仍持有单例 `backoffState`。状态访问统一经容器方法，`__resetBackoffMapForTest` 等测试钩子保留。
  - 纯可维护性重构，非阻塞，无行为变更。全量测试 708/708 绿。

### Internal

- 知识沉淀：ISS-004 flake 修复方案固化为 debug spec `S-20260715-1ubo`；MAINT-006 动机核查（vitest forks pool 模块单例跨文件污染为假想债）固化为 `S-20260715-wrhv`。
- codebase 文档 full rebuild（`--force`）：tech-stack / architecture / features / concerns 四维文档 + doc-index.json（42 components / 5 features）覆盖性重建。

---

## [1.2.3] - 2026-07-13

### Fixed

- review-odyssey-006 收尾：gateway.js render fn F6 同族 null-safe 修复 (`0e95e51`)。

---

## [1.2.2] - 2026-07-12

### Fixed

- review-odyssey-006：errno regex 衡全 + renderTable 自动 title + null-safe + tuple reason 一致性 (`2b52eb4`)。
- review-odyssey-006 confirm rework：NF1 table.js object 值跳过 title + NF2 补 EAI/ENETRESET errno (`d34a62c`)。
- ui: cell-id/cell-truncate 补 title 供 hover 查看完整值 (UI-odyssey 001 sibling) (`8c4d834`)。
- ui: 管理后台 a11y/交互态/响应式/主题修复 (UI-odyssey 001) (`a1fe69c`)。

---

## [1.2.1] - 2026-07-12

### Fixed

- docs: 修复 normalizeFailureReason errno 族注释笔误 (`175744d`)。
- publishWebhook HTTP 非 2xx 路径走 normalize 收敛 + normalizeFailureReason regex 补全 errno 族 (`f74e00a`)。
- publishWebhook 失败 reason 走 normalize 收敛, observability 改两语句守护形式 (`e421b7d`)。
- observability buffer/threshold 与 publisher webhook timeout 补 env 守护 (`b7bf9dc`)。

---

## [1.2.0] - 2026-07-11

### Added

- feat: A 层 BackoffDecision per-persona 退避 cap 600s/60s + DB 重建 + backoff_applied event (`de02ee9`, TASK-004)。
- feat: C 层被动响应 gate 入队前 @自己/关键词过滤 + `PASSIVE_RESPONSE_GATE_ENABLED` (`37e0443`, TASK-003)。
- feat: C 层 per-persona token bucket 速率上限 + reject 区分 + 法律红线 ESLint enforce (`5e15b46`, TASK-006)。
- feat: readiness gate 扩展 three_layer_flags_all_on + behavior_anomaly_count_zero (`733e5ce`, TASK-003)。
- feat: 扩展 PUBLISHER_MODE 加 dry_run + stage 门禁 + STAGE_DAILY_QUOTA 配额 + ramp-up env (`3f99343`, TASK-001)。
- feat: simulated mock -352 注入 postReply config 参数扩展 runtime 注入 fake PostReplyResult (`0698d22`, TASK-002)。
- feat: probeBilibiliAuth 周期调度 14 天存活断言 + readiness auth_probe 标红 (`61545f9`, TASK-005)。
- feat: 离线 replay harness jitterSeed 确定性重放 + CSV + 间隔/昼夜分布断言 (`6c6337d`, TASK-004)。
- feat: eval harness mock -352 端到端 + admin-reporting antirisk groupBy + readiness gate 扩展 (`ac3a7f6`, TASK-007)。
- feat: ISS-005 postReply 暴露 error_code + publisher dispatch platform (`c26a735`, TASK-001)。

### Fixed

- fix: 修复自动发现的 14 个后端 bug (`9a71339`)。
- fix: 修复 quality-review 6 项代码层缺陷 (`a4111d1`)。
- fix: review-odyssey 修复 5 项 fix-不完整缺陷 (`ec666f1`)。
- fix: 守护可选服务 env 数值配置防 NaN 污染 (`d66d521`)。
- fix: env 数值守护补上界防越界大值与 Claude temperature 非法值 (`34e9737`)。

---

## [1.1.0] - 2026-07-10

### Added

- persona 数据源复用 BilibiliCredential.name 接入 recordAntiriskSignal + comment-ingest (`aa97d6a`, TASK-002)。

### Fixed

- 补全 routes-services-coverage-gap TIMING_ENGINE_ENABLED 走 legacy 路径 (`da8b96c`, TASK-005 收尾)。

---

[1.2.4]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.4
[1.2.3]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.3
[1.2.2]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.2
[1.2.1]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.1
[1.2.0]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.2.0
[1.1.0]: https://github.com/Smith-106/bilibili-electronic-pet/releases/tag/v1.1.0
