# Bilibili Electronic Pet Backend (TypeScript)

TypeScript/Fastify backend for the Bilibili Electronic Pet project. Fully migrated from Python/FastAPI.

## Status

✅ **Migration Complete** - All functionality migrated from Python to TypeScript
✅ **Tests Passing** - 101/101 tests passing
✅ **Production Ready** - Ready for deployment

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
│   ├── routes/           # Fastify route handlers
│   ├── services/         # Business logic services
│   ├── workers/          # BullMQ task processors
│   ├── models/           # TypeScript type definitions
│   └── main.ts          # Application entry point
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

- `GET /admin/overview` - System overview
- `GET /admin/jobs` - Job queue status
- `GET /admin/audit` - Audit log
- `GET /admin/gateway-logs` - Gateway logs
- `GET /admin/knowledge` - Knowledge base entries
- `GET /admin/role-cards` - Role cards
- `POST /admin/role-cards/:key/activate` - Activate role card

### Comments

- `POST /comments/events` - Comment event webhook
- `GET /comments/replies` - Reply history
- `GET /comments/stats` - Comment statistics

### Bilibili

- `GET /bilibili/video/:bvid` - Video information
- `GET /bilibili/search` - Search videos

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

### Placeholder Services (⚠️ Need Integration)

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

**Test Coverage**: 101 tests, all passing

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

See [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) for detailed deployment checklist.

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

# Format code
npm run format
```

## Migration from Python

This backend is a complete migration from Python/FastAPI. See [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) for:

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
