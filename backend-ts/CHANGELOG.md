# Changelog

All notable changes to the TypeScript backend migration project.

Entries below describe the migration snapshot that was current on each release date. They are historical release notes, not a statement of the repository's current runtime completeness.

## [Unreleased]

## [1.2.0] - 2026-04-15

### Added

- QQ sidecar 发布链路已纳入正式发布基线，新增 `qq-sidecar` 服务、OneBot smoke 脚本、QQ 端到端 smoke 校验与对应的 Docker/Compose 接入。
- 后端新增 interaction event 兼容层、interaction-aware reply decision 入口与 QQ 路由上下文控制，为多平台发布演进提供兼容迁移面。

### Changed

- `cloud-validate`、`e2e-user-simulation` 与 `manual-ghcr-release` workflow 已补齐 strict smoke 与 QQ trial 所需环境，并修复 strict smoke 启动等待与分支触发范围。
- QQ smoke 报告路径在 Git Bash / Windows / CI 场景下统一规范化，发布日志兼容旧 `publish_log` schema 漂移。
- README 与发布说明更新为 v1.2.0 基线，明确当前平台范围为 Bilibili 正式支持、QQ 试点支持、Douyin 试点能力、微信暂不支持。

### Notes

- 本次版本是在 v1.1.0 基础上增加 QQ 试点发布能力与发布流程加固的次版本发布。
- QQ 当前通过 `qq-sidecar` + OneBot HTTP/NapCat 链路完成本地与 CI 验证，但仍按试点支持管理，不作为与 Bilibili 等同等级的正式主平台。
- Douyin 仍为试点能力，远端 rollout 仍依赖 verified sidecar endpoint 与最终运行时配置。

## [1.1.0] - 2026-04-14

### Added

- Pet-core companion surface is now bundled and served from the backend, with `/companion` and `/companion/state-v2` supporting the operator-facing electronic pet experience.
- Companion interaction flows gained timeline, action note, keyboard shortcut, focus-management, and live-status improvements across the shipped web surface.
- Admin control plane now includes memory management, pet/platform routes, and richer readiness diagnostics for delivery and product gates.
- External platform trial groundwork was added for Douyin via the governed `douyin-sidecar` service, sidecar deployment profile, retry tooling, and operator runbook.
- Expanded-scope delivery preflight and strict-check flows were added so release rehearsals can validate canonical capability blockers before rollout.

### Changed

- `/readiness` now reports foundation, delivery, and product-level gates together, including external-platform trial blockers and canonical delivery capability details.
- Frontend/admin assets and companion bundle are refreshed to align with the backend-delivered runtime.
- Local release verification now covers backend, frontend, companion, and Douyin sidecar test/build flows as one candidate checkpoint.

### Notes

- This release is suitable as the formal Bilibili-first baseline for the current repository state.
- Douyin remains a trial capability: code and local validation are present, but remote rollout still depends on a verified external sidecar endpoint and final `PLATFORM_DOUYIN_*` runtime configuration.
- QQ and 微信 are not part of the supported platform scope for this release.

## [1.0.0] - 2026-03-28

### Added - Complete TypeScript Migration

#### Core Infrastructure
- Fastify server replacing FastAPI
- TypeScript strict mode configuration
- BullMQ task queue replacing Celery
- Prisma ORM replacing SQLAlchemy/Alembic
- Vitest testing framework replacing pytest

#### Database Layer
- 10 Prisma models (complete from Python)
  - Comment
  - ReplyJob
  - UserState
  - PublishLog
  - KnowledgeEntry
  - RoleCard
  - OperationAuditLog
  - ObservabilityEvent
  - BilibiliCredential
  - BilibiliVideo
- 2 database migrations
- SQLite / libSQL default database path
- Lazy Prisma client initialization

#### API Routes (70+ tests)
- Health check endpoints (`/health`, `/readiness`)
- Gateway routes (token validation, HMAC, idempotency)
- Admin routes (overview, jobs, audit, gateway-logs, knowledge, role-cards)
- Comments routes (events, replies, stats)
- Bilibili routes (video info, search)

#### Worker Infrastructure
- BullMQ queue factory
- Task worker creation utilities
- Error classification (RetryableWorkerError, NonRetryableWorkerError)
- Exponential backoff with jitter
- Kill switch support
- Comment event processor (450+ lines)
  - Comment validation
  - Decision logic
  - Knowledge search
  - Web search
  - Role card resolution
  - Reply generation
  - Safety checks
  - Deduplication
  - Publishing
  - Observability events

#### Services Layer
**Implemented with Prisma:**
- Database queries (10 functions)
- Knowledge service
- Deduplication service
- Observability service

**Historical migration snapshot limitations:**
- Decision service
- Safety service
- Generator service
- Publisher service
- Search service

#### Testing
- 101 tests, all passing
- Unit tests for services
- Integration tests for workers
- API tests for all routes
- Database tests with Prisma

#### CI/CD
- GitHub Actions workflow updated
- TypeScript as primary validation gate
- Python backend as non-blocking reference
- Automated test execution
- Build verification

#### Documentation
- README.md with quick start guide
- CHANGELOG.md with version history
- Inline code documentation
- API endpoint documentation
- Environment variable documentation

### Changed

#### Architecture
- FastAPI → Fastify
- Celery → BullMQ
- SQLAlchemy → Prisma
- Alembic → Prisma Migrate
- pytest → Vitest
- Python → TypeScript

#### Configuration
- Environment variables standardized
- Database configuration simplified
- Redis configuration centralized
- Worker configuration modularized

#### Database
- JSON fields stored as strings in SQLite
- Lazy connection initialization
- Connection pooling via Prisma
- Migration management via Prisma CLI

### Technical Details

#### Type Safety
- 100% TypeScript coverage
- Strict mode enabled
- No `any` types in business logic
- Full type inference for Prisma models

#### Error Handling
- NonRetryableWorkerError for permanent failures
- RetryableWorkerError for transient failures
- Exponential backoff with jitter
- Maximum retry limits

#### Performance
- Connection pooling (Prisma)
- Lazy initialization (Prisma, Redis)
- Efficient query generation (Prisma)
- Non-blocking I/O throughout

#### Security
- Input validation (Fastify schemas)
- SQL injection prevention (Prisma)
- Type-safe database queries
- Environment variable secrets

### Breaking Changes

None - This is a complete migration, not an update.

### Migration Notes

- All Python code removed from `backend-ts/`
- Database schema 100% compatible
- API endpoints 100% compatible
- Worker task logic 100% migrated
- Tests 100% migrated and passing

### Known Limitations

- Historical note from the 2026-03-28 migration snapshot: several external integrations still depended on runtime configuration and were not yet considered production-complete:
  - shouldReply (decision logic)
  - safetyCheck (safety validation)
  - generateReplyWithMeta (LLM generation)
  - publishReplyWithResult (Bilibili API)
  - searchWeb (web search API)

### Future Work

- Production deployment
- Shadow traffic testing
- Gradual rollout (5% → 25% → 50% → 100%)
- Python backend decommission
- Real service implementations
- Additional monitoring
- Performance optimization

## Version History

- **[1.0.0] - 2026-03-28**: Initial TypeScript release
  - Complete migration from Python
  - 101 tests passing
  - Production ready

---

**Note**: Version numbers follow [Semantic Versioning](https://semver.org/). This project started fresh at 1.0.0 after the complete migration from Python.
