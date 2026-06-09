import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildDefaultWorkerConfigMock,
  buildRedisConnectionConfigMock,
  queueConstructorMock,
  workerConstructorMock,
  workerInstances,
} = vi.hoisted(() => {
  const instances: Array<{
    queueName: string;
    processor: (job: { data: { trace_id?: string } }) => Promise<Record<string, unknown>>;
    options: Record<string, unknown>;
    handlers: Record<string, (...args: unknown[]) => void>;
    on: ReturnType<typeof vi.fn>;
  }> = [];

  const queueMock = vi.fn(function (
    this: { queueName: string; options: Record<string, unknown> },
    queueName: string,
    options: Record<string, unknown>,
  ) {
    this.queueName = queueName;
    this.options = options;
  });

  const workerMock = vi.fn(function (
    this: (typeof instances)[number],
    queueName: string,
    processor: (job: { data: { trace_id?: string } }) => Promise<Record<string, unknown>>,
    options: Record<string, unknown>,
  ) {
    this.queueName = queueName;
    this.processor = processor;
    this.options = options;
    this.handlers = {};
    this.on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      this.handlers[event] = handler;
      return this;
    });
    instances.push(this);
  });

  return {
    buildDefaultWorkerConfigMock: vi.fn(() => ({
      killSwitch: false,
      maxRetries: 3,
      retryBackoff: 2,
      retryJitter: true,
    })),
    buildRedisConnectionConfigMock: vi.fn(() => ({
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    })),
    queueConstructorMock: queueMock,
    workerConstructorMock: workerMock,
    workerInstances: instances,
  };
});

vi.mock('bullmq', () => ({
  Job: vi.fn(),
  Queue: queueConstructorMock,
  Worker: workerConstructorMock,
}));

vi.mock('../src/workers/config.js', () => ({
  buildRedisConnectionConfig: buildRedisConnectionConfigMock,
}));

vi.mock('../src/workers/worker-config.js', () => ({
  buildDefaultWorkerConfig: buildDefaultWorkerConfigMock,
}));

import { NonRetryableWorkerError, RetryableWorkerError } from '../src/workers/errors.js';
import {
  createTaskQueue,
  createTaskWorker,
  enqueueTask,
  normalizeQueueError,
  tryEnqueueTask,
} from '../src/workers/task-queue.js';

describe('task queue infrastructure', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    workerInstances.splice(0);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('creates queues with default retry and retention options', () => {
    const queue = createTaskQueue('comment-event');

    expect(queue).toBeInstanceOf(queueConstructorMock);
    expect(buildRedisConnectionConfigMock).toHaveBeenCalledOnce();
    expect(queueConstructorMock).toHaveBeenCalledWith(
      'comment-event',
      expect.objectContaining({
        connection: expect.objectContaining({ host: '127.0.0.1' }),
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100, age: 24 * 3600 },
          removeOnFail: { count: 500, age: 7 * 24 * 3600 },
        }),
      }),
    );
  });

  it('uses an explicit queue connection when provided', () => {
    const connection = { host: 'redis.local', port: 6380, maxRetriesPerRequest: null };

    createTaskQueue('custom-queue', connection);

    expect(buildRedisConnectionConfigMock).not.toHaveBeenCalled();
    expect(queueConstructorMock).toHaveBeenCalledWith('custom-queue', expect.objectContaining({ connection }));
  });

  it('runs processors through createTaskWorker and registers event handlers', async () => {
    const processor = vi.fn(async () => ({ ok: true }));

    const worker = createTaskWorker('comment-event', processor);
    const instance = workerInstances[0];
    const result = await instance.processor({ data: { trace_id: 'trace-1' } });

    expect(worker).toBeInstanceOf(workerConstructorMock);
    expect(buildDefaultWorkerConfigMock).toHaveBeenCalledOnce();
    expect(workerConstructorMock).toHaveBeenCalledWith(
      'comment-event',
      expect.any(Function),
      expect.objectContaining({
        connection: expect.objectContaining({ host: '127.0.0.1' }),
        limiter: { max: 100, duration: 60000 },
      }),
    );
    expect(result).toEqual({ ok: true });
    expect(processor).toHaveBeenCalledWith({ data: { trace_id: 'trace-1' } });
    expect(instance.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(instance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(instance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('short-circuits workers when kill switch is enabled', async () => {
    const processor = vi.fn(async () => ({ ok: true }));

    createTaskWorker('comment-event', processor, { killSwitch: true });
    const result = await workerInstances[0].processor({ data: { trace_id: 'trace-kill' } });

    expect(result).toEqual({
      ok: false,
      reason: 'kill_switch_enabled',
      trace_id: 'trace-kill',
    });
    expect(processor).not.toHaveBeenCalled();
  });

  it('supports legacy enabled flag as a kill switch', async () => {
    const processor = vi.fn(async () => ({ ok: true }));

    createTaskWorker('comment-event', processor, { enabled: true } as never);
    const result = await workerInstances[0].processor({ data: {} });

    expect(result).toEqual({
      ok: false,
      reason: 'kill_switch_enabled',
      trace_id: undefined,
    });
  });

  it('preserves known worker errors and wraps unknown failures as retryable', async () => {
    const nonRetryable = new NonRetryableWorkerError('bad input');
    createTaskWorker('non-retry', async () => {
      throw nonRetryable;
    });
    await expect(workerInstances[0].processor({ data: {} })).rejects.toBe(nonRetryable);

    const retryable = new RetryableWorkerError('retry me');
    createTaskWorker('retry', async () => {
      throw retryable;
    });
    await expect(workerInstances[1].processor({ data: {} })).rejects.toBe(retryable);

    createTaskWorker('unknown-error', async () => {
      throw new Error('db offline');
    });
    await expect(workerInstances[2].processor({ data: {} })).rejects.toThrow(RetryableWorkerError);
    await expect(workerInstances[2].processor({ data: {} })).rejects.toThrow('db offline');

    createTaskWorker('unknown-value', async () => {
      throw 'plain failure';
    });
    await expect(workerInstances[3].processor({ data: {} })).rejects.toThrow('plain failure');
  });

  it('logs completed, failed, and worker error events', () => {
    createTaskWorker('comment-event', async () => ({ ok: true }));
    const handlers = workerInstances[0].handlers;

    handlers.completed({ id: 'job-1' }, { ok: true });
    handlers.failed({ id: 'job-2' }, new NonRetryableWorkerError('bad input'));
    handlers.failed({ id: 'job-3' }, new RetryableWorkerError('retry me'));
    handlers.failed(undefined, new Error('unexpected'));
    handlers.error(new Error('worker down'));

    expect(consoleLogSpy).toHaveBeenCalledWith('[Worker] Job job-1 completed:', { ok: true });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Worker] Job job-2 failed (non-retryable):', 'bad input');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Worker] Job job-3 failed (will retry):', 'retry me');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Worker] Job undefined failed (unexpected):', expect.any(Error));
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Worker] Worker error:', expect.any(Error));
  });

  it('enqueues tasks with optional job id', async () => {
    const add = vi.fn(async () => ({ id: 'job-1' }));
    const queue = { add };

    await expect(enqueueTask(queue as never, { trace_id: 'trace-1' }, 'job-id-1')).resolves.toEqual({
      id: 'job-1',
    });
    await enqueueTask(queue as never, { trace_id: 'trace-2' });

    expect(add).toHaveBeenNthCalledWith(1, 'process', { trace_id: 'trace-1' }, { jobId: 'job-id-1' });
    expect(add).toHaveBeenNthCalledWith(2, 'process', { trace_id: 'trace-2' }, undefined);
  });

  it('normalizes queue errors and returns try-enqueue results', async () => {
    expect(normalizeQueueError(new Error(' redis offline '))).toBe('redis offline');
    expect(normalizeQueueError(new Error('   '))).toBe('queue_unavailable');
    expect(normalizeQueueError('plain failure')).toBe('queue_unavailable');

    const add = vi.fn().mockResolvedValueOnce({ id: 'job-1' }).mockRejectedValueOnce(new Error(' redis offline '));
    const queue = { add };

    await expect(
      tryEnqueueTask(queue as never, { trace_id: 'trace-1' }, 'job-id-1', {
        attempts: 5,
      }),
    ).resolves.toEqual({ queued: true });
    await expect(tryEnqueueTask(queue as never, { trace_id: 'trace-2' })).resolves.toEqual({
      queued: false,
      error: 'redis offline',
    });
    expect(add).toHaveBeenNthCalledWith(
      1,
      'process',
      { trace_id: 'trace-1' },
      {
        attempts: 5,
        jobId: 'job-id-1',
      },
    );
    expect(add).toHaveBeenNthCalledWith(2, 'process', { trace_id: 'trace-2' }, {});
  });

  it('builds real worker and redis configs from environment fallbacks and overrides', async () => {
    const previousEnv = {
      WORKER_MAX_RETRIES: process.env.WORKER_MAX_RETRIES,
      WORKER_RETRY_BACKOFF: process.env.WORKER_RETRY_BACKOFF,
      WORKER_RETRY_JITTER: process.env.WORKER_RETRY_JITTER,
      KILL_SWITCH: process.env.KILL_SWITCH,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_DB: process.env.REDIS_DB,
    };
    const workerConfig = await vi.importActual<typeof import('../src/workers/worker-config.js')>(
      '../src/workers/worker-config.js',
    );
    const redisConfig = await vi.importActual<typeof import('../src/workers/config.js')>('../src/workers/config.js');

    try {
      delete process.env.WORKER_MAX_RETRIES;
      delete process.env.WORKER_RETRY_BACKOFF;
      delete process.env.WORKER_RETRY_JITTER;
      delete process.env.KILL_SWITCH;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_DB;

      expect(workerConfig.buildDefaultWorkerRetryConfig()).toEqual({
        maxRetries: 3,
        retryBackoff: 2,
        retryJitter: true,
      });
      expect(workerConfig.buildDefaultWorkerKillSwitchConfig()).toEqual({ killSwitch: false });
      expect(workerConfig.buildDefaultWorkerConfig()).toEqual({
        maxRetries: 3,
        retryBackoff: 2,
        retryJitter: true,
        killSwitch: false,
      });
      expect(workerConfig.secondsToMs(2.5)).toBe(2500);
      expect(redisConfig.buildRedisConnectionConfig()).toEqual({
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      process.env.WORKER_MAX_RETRIES = '5';
      process.env.WORKER_RETRY_BACKOFF = '9';
      process.env.WORKER_RETRY_JITTER = 'false';
      process.env.KILL_SWITCH = 'true';
      process.env.REDIS_HOST = 'redis.local';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'secret';
      process.env.REDIS_DB = '2';

      expect(workerConfig.buildDefaultWorkerConfig()).toEqual({
        maxRetries: 5,
        retryBackoff: 9,
        retryJitter: false,
        killSwitch: true,
      });
      expect(redisConfig.buildRedisConnectionConfig()).toEqual({
        host: 'redis.local',
        port: 6380,
        password: 'secret',
        db: 2,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      process.env.REDIS_PORT = 'not-a-port';
      process.env.REDIS_DB = 'not-a-db';
      expect(redisConfig.buildRedisConnectionConfig()).toMatchObject({
        port: 6379,
        db: 0,
      });
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
