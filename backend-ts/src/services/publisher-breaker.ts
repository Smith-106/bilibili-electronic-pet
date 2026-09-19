/**
 * Per-platform circuit breaker for the publisher.
 * Extracted from publisher.ts (pure extraction — behavior unchanged).
 */

import { recordObservabilityEvent, ensureTraceId } from './observability.js';

interface CircuitBreaker {
  failureCount: number;
  openUntil: number;
}

const breakers = new Map<string, CircuitBreaker>();

function getPlatformBreaker(platform: string): CircuitBreaker {
  let breaker = breakers.get(platform);
  if (!breaker) {
    breaker = { failureCount: 0, openUntil: 0 };
    breakers.set(platform, breaker);
  }
  return breaker;
}

export function isCircuitBreakerOpen(platform: string): boolean {
  if (!isCircuitBreakerEnabled()) return false;
  const breaker = getPlatformBreaker(platform);
  if (breaker.openUntil > Date.now()) return true;
  return false;
}

export function recordFailure(platform: string): void {
  if (!isCircuitBreakerEnabled()) return;
  const breaker = getPlatformBreaker(platform);
  breaker.failureCount++;
  // Fix-Don't-Hide: parseInt can return NaN on a non-numeric env value (e.g. 'abc' is
  // truthy so the `|| '3'` fallback does not apply), which would make the threshold
  // comparison always false and silently disable the circuit breaker (fail-open).
  // Guard with isFinite — invalid config keeps the documented default.
  const thresholdRaw = parseInt(process.env.PUBLISHER_CIRCUIT_FAILURE_THRESHOLD || '3', 10);
  const threshold = Number.isFinite(thresholdRaw) && thresholdRaw > 0 ? thresholdRaw : 3;
  if (breaker.failureCount >= threshold) {
    const openSecondsRaw = parseInt(process.env.PUBLISHER_CIRCUIT_OPEN_SECONDS || '30', 10);
    const openSeconds = Number.isFinite(openSecondsRaw) && openSecondsRaw > 0 ? openSecondsRaw : 30;
    breaker.openUntil = Date.now() + openSeconds * 1000;
    // H7 fix: circuit-breaker OPEN stdout-only 无 ObservabilityEvent 无 gate — 加 fire-and-forget
    // event 使 breaker 翻红可追溯 (平台级非 job 级, trace_id 用 ensureTraceId 占位, 非绑定单 comment).
    void recordObservabilityEvent({
      event_type: 'circuit_breaker_open',
      trace_id: ensureTraceId(),
      status: 'open',
      metadata: {
        platform,
        open_seconds: openSeconds,
        failure_count: breaker.failureCount,
      },
    }).catch((error: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'circuit_breaker_open_event_record_failed',
          platform,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });
    console.warn(
      `[publisher] Circuit breaker OPEN for platform=${platform} for ${openSeconds}s after ${breaker.failureCount} failures`,
    );
  }
}

export function recordSuccess(platform: string): void {
  const breaker = getPlatformBreaker(platform);
  breaker.failureCount = 0;
  breaker.openUntil = 0;
}

function isCircuitBreakerEnabled(): boolean {
  return process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED !== 'false';
}
