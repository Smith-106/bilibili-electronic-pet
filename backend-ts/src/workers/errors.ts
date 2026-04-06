/**
 * Worker error classification for retry strategy
 */

/**
 * Non-retryable worker error - should NOT be retried
 * Used for input payload or context errors that cannot be recovered
 */
export class NonRetryableWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableWorkerError';
  }
}

/**
 * Retryable worker error - should be retried with backoff
 * Used for transient errors (network, timeout, rate limit)
 */
export class RetryableWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableWorkerError';
  }
}

/**
 * Build failure metadata for observability
 */
export function buildFailureMetadata(error: Error, retryable: boolean): Record<string, unknown> {
  return {
    error_type: error.constructor.name,
    error_message: error.message,
    retryable,
  };
}

/**
 * Classify unknown error - default to retryable
 */
export function classifyError(error: unknown): RetryableWorkerError {
  if (error instanceof NonRetryableWorkerError) {
    throw error; // Re-throw non-retryable errors
  }
  if (error instanceof RetryableWorkerError) {
    throw error; // Re-throw retryable errors
  }
  // Wrap unknown errors as retryable
  const message = error instanceof Error ? error.message : String(error);
  throw new RetryableWorkerError(message);
}
