# Bilibili Electronic Pet Backend (TypeScript)

TypeScript/Fastify backend for the Bilibili Electronic Pet project. Fully migrated from Python/FastAPI.

## Status

✅ **TypeScript Runtime Established** - Fastify API, BullMQ worker, Prisma schema, and Vite admin bundle are in the active codebase
✅ **Tests Passing** - 187 tests passing in the current backend suite
✅ **Validated Baseline (2026-04-07)** - backend 177 tests passed, frontend 27 tests passed, and both backend/frontend builds passed
⚠️ **Candidate Checkpoint (2026-04-08)** - the current route-extraction snapshot passed targeted backend regression (`test/main.test.ts`, `test/admin-defaults.test.ts`, 98 tests) and the backend build, but it remains a candidate checkpoint and does not replace the 2026-04-07 verified baseline
✅ **Signed-Off Rollout Baseline (2026-04-08 / 2026-04-09 truth sync)** - the native Bilibili public-domain path reached `GO` and remains the authoritative rollout baseline
✅ **Current Local Checkpoint** - follow-up validation is green while isolated non-runtime surfaces are preserved in-repo
✅ **Native Public Real-Chain (2026-04-08)** - the deployed pre-release smoke target at `https://pet.nikoniko.tech` passed fresh preflight, strict, and native real-chain validation
✅ **Preflight Diagnostics Available** - `staging-check` can now report external-delivery prerequisites before runtime validation
✅ **Delivery Capability Contract Aligned** - `/readiness` and `staging-check` now share canonical capability names and blocker semantics
✅ **Native Real-Chain Gate Hardened** - `real_auth_ready` now depends on a runtime auth probe instead of credential-field presence alone
✅ **Branch-Specific Delivery Scope Closed** - the current signoff certifies the native Bilibili rollout path on the public smoke domain
⚠️ **Memory Domain Feed Enabled** - `src/app/memory` is exposed through admin-management endpoints and now receives automatic companion-feed writes from worker/admin approval outcomes, but it is still not part of the core publish contract

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **ORM**: Prisma
- **Database**: SQLite / libSQL (`file:` database URLs by default)
- **Task Queue**: BullMQ + Redis
- **Testing**: Vitest
- **Language**: TypeScript (strict mode)

## Project Structure

```
backend-ts/
├── src/
│   ├── index.ts          # Process entrypoint
│   ├── main.ts           # Fastify service and route registration
│   ├── app/              # App-layer candidate modules (memory currently isolated)
│   ├── infra/            # Infra-layer candidate modules (memory repository currently isolated)
│   ├── services/         # Business logic services
│   ├── workers/          # BullMQ task processors
│   ├── models/           # TypeScript type definitions
│   └── lib/              # Prisma bootstrap and shared helpers
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── test/               # Test suites
└── package.json        # Dependencies
```

## Quick Start

### Install Dependencies

```bash
npm install
```

### Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### Run Development Server

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Worker
WORKER_MAX_RETRIES=3
WORKER_RETRY_BACKOFF=2
WORKER_RETRY_JITTER=true

# Application
KILL_SWITCH=false
ROLE_PROFILE_DEFAULT=doro
```

## API Endpoints

### Health Check

- `GET /health` - Basic health check
- `GET /readiness` - Readiness check (includes dependencies)
- `/readiness` also exposes `delivery_capability_blockers` and `delivery_capabilities` for canonical external-delivery diagnostics

### Gateway

- `POST /gateway/publish` - Publish reply to comment
- Headers: `Authorization: Bearer <token>`, `X-Signature` (optional)

### Admin

- `GET /api/admin/overview` - Admin overview probe
- `GET /api/admin/jobs` - Admin job list
- `GET /api/admin/audit/summary` - Audit summary for the admin UI
- `GET /api/admin/gateway/logs` - Gateway log list
- `GET /api/admin/knowledge` - Knowledge base entries
- `GET /api/admin/role-cards` - Role cards
- `GET /api/admin/bilibili/status` - Bilibili diagnostics

### Query / Compatibility

- `GET /api/jobs/:job_id` and `GET /jobs/:job_id` - Job detail
- `POST /api/jobs/:job_id/retry` and `POST /jobs/:job_id/retry` - Retry one job
- `POST /api/jobs/:job_id/approve` and `POST /jobs/:job_id/approve` - Approve one job
- `POST /api/jobs/approve-batch` and `POST /jobs/approve-batch` - Batch approve
- `POST /api/jobs/retry-batch` and `POST /jobs/retry-batch` - Batch retry
- `GET /api/comments/:comment_id` and `GET /comments/:comment_id` - Comment detail
- `GET /api/audit-logs`, `GET /api/audit-log`, and `GET /audit-logs` - Audit log list
- `GET /api/metrics/daily` and `GET /metrics/daily` - Daily metrics

### Comments

- `POST /events/comment` - Generic comment event ingress
- `POST /events/comment/bilibili` - Bilibili-tagged comment ingress
- `POST /events/comment/douyin` - Douyin-tagged comment ingress
- `POST /events/comment/kuaishou` - Kuaishou-tagged comment ingress

### Bilibili

- `GET /api/admin/bilibili/videos` - Video monitor list
- `POST /api/admin/bilibili/videos` - Add monitored video
- `POST /api/admin/bilibili/poll` - Trigger poll
- `GET /api/admin/bilibili/credentials` - Credential list

## Isolated Candidate Surfaces

### Memory Domain

The repository currently includes an isolated memory-domain candidate with a lightweight admin-management contract:

- `src/app/memory/`
- `src/infra/db/repositories/memory-repository.ts`
- Prisma models for memory spaces, grants, items, and identity links
- admin endpoints under:
  - `GET/POST /api/admin/memory/spaces`
  - `GET/POST /api/admin/memory/items`
  - `GET/POST /api/admin/memory/grants`
  - `GET/POST /api/admin/memory/identity-links`

Current status:

- preserved in the local checkpoint
- covered by repository/service tests
- wired into the admin-management surface for explicit operator access
- receives automatic companion-feed updates from worker outcomes and admin approval publish events
- now visible in the shipped admin frontend as a dedicated management page
- now also feeds the public `/companion/state` summary that hydrates the companion surface

Treat this as candidate scope with an explicit management contract, not as a core business-runtime capability.

### Companion Surface

The repository also includes a separately hosted companion prototype:

- source package: `../pet-companion-web`
- backend-served path: `/companion`
- backend state endpoint: `/companion/state`
- production image path: `public/companion`

Current status:

- backend can serve the built companion surface
- the surface remains prototype-oriented and local-stub based
- it is not part of the signed-off Bilibili admin/operator runtime contract

## Database Models

- **Comment** - User comments
- **ReplyJob** - Reply task queue
- **UserState** - User deduplication state
- **PublishLog** - Publish history
- **KnowledgeEntry** - Knowledge base
- **RoleCard** - Role configurations
- **OperationAuditLog** - Audit trail
- **ObservabilityEvent** - Observability events
- **BilibiliCredential** - Bilibili API credentials
- **BilibiliVideo** - Video monitoring config

## Worker Tasks

### Comment Event Processor

Processes comment events and generates replies:

1. Validate comment
2. Decision: Should reply?
3. Knowledge search
4. Web search (optional)
5. Role card resolution
6. Reply generation
7. Safety check
8. Deduplication
9. Publish reply

## Services

### Database Services (✅ Implemented)

- `getCommentByCanonicalId` - Get comment by ID
- `createReplyJob` - Create reply job
- `getUserState` / `updateUserState` - User state management
- `getRoleCardByKey` / `getActiveRoleCard` - Role card queries
- `searchKnowledge` - Knowledge base search
- `isRecentDuplicate` / `rememberReplyPhrase` - Deduplication
- `getPublishLogByCanonicalId` / `createPublishLog` - Publish logs

### Runtime-Dependent Services (⚠️ Need Environment Setup)

- `shouldReply` - Decision logic (behavior depends on configured rules and runtime model setup)
- `safetyCheck` - Safety validation (rule-driven by default, tunable through runtime config)
- `generateReplyWithMeta` - Real LLM generation (OpenAI/Claude need credentials; mock fallback remains available)
- `publishReplyWithResult` - External delivery path (webhook or native Bilibili credentials and switches required)
- `searchWeb` - Search enhancement (needs a configured search provider)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run lint and formatting checks
npm run lint
npm run format

# Apply formatting fixes
npm run format:write

# Run staging validation
npm run staging:check -- --base-url http://127.0.0.1:18000

# Run specific test file
npm test -- test/workers.test.ts
```

**Test Coverage**: 177 tests, all passing

Validated on 2026-04-07: backend 177 tests passed, frontend 27 tests passed, and both backend/frontend builds passed. Current release framing is repo-local closed, environment gated.

## Staging Validation

See [STAGING_VALIDATION.md](./STAGING_VALIDATION.md) for:

- `--preflight-only` prerequisite inspection before runtime validation
- baseline / strict / pre-release real-chain validation modes
- the staging environment variable matrix
- `smoke.sh` / `smoke.ps1` wrapper usage
- mode aliases in wrappers: `preflight`, `strict`, `real-chain`
- JSON reports for preflight / pass / fail outcomes
- `runtime_summary` and `input_scopes` in strict/real-chain reports so checker-env context is separated from target-runtime state

## Deployment

### Production Build

```bash
npm run build
```

### Production Database

```bash
# Set production DATABASE_URL (local SQLite/libSQL-style path by default)
export DATABASE_URL="file:/app/data/dev.db"

# Run migrations
npx prisma migrate deploy
```

### Start Production Server

```bash
npm start
```

See the repository root [README.md](../README.md) for the current deployment and runtime checklist.

## Development

### Database Schema Changes

```bash
# Modify prisma/schema.prisma
npx prisma migrate dev --name describe_change
```

### Code Quality

```bash
# Type check / build
npm run build

# Lint source and tests
npm run lint

# Check formatting
npm run format

# Rewrite files to the configured style
npm run format:write
```

## Migration from Python

This backend is the active TypeScript migration target from Python/FastAPI. Refer to the repository root [README.md](../README.md) for:

- Migration timeline
- Technology changes
- API compatibility
- Deployment strategy
- Rollback plan

## Monitoring

Key metrics to monitor:
- API latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Queue depth (BullMQ)
- Database query performance
- Memory usage
- CPU usage

## License

Private project - All rights reserved

## Support

For issues or questions, contact the development team.
