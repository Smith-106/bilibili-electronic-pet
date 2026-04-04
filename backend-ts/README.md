# Bilibili Electronic Pet Backend (TypeScript)

TypeScript/Fastify backend for the Bilibili Electronic Pet project. Fully migrated from Python/FastAPI.

## Status

✅ **TypeScript Runtime Established** - Fastify API, BullMQ worker, Prisma schema, and Vite admin bundle are in the active codebase
✅ **Tests Passing** - 110 tests passing in the current backend suite
⚠️ **External Delivery Depends on Configuration** - LLM, search, webhook, and native Bilibili publishing paths still require runtime credentials and environment setup

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

- `shouldReply` - Decision logic (needs LLM or rule engine)
- `safetyCheck` - Safety validation (needs LLM or rules)
- `generateReplyWithMeta` - LLM generation (needs OpenAI/Claude API)
- `publishReplyWithResult` - Bilibili API (needs credentials)
- `searchWeb` - Web search (needs search API)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- test/workers.test.ts
```

**Test Coverage**: 110 tests, all passing

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
# Type check
npm run build

# Formatting / linting scripts are not wired yet in this package
# Prefer running the build + test commands above as the current validation gate
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
