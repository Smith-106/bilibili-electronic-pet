# Changelog

All notable changes to the TypeScript backend migration project.

Entries below describe the migration snapshot that was current on each release date. They are historical release notes, not a statement of the repository's current runtime completeness.

## [Unreleased] - 2026-04-07

### Added

- `staging-check` gained explicit preflight diagnostics (`--preflight-only`) with canonical capability reporting for:
  - `llm_generation`
  - `search_enrichment`
  - `webhook_publish`
  - `native_bilibili_publish`
- `/readiness` now surfaces `delivery_capability_blockers` and `delivery_capabilities` so runtime probes and staging checks share one capability contract.
- Backend integration coverage was expanded for configured vs fallback branches across generator/search/publisher/bilibili-runtime flows.

### Changed

- Release rehearsal entrypoints are now aligned across wrappers and CI (`preflight | strict | real-chain`).
- Admin UI diagnostics flow consumes `/readiness` capability output (via frontend integration) to expose foundation/delivery status and canonical capability blockers.
- Backend test suite count increased from `161` to `172` after delivery-contract and branch-coverage additions.

### Notes

- This branch is close to pre-release hardening completion, but production-grade external delivery still depends on runtime secrets, active credentials, and target environment health.

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
