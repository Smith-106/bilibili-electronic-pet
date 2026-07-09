/**
 * Task queue infrastructure using BullMQ
 */

import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { RedisConnectionConfig, buildRedisConnectionConfig } from './config.js';
import { NonRetryableWorkerError, RetryableWorkerError } from './errors.js';
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
    if (error instanceof NonRetryableWorkerError) {
      console.error(`[Worker] Job ${job?.id} failed (non-retryable):`, error.message);
    } else if (error instanceof RetryableWorkerError) {
      console.warn(`[Worker] Job ${job?.id} failed (will retry):`, error.message);
    } else {
      console.error(`[Worker] Job ${job?.id} failed (unexpected):`, error);
    }
  });

  worker.on('error', (error: Error) => {
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
