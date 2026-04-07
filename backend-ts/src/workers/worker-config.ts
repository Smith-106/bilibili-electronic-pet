/**
 * Worker configuration types and defaults
 */

export type WorkerRetryConfig = {
  maxRetries: number;
  retryBackoff: number; // seconds
  retryJitter: boolean;
};

export type WorkerKillSwitchConfig = {
  /**
   * Global kill switch for task workers.
   * When true, workers short-circuit before processing jobs.
   */
  killSwitch: boolean;
};

export type WorkerConfig = WorkerRetryConfig & WorkerKillSwitchConfig;

/**
 * Default worker retry configuration
 * Matches Python settings:
 * - worker_max_retries = 3
 * - worker_retry_backoff = 2 (seconds)
 * - worker_retry_jitter = True
 */
export function buildDefaultWorkerRetryConfig(): WorkerRetryConfig {
  return {
    maxRetries: process.env.WORKER_MAX_RETRIES ? Number(process.env.WORKER_MAX_RETRIES) : 3,
    retryBackoff: process.env.WORKER_RETRY_BACKOFF ? Number(process.env.WORKER_RETRY_BACKOFF) : 2,
    retryJitter: process.env.WORKER_RETRY_JITTER !== 'false',
  };
}

/**
 * Default kill-switch configuration
 */
export function buildDefaultWorkerKillSwitchConfig(): WorkerKillSwitchConfig {
  return {
    killSwitch: process.env.KILL_SWITCH === 'true',
  };
}

/**
 * Build complete worker configuration
 */
export function buildDefaultWorkerConfig(): WorkerConfig {
  return {
    ...buildDefaultWorkerRetryConfig(),
    ...buildDefaultWorkerKillSwitchConfig(),
  };
}

/**
 * Convert seconds to milliseconds for BullMQ backoff
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}
