import { describe, expect, it } from 'vitest';

import {
  NonRetryableWorkerError,
  RetryableWorkerError,
  buildFailureMetadata,
  classifyError,
} from '../src/workers/errors.js';

import {
  buildDefaultWorkerConfig,
  buildDefaultWorkerRetryConfig,
  buildDefaultWorkerKillSwitchConfig,
  secondsToMs,
} from '../src/workers/worker-config.js';

describe('worker error classification', () => {
  it('creates non-retryable worker error', () => {
    const error = new NonRetryableWorkerError('input invalid');
    expect(error.name).toBe('NonRetryableWorkerError');
    expect(error.message).toBe('input invalid');
    expect(error).toBeInstanceOf(Error);
  });

  it('creates retryable worker error', () => {
    const error = new RetryableWorkerError('network timeout');
    expect(error.name).toBe('RetryableWorkerError');
    expect(error.message).toBe('network timeout');
    expect(error).toBeInstanceOf(Error);
  });

  it('builds failure metadata for non-retryable error', () => {
    const error = new NonRetryableWorkerError('comment_id_missing');
    const metadata = buildFailureMetadata(error, false);

    expect(metadata).toEqual({
      error_type: 'NonRetryableWorkerError',
      error_message: 'comment_id_missing',
      retryable: false,
    });
  });

  it('builds failure metadata for retryable error', () => {
    const error = new RetryableWorkerError('db connection lost');
    const metadata = buildFailureMetadata(error, true);

    expect(metadata).toEqual({
      error_type: 'RetryableWorkerError',
      error_message: 'db connection lost',
      retryable: true,
    });
  });

  it('classifies non-retryable error', () => {
    const error = new NonRetryableWorkerError('invalid payload');
    expect(() => classifyError(error)).toThrow(NonRetryableWorkerError);
    expect(() => classifyError(error)).toThrow('invalid payload');
  });

  it('classifies retryable error', () => {
    const error = new RetryableWorkerError('timeout');
    expect(() => classifyError(error)).toThrow(RetryableWorkerError);
    expect(() => classifyError(error)).toThrow('timeout');
  });

  it('wraps unknown error as retryable', () => {
    const error = new Error('unexpected failure');
    expect(() => classifyError(error)).toThrow(RetryableWorkerError);
    expect(() => classifyError(error)).toThrow('unexpected failure');
  });

  it('wraps non-error as retryable', () => {
    expect(() => classifyError('string error')).toThrow(RetryableWorkerError);
    expect(() => classifyError('string error')).toThrow('string error');
  });
});

describe('worker config', () => {
  it('builds default worker config', () => {
    const config = buildDefaultWorkerConfig();

    expect(config).toHaveProperty('maxRetries');
    expect(config).toHaveProperty('retryBackoff');
    expect(config).toHaveProperty('retryJitter');
    expect(config).toHaveProperty('enabled');

    expect(typeof config.maxRetries).toBe('number');
    expect(typeof config.retryBackoff).toBe('number');
    expect(typeof config.retryJitter).toBe('boolean');
    expect(typeof config.enabled).toBe('boolean');
  });

  it('builds default retry config', () => {
    const config = buildDefaultWorkerRetryConfig();

    expect(config.maxRetries).toBeGreaterThanOrEqual(0);
    expect(config.retryBackoff).toBeGreaterThan(0);
    expect(typeof config.retryJitter).toBe('boolean');
  });

  it('builds default kill-switch config', () => {
    const config = buildDefaultWorkerKillSwitchConfig();

    expect(typeof config.enabled).toBe('boolean');
    expect(config.enabled).toBe(false);
  });

  it('converts seconds to milliseconds', () => {
    expect(secondsToMs(1)).toBe(1000);
    expect(secondsToMs(2)).toBe(2000);
    expect(secondsToMs(5)).toBe(5000);
    expect(secondsToMs(0)).toBe(0);
  });

  it('respects environment variables for retry config', () => {
    const originalMaxRetries = process.env.WORKER_MAX_RETRIES;
    const originalRetryBackoff = process.env.WORKER_RETRY_BACKOFF;
    const originalRetryJitter = process.env.WORKER_RETRY_JITTER;

    process.env.WORKER_MAX_RETRIES = '5';
    process.env.WORKER_RETRY_BACKOFF = '3';
    process.env.WORKER_RETRY_JITTER = 'false';

    const config = buildDefaultWorkerRetryConfig();

    expect(config.maxRetries).toBe(5);
    expect(config.retryBackoff).toBe(3);
    expect(config.retryJitter).toBe(false);

    // Restore
    if (originalMaxRetries !== undefined) {
      process.env.WORKER_MAX_RETRIES = originalMaxRetries;
    } else {
      delete process.env.WORKER_MAX_RETRIES;
    }
    if (originalRetryBackoff !== undefined) {
      process.env.WORKER_RETRY_BACKOFF = originalRetryBackoff;
    } else {
      delete process.env.WORKER_RETRY_BACKOFF;
    }
    if (originalRetryJitter !== undefined) {
      process.env.WORKER_RETRY_JITTER = originalRetryJitter;
    } else {
      delete process.env.WORKER_RETRY_JITTER;
    }
  });
});
