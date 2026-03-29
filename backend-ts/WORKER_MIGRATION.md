# TypeScript Worker Migration Plan

## 目标
实现与 Python Celery worker 等价的 Node.js 任务队列系统，保持以下语义：
1. 错误分层（RetryableWorkerError / NonRetryableWorkerError）
2. 自动重试策略（autoretry_for / dont_autoretry_for）
3. 退避/抖动/最大重试（retry_backoff / jitter / max_retries）
4. Kill-switch 分支返回
5. 审计日志写入对齐

## 技术选型

### 推荐方案：BullMQ
- **理由**：
  - 成熟的任务队列系统（基于 Redis）
  - 原生支持延迟任务、重试、退避、抖动
  - 内置任务状态跟踪、进度报告
  - 活跃社区 + TypeScript 一流支持
  - 与现有 Redis 基础设施兼容

### 对比：其他方案

| 特性 | BullMQ | Bull (旧版) | Agenda | Graphile Worker |
|------|--------|-------------|--------|-----------------|
| 重试策略 | ✅ 完整 | ✅ 完整 | ⚠️ 有限 | ✅ 完整 |
| 退避/抖动 | ✅ 原生 | ✅ 原生 | ❌ 手动 | ✅ 原生 |
| TypeScript | ✅ 一流 | ⚠️ @types | ⚠️ @types | ✅ 原生 |
| Redis 依赖 | ✅ 是 | ✅ 是 | ✅ 是 | ❌ PostgreSQL |
| 社区活跃度 | 高 | 中（旧版） | 低 | 中 |

## 架构设计

### 1. 错误分层

```typescript
// src/workers/errors.ts
export class NonRetryableWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableWorkerError';
  }
}

export class RetryableWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableWorkerError';
  }
}

export function buildFailureMetadata(
  error: Error,
  retryable: boolean
): Record<string, unknown> {
  return {
    error_type: error.constructor.name,
    error_message: error.message,
    retryable,
  };
}
```

### 2. Worker 配置

```typescript
// src/workers/config.ts
export interface WorkerConfig {
  maxRetries: number;        // 默认 3
  retryBackoff: number;       // 默认 2 秒
  retryJitter: boolean;       // 默认 true
  killSwitch: boolean;        // 从 settings 注入
}

export function buildDefaultWorkerConfig(): WorkerConfig {
  return {
    maxRetries: 3,
    retryBackoff: 2,
    retryJitter: true,
    killSwitch: false, // 从 settings.killSwitch 注入
  };
}
```

### 3. 任务定义

```typescript
// src/workers/tasks/comment-event.task.ts
import { Queue, Worker, Job } from 'bullmq';
import { NonRetryableWorkerError, RetryableWorkerError } from '../errors';

export interface CommentEventPayload {
  comment_id: string;
  video_id?: string;
  user_id?: string;
  content?: string;
  parent_id?: string;
  platform?: string;
  source: string;
  trace_id?: string;
  force_long?: boolean;
  style_profile?: string;
  role_profile?: string;
  role_card_key?: string;
}

export function createCommentEventQueue(queueName = 'comment-event') {
  return new Queue<CommentEventPayload>(queueName, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    },
    defaultJobOptions: {
      attempts: 3,                     // max_retries
      backoff: {
        type: 'exponential',
        delay: 2000,                    // retry_backoff (ms)
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
}

export function createCommentEventWorker(
  queueName = 'comment-event',
  processor: (job: Job<CommentEventPayload>) => Promise<Record<string, unknown>>
) {
  const worker = new Worker<CommentEventPayload>(
    queueName,
    async (job) => {
      // Kill-switch 检查
      if (process.env.KILL_SWITCH === 'true') {
        return {
          ok: false,
          reason: 'kill_switch_enabled',
          trace_id: job.data.trace_id,
        };
      }

      return processor(job);
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }
  );

  // 错误处理：分类可重试/不可重试
  worker.on('failed', (job, err) => {
    if (err instanceof NonRetryableWorkerError) {
      // 不可重试：标记为永久失败
      console.error('NonRetryableWorkerError:', err.message);
    } else if (err instanceof RetryableWorkerError) {
      // 可重试：BullMQ 自动重试
      console.warn('RetryableWorkerError (will retry):', err.message);
    } else {
      // 未分类异常：包装为可重试
      console.error('Unexpected error (will retry):', err);
    }
  });

  return worker;
}
```

### 4. 任务入队

```typescript
// src/workers/enqueue.ts
export function enqueueCommentEvent(
  event: CommentEventPayload,
  queue?: Queue<CommentEventPayload>
): Promise<Job<CommentEventPayload>> {
  const q = queue || createCommentEventQueue();
  return q.add('process-comment-event', event, {
    jobId: event.trace_id, // 幂等性：使用 trace_id 作为 jobId
  });
}
```

### 5. 迁移路径

#### Phase 1: 基础设施
- [ ] 安装 BullMQ: `npm install bullmq ioredis`
- [ ] 创建 Redis 连接配置
- [ ] 创建 Worker 基础类和错误类型

#### Phase 2: 错误分层与重试策略
- [ ] 实现 `NonRetryableWorkerError` / `RetryableWorkerError`
- [ ] 配置 BullMQ 重试策略（attempts, backoff）
- [ ] 实现 kill-switch 检查

#### Phase 3: 任务处理器
- [ ] 迁移 `process_comment_event_task` 核心逻辑
- [ ] 对齐状态机（pending → processing → published/manual_queue/failed）
- [ ] 对齐审计日志格式

#### Phase 4: 测试与验证
- [ ] 单元测试：错误分类、重试行为
- [ ] 集成测试：端到端任务执行
- [ ] 对比测试：Python vs TS worker 输出一致性

## 关键契约对齐

### Python Worker 返回值
```python
# 成功
{
    "ok": True,
    "status": "published" | "manual_queue" | "dedupe_skipped",
    "published_at": "2026-03-28T10:00:00Z",
    "trace_id": "uuid"
}

# Kill-switch
{
    "ok": False,
    "reason": "kill_switch_enabled",
    "trace_id": "uuid"
}
```

### TypeScript Worker 返回值（对齐）
```typescript
// 成功
{
  ok: true,
  status: 'published' | 'manual_queue' | 'dedupe_skipped',
  published_at: '2026-03-28T10:00:00Z',
  trace_id: 'uuid'
}

// Kill-switch
{
  ok: false,
  reason: 'kill_switch_enabled',
  trace_id: 'uuid'
}
```

## 与现有系统集成

### main.ts 集成点
```typescript
// 在 createServer 中注入 worker 依赖
export type ServerDependencies = {
  // ... 现有依赖
  enqueueCommentEvent: (event: CommentEvent) => Promise<{ job_id: string }>;
};
```

### API 端点触发
```typescript
// /events/comment 端点入队任务
app.post('/events/comment', async (request, reply) => {
  const result = await enqueueCommentEvent(event);
  return { ok: true, job_id: result.job_id };
});
```

## 下一步行动
1. 安装 BullMQ 依赖
2. 创建 `src/workers/` 目录结构
3. 实现错误类型和配置
4. 创建任务队列和 worker
5. 编写单元测试验证重试行为
