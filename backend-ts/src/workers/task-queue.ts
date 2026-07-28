/**
 * Task queue infrastructure using BullMQ
 */

import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { RedisConnectionConfig, buildRedisConnectionConfig } from './config.js';
import { NonRetryableWorkerError, RetryableWorkerError } from './errors.js';
import { recordObservabilityEvent, ensureTraceId } from '../services/observability.js';
import { WorkerConfig, buildDefaultWorkerConfig } from './worker-config.js';

/**
 * Base task payload
 */
export type BaseTaskPayload = {
  trace_id?: string;
};

/**
 * Task processor function type
 */
export type TaskProcessor<P extends BaseTaskPayload> = (job: Job<P>) => Promise<Record<string, unknown>>;

/**
 * Task queue factory
 */
export function createTaskQueue<P extends BaseTaskPayload>(
  queueName: string,
  connection?: RedisConnectionConfig,
): Queue<P> {
  const config = connection ?? buildRedisConnectionConfig();
  const options: QueueOptions = {
    connection: config,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600, // 24 hours
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600, // 7 days
      },
    },
  };

  return new Queue<P>(queueName, options);
}

/**
 * Worker factory with error classification
 */
export function createTaskWorker<P extends BaseTaskPayload>(
  queueName: string,
  processor: TaskProcessor<P>,
  workerConfig?: Partial<WorkerConfig>,
  connection?: RedisConnectionConfig,
): Worker<P> {
  const config = workerConfig ?? buildDefaultWorkerConfig();
  const killSwitch = (config as WorkerConfig).killSwitch ?? false;
  const redisConfig = connection ?? buildRedisConnectionConfig();

  const workerOptions: WorkerOptions = {
    connection: redisConfig,
    limiter: {
      max: 100,
      duration: 60000, // 100 jobs per minute
    },
    // H5 F2 fix: BullMQ default lockDuration=30s < publish+probe duration 触发 stall redelivery
    // → 双 worker race TOCTOU. 加长 lock 到 120s + maxStalledCount=2 (允 1 次重试 stall 后才判死)
    // + stalledInterval=60s (降低 stall 检查频率避免 30s 误判). 与 F1 (safeCreatePublishLog catch
    // P2002 as duplicate-success 用 unique index 兜 TOCTOU window) 成 minimal pair: F2 防触发, F1 兜底.
    lockDuration: 120000,
    maxStalledCount: 2,
    stalledInterval: 60000,
  };

  const worker = new Worker<P>(
    queueName,
    async (job: Job<P>) => {
      // Kill-switch check: throw to mark job as failed (not silently completed)
      if (killSwitch) {
        throw new NonRetryableWorkerError('kill_switch_enabled');
      }

      try {
        return await processor(job);
      } catch (error) {
        // Re-throw classified errors
        if (error instanceof NonRetryableWorkerError) {
          throw error;
        }
        if (error instanceof RetryableWorkerError) {
          throw error;
        }

        // Wrap unknown errors as retryable
        const message = error instanceof Error ? error.message : String(error);
        throw new RetryableWorkerError(message);
      }
    },
    workerOptions,
  );

  // Event handlers
  worker.on('completed', (job: Job<P>, result: Record<string, unknown>) => {
    console.log(`[Worker] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job: Job<P> | undefined, error: Error) => {
    // OBS-001: BullMQ 移入 failed-set 的 job 绕过 processor 的 job_finished 路径,
    // worker 生命周期失败原仅 console, 不可从统一 observability 流追踪.
    // 补 fire-and-forget event 使终态 job 失败可见 (对齐 bilibili-poller:360 pattern).
    void recordObservabilityEvent({
      event_type: 'worker_job_failed',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        job_id: job?.id,
        error_class: error.constructor.name,
        message: error.message,
        retryable: error instanceof RetryableWorkerError,
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'worker_job_failed_event_record_failed',
          job_id: job?.id,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    if (error instanceof NonRetryableWorkerError) {
      console.error(`[Worker] Job ${job?.id} failed (non-retryable):`, error.message);
    } else if (error instanceof RetryableWorkerError) {
      console.warn(`[Worker] Job ${job?.id} failed (will retry):`, error.message);
    } else {
      console.error(`[Worker] Job ${job?.id} failed (unexpected):`, error);
    }
  });

  worker.on('error', (error: Error) => {
    // OBS-001: worker 级致命错 (Redis 断连/stall redeliver) 原仅 console.
    // 补 fire-and-forget event 使 worker 致命错可见.
    void recordObservabilityEvent({
      event_type: 'worker_fatal',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        error_class: error.constructor.name,
        message: error.message,
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'worker_fatal_event_record_failed',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    console.error('[Worker] Worker error:', error);
  });

  return worker;
}

/**
 * Enqueue task with idempotency
 */
export async function enqueueTask<P extends BaseTaskPayload>(
  queue: Queue<P>,
  payload: P,
  jobId?: string,
): Promise<Job<P>> {
  const options = jobId ? { jobId } : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (queue as any).add('process', payload, options);
}

export function normalizeQueueError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'queue_unavailable';
}

export async function tryEnqueueTask<P extends BaseTaskPayload>(
  queue: Queue<P>,
  payload: P,
  jobId?: string,
  options?: Record<string, unknown>,
): Promise<{ queued: true } | { queued: false; error: string }> {
  try {
    const addOptions = {
      ...(options ?? {}),
      ...(jobId ? { jobId } : {}),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (queue as any).add('process', payload, addOptions);
    return { queued: true };
  } catch (error) {
    return {
      queued: false,
      error: normalizeQueueError(error),
    };
  }
}
