/**
 * C-layer per-persona token bucket rate limit (TASK-006).
 *
 * F2: capacity=20 tokens, refill rate=20 tokens/min (≈0.333 tokens/s).
 * Stacks ON TOP of the BullMQ global limiter (task-queue.ts:67 max=100/min) — the
 * per-persona bucket (20/min) is STRICTER than the global backstop, so a single persona
 * cannot monopolize the global budget even if BullMQ's limiter still has headroom.
 *
 * L10 reject classification (consumed by comment-event.task.ts:505):
 *  - tokens>=1  → consume 1, return {allowed:true, reason:'ok'}          (proceed to publish)
 *  - tokens<1   → return {allowed:false, reason:'rate_limited'}          (RETRYABLE — BullMQ retries)
 *  The hard_reject path does NOT come from this bucket; it comes from safety.ts safetyCheck
 *  (safetyAction==='blocked') and is handled separately so it does NOT trigger BullMQ retry.
 *
 * L8 feature flag: ANTIRISK_C_RATE_LIMIT_ENABLED (default true). When off, the bucket is
 * bypassed — checkPersonaRateLimit always returns {allowed:true, reason:'ok'} (original
 * behavior, no rate limit). The flag is isolated: turning it off does not affect the A-layer
 * backoff (ANTIRISK_BACKOFF_ENABLED) or the C-gate (PASSIVE_RESPONSE_GATE_ENABLED).
 *
 * Memory state is process-local and lost on restart — acceptable because this is rate limiting
 * (not backoff). After restart the bucket refills from empty, and the A-layer persistent
 * backoff (TASK-004) still guards against sustained -352/-429 behavior. A brief window of
 * no C-layer rate limit (≤ a few seconds of refill) is self-healing.
 */

import { getActivePersonaName } from './bilibili-runtime-config.js';

// ── Configuration (F2) ────────────────────────────────────────

/** Bucket capacity: 20 tokens per persona. */
const CAPACITY = 20;

/**
 * Refill rate in tokens per second. 20 tokens / 60s ≈ 0.3333 tokens/s.
 * Kept as a fraction to avoid float drift across long uptimes.
 */
const REFILL_RATE_PER_SEC = 20 / 60;

/**
 * Feature flag (L8). Default ON (enabled). When the env is explicitly 'false',
 * the bucket is bypassed and every check returns {allowed:true, reason:'ok'}.
 */
function isCRateLimitEnabled(): boolean {
  return process.env.ANTIRISK_C_RATE_LIMIT_ENABLED !== 'false';
}

// ── Token bucket state ───────────────────────────────────────

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/** Per-persona bucket state (persona_id = BilibiliCredential.name string, TASK-002). */
const buckets = new Map<string, TokenBucket>();

function getBucket(persona_id: string): TokenBucket {
  let bucket = buckets.get(persona_id);
  if (!bucket) {
    // Start full so a fresh persona is not throttled on its first burst.
    bucket = { tokens: CAPACITY, lastRefill: Date.now() };
    buckets.set(persona_id, bucket);
  }
  return bucket;
}

function refill(bucket: TokenBucket, now: number): void {
  const elapsedSec = Math.max(0, (now - bucket.lastRefill) / 1000);
  if (elapsedSec <= 0) return;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsedSec * REFILL_RATE_PER_SEC);
  bucket.lastRefill = now;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Check the per-persona token bucket rate limit before publishing (F2).
 *
 * Returns:
 *  - {allowed:true,  reason:'ok'          } when a token is available (one is consumed)
 *  - {allowed:false, reason:'rate_limited'} when the bucket is exhausted (RETRYABLE)
 *
 * A null/empty persona_id never rate-limits — the bucket is per-persona and a missing
 * persona attribution (lookup failure) must not block publishing (fail-open, matching the
 * A-layer backoff null-persona semantics in backoff-decision.ts:100). This keeps the
 * tuple-return contract intact (L7): the caller decides retry vs hard-reject, this function
 * only answers the rate-limit question.
 *
 * L8: when ANTIRISK_C_RATE_LIMIT_ENABLED=false, always returns {allowed:true, reason:'ok'}.
 *
 * TASK-002/D1 (C-008): the reply-visibility probe (verifyReplyVisible, called from
 * publisher.ts publishReal after postReply succeeds) ALSO consumes one token via this same
 * checkPersonaRateLimit call — the probe shares the publish quota (capacity 20 / refill
 * 20-min), NOT an independent budget. Rationale: the probe is an extra API call per publish
 * that amplifies request frequency; sharing the bucket keeps total request pressure within
 * the C-layer rhythm guard so the probe cannot push the persona into -429 territory on its
 * own. Single deduction per publish: the probe consumes once regardless of its verdict
 * (visible / shadowbanned / probe_failed), so a probe_failed verdict does NOT re-deduct.
 */
export function checkPersonaRateLimit(
  persona_id: string | null | undefined,
): { allowed: boolean; reason: 'ok' | 'rate_limited' } {
  if (!isCRateLimitEnabled()) {
    return { allowed: true, reason: 'ok' };
  }
  if (!persona_id) {
    return { allowed: true, reason: 'ok' };
  }

  const bucket = getBucket(persona_id);
  const now = Date.now();
  refill(bucket, now);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, reason: 'ok' };
  }
  return { allowed: false, reason: 'rate_limited' };
}

/**
 * Resolve the persona_id for C-layer rate limiting.
 *
 * Source order: explicit payload persona_id (queuePayload.persona_id, set by
 * comment-ingest.ts:153 via TASK-002) → fallback to getActivePersonaName() (DB lookup,
 * fail-safe null). This mirrors publisher.ts resolveActivePersonaId but is local to the
 * C-layer check so the comment-event worker does not need a WorkerServices accessor.
 */
export async function resolvePersonaIdForRateLimit(
  payloadPersonaId?: string | null,
): Promise<string | null> {
  if (payloadPersonaId) return payloadPersonaId;
  return getActivePersonaName();
}

// ── Test-only helpers ─────────────────────────────────────────

/** @internal Reset all buckets (tests only). */
export function __resetBucketsForTest(): void {
  buckets.clear();
}

/** @internal Read a persona's bucket (tests only). */
export function __getBucketForTest(persona_id: string): TokenBucket | undefined {
  return buckets.get(persona_id);
}

/** @internal Expose constants for tests (capacity=20, refill=20/min). */
export const __C_RATE_LIMIT_CONSTANTS = {
  CAPACITY,
  REFILL_RATE_PER_SEC,
};
