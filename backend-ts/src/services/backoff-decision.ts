/**
 * A 层退避中间件：BackoffDecision per-persona 退避调度 (TASK-004).
 *
 * 当 classifyAntiriskSubclass 命中 -352 behavior_anomaly / -429 rate_limit 时，
 * 按 subclass 决定退避 cap（600s behavior_anomaly / 60s rate_limit，L6 配置化），
 * per-persona 退避调度（内存 Map<persona_id, BackoffState>，复用 publisher.ts:36
 * breaker Map 模式但 cap/状态机独立 — 退避 600s ≠ 熔断 30s，L5）。
 *
 * 退避期间该 persona 的 publishIntent 拦截（return [false,'backoff_active',date,null]，
 * 不 throw，L7 tuple 契约 — BullMQ retry 不会被触发）。退避应用时写
 * ObservabilityEvent{event_type:'backoff_applied'}（同步 await，复用 Phase1 recordAntiriskSignal
 * fail-closed 路径，backoff_applied 是风控信号，MUST NOT 丢）。
 *
 * 进程重启从 DB antirisk_signal_detected last 600s 重建 backoffUntil（F4）—
 * backoffState 内存清空，rebuildBackoffFromDb 异步重建；短暂的"无退避"窗口可接受，
 * 因为风控信号会重新触发 applyBackoff。
 *
 * Feature flag ANTIRISK_BACKOFF_ENABLED 默认 true（L8 隔离）：off 时
 * isPersonaInBackoff 恒返回 false + applyBackoff no-op，回滚到无退避行为。
 */

import { recordAntiriskSignal } from './observability.js';
import type { AntiriskSubclass } from './publisher.js';
import { prisma as getPrisma } from './db-queries.js';

// ── Backoff state (per-persona) ───────────────────────────

/**
 * Per-persona backoff state. persona_id = BilibiliCredential.name string
 * (TASK-002 attribution source, shared with the C-layer @self detection gate, L2).
 *
 * L5: reuses the publisher.ts:36 breakers Map structure (in-memory per-key Map),
 * but the cap / state machine is INDEPENDENT from the circuit breaker
 * (backoff cap 600s ≠ breaker 30s). This is a SEPARATE Map.
 */
export interface BackoffState {
  persona_id: string;
  backoffUntil: number; // epoch ms; backoff active while Date.now() < backoffUntil
  subclass: AntiriskSubclass;
  startedAt: number; // epoch ms; when the backoff was applied
}

/**
 * Per-persona backoff state container. Encapsulates the in-memory Map so that
 * all state access (get/set/delete/iterate/size/clear) goes through a bounded
 * surface instead of a bare module-level Map (MAINT-006: state encapsulation).
 *
 * Reuses the breaker Map pattern (publisher.ts:36): module-level in-memory Map
 * keyed by persona_id. The factory `createBackoffStateContainer` lets tests (or
 * a future non-forking vitest pool that shares module state across files) obtain
 * an isolated instance; production paths use the shared `backoffState` singleton
 * below, preserving the existing single-process-single-map behavior.
 */
export class BackoffStateContainer {
  private readonly map = new Map<string, BackoffState>();

  get(persona_id: string): BackoffState | undefined {
    return this.map.get(persona_id);
  }

  set(persona_id: string, state: BackoffState): void {
    this.map.set(persona_id, state);
  }

  delete(persona_id: string): boolean {
    return this.map.delete(persona_id);
  }

  entries(): IterableIterator<[string, BackoffState]> {
    return this.map.entries();
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

/**
 * Factory for an isolated backoff state container. Production code uses the
 * shared `backoffState` singleton below; this factory exists so that tests
 * running under a non-forking vitest pool (which shares module state across
 * test files) can obtain a private container and avoid cross-file pollution
 * (MAINT-006 preventive surface). Currently unused by the test suite because
 * the default forks pool gives each file its own process — see ISS-20260710-004.
 */
export function createBackoffStateContainer(): BackoffStateContainer {
  return new BackoffStateContainer();
}

/**
 * Shared module-level singleton. Production code (isPersonaInBackoff /
 * applyBackoff / rebuildBackoffFromDb) reads/writes through this instance.
 */
const backoffState = new BackoffStateContainer();

// ── Configurable caps (L6, DEFAULT_RULES extension) ─────

/**
 * Backoff cap (seconds) per subclass (L6 configurable). Defaults:
 * - behavior_anomaly (-352): 600s — higher降频力度，持续累积会封号
 * - shadowban (TASK-002/D1): 600s — a platform-side shadowban is a sustained封号-grade
 *   signal (the reply is silently invisible), so it shares the high-severity cap with
 *   behavior_anomaly. Mirrors the Avalon 阿瓦隆风控 ShadowBan 8-state platform semantics.
 * - rate_limit (-429): 60s
 *
 * Configurable via env ANTIRISK_BACKOFF_CAP_BEHAVIOR_ANOMALY /
 * ANTIRISK_BACKOFF_CAP_SHADOWBAN / ANTIRISK_BACKOFF_CAP_RATE_LIMIT (DEFAULT_RULES
 * extension, decider.ts-compatible numeric fields). Read at applyBackoff call time so
 * env mutation is honored.
 */
export const DEFAULT_BACKOFF_CAP_BEHAVIOR_ANOMALY_SECONDS = 600;
export const DEFAULT_BACKOFF_CAP_SHADOWBAN_SECONDS = 600;
export const DEFAULT_BACKOFF_CAP_RATE_LIMIT_SECONDS = 60;

function resolveBackoffCapSeconds(subclass: AntiriskSubclass): number {
  if (subclass === 'behavior_anomaly') {
    const raw = Number.parseInt(
      process.env.ANTIRISK_BACKOFF_CAP_BEHAVIOR_ANOMALY ?? '',
      10,
    );
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BACKOFF_CAP_BEHAVIOR_ANOMALY_SECONDS;
  }
  if (subclass === 'shadowban') {
    const raw = Number.parseInt(
      process.env.ANTIRISK_BACKOFF_CAP_SHADOWBAN ?? '',
      10,
    );
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BACKOFF_CAP_SHADOWBAN_SECONDS;
  }
  const raw = Number.parseInt(
    process.env.ANTIRISK_BACKOFF_CAP_RATE_LIMIT ?? '',
    10,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BACKOFF_CAP_RATE_LIMIT_SECONDS;
}

// ── Feature flag (L8 isolation) ───────────────────────────

/**
 * Feature flag for the A-layer backoff middleware (L8 isolation).
 * When off, isPersonaInBackoff always returns false and applyBackoff no-ops,
 * rolling back to the original no-backoff behavior. Default true.
 */
export function isBackoffEnabled(): boolean {
  return process.env.ANTIRISK_BACKOFF_ENABLED !== 'false';
}

// ── Public API ────────────────────────────────────────────

/**
 * Check whether a persona is currently in backoff (backoffUntil > Date.now()).
 * When the feature flag is off (L8), always returns false (rollback to no-backoff).
 *
 * L7: callers (publishIntentWithResult entry) use this to short-circuit the
 * publish with a [false,'backoff_active',date,null] tuple — never throws.
 */
export function isPersonaInBackoff(persona_id: string | null | undefined): boolean {
  if (!isBackoffEnabled()) return false;
  if (!persona_id) return false;
  const state = backoffState.get(persona_id);
  if (!state) return false;
  if (state.backoffUntil > Date.now()) return true;
  // Expired — evict to keep the map bounded (mirrors breaker openUntil expiry semantics).
  backoffState.delete(persona_id);
  return false;
}

/**
 * Apply per-persona backoff for the given subclass. Sets backoffUntil =
 * Date.now() + cap*1000 (cap 600s behavior_anomaly / 60s rate_limit, L6),
 * stores in backoffState, and synchronously writes an ObservabilityEvent
 * {event_type:'backoff_applied'} via recordAntiriskSignal (Phase1 fail-closed
 * persistence — backoff_applied is a风控信号, MUST NOT be dropped).
 *
 * When the feature flag is off (L8), no-ops (rollback to no-backoff behavior).
 *
 * trace_id is required for the observability event correlation; persona_id
 * may be null (defensive — applyBackoff should not be called without one,
 * but a null persona still records the signal for online eval without blocking
 * a specific persona).
 */
export async function applyBackoff(
  persona_id: string | null,
  subclass: AntiriskSubclass,
  trace_id: string,
): Promise<void> {
  if (!isBackoffEnabled()) return;

  const capSeconds = resolveBackoffCapSeconds(subclass);
  const now = Date.now();
  const backoffUntil = now + capSeconds * 1000;

  if (persona_id) {
    backoffState.set(persona_id, {
      persona_id,
      backoffUntil,
      subclass,
      startedAt: now,
    });
  }

  // First landing point: structured log for immediate operator visibility
  console.log(
    JSON.stringify({
      level: 'warn',
      message: 'backoff_applied',
      persona_id: persona_id ?? null,
      subclass,
      cap_seconds: capSeconds,
      backoff_until: new Date(backoffUntil).toISOString(),
      trace_id,
      timestamp: new Date().toISOString(),
    }),
  );

  // backoff_applied is a风控信号 — synchronous fail-closed persistence
  // (recordAntiriskSignal swallows DB failures internally + dropCount accounting,
  // so this await never rejects; TASK-003 偏差4 / TASK-004 fail-closed 传播链).
  await recordAntiriskSignal({
    event_type: 'backoff_applied',
    trace_id,
    persona_id: persona_id ?? null,
    error_subclass: subclass,
    status: subclass,
    metadata: { cap_seconds: capSeconds },
  });
}

/**
 * Rebuild backoffState from DB on process restart (F4). Queries
 * ObservabilityEvent where event_type='antirisk_signal_detected' AND
 * created_at >= (now - 600s) — the max backoff window — grouped by persona_id,
 * taking the latest backoffUntil-equivalent per persona.
 *
 * The antirisk_signal_detected rows carry error_subclass (behavior_anomaly /
 * rate_limit) and created_at; we reconstruct backoffUntil = created_at + cap*1000
 * per row, then keep the max backoffUntil per persona. Rows whose reconstructed
 * backoffUntil has already expired are skipped (no active backoff).
 *
 * L1 risk mitigation: rebuild is best-effort — a brief window of no-backoff after
 * restart is acceptable because signals will re-trigger applyBackoff. This is
 * fire-and-forget from the boot path: callers should `void rebuildBackoffFromDb().catch(...)`
 * so a slow/unavailable DB does not block boot.
 */
export async function rebuildBackoffFromDb(): Promise<void> {
  const prisma = getPrisma();
  const maxCapSeconds = Math.max(
    DEFAULT_BACKOFF_CAP_BEHAVIOR_ANOMALY_SECONDS,
    DEFAULT_BACKOFF_CAP_SHADOWBAN_SECONDS,
    DEFAULT_BACKOFF_CAP_RATE_LIMIT_SECONDS,
  );
  const since = new Date(Date.now() - maxCapSeconds * 1000);

  let rows: Array<{
    persona_id: string | null;
    error_subclass: string | null;
    created_at: Date;
  }>;
  try {
    rows = await prisma.observabilityEvent.findMany({
      where: {
        // TASK-002: 'reply_visibility_check' carries error_subclass='shadowban' for the
        // D1 shadowbanned verdict; include it so the 600s shadowban backoff survives restart.
        event_type: { in: ['antirisk_signal_detected', 'reply_visibility_check'] },
        created_at: { gte: since },
        persona_id: { not: null },
      },
      select: {
        persona_id: true,
        error_subclass: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  } catch (error) {
    // Fix-Don't-Hide: log the failure, do not silently swallow. The backoffState
    // stays empty; signals will re-trigger applyBackoff at runtime (L1 acceptable).
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'backoff_rebuild_from_db_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  const now = Date.now();
  const latestPerPersona = new Map<string, BackoffState>();

  for (const row of rows) {
    if (!row.persona_id || !row.error_subclass) continue;
    // Only reconstruct for known subclasses (incl. TASK-002 'shadowban').
    if (row.error_subclass !== 'behavior_anomaly' && row.error_subclass !== 'rate_limit' && row.error_subclass !== 'shadowban') {
      continue;
    }
    const subclass = row.error_subclass as AntiriskSubclass;
    const capSeconds = resolveBackoffCapSeconds(subclass);
    const backoffUntil = row.created_at.getTime() + capSeconds * 1000;
    if (backoffUntil <= now) continue; // already expired — no active backoff
    const existing = latestPerPersona.get(row.persona_id);
    if (!existing || backoffUntil > existing.backoffUntil) {
      latestPerPersona.set(row.persona_id, {
        persona_id: row.persona_id,
        backoffUntil,
        subclass,
        startedAt: row.created_at.getTime(),
      });
    }
  }

  // Swap into the live container. BUG-002 (race): the previous `backoffState.clear()` here would
  // wipe any backoff just applied by a concurrent applyBackoff() that landed during the
  // `await prisma.observabilityEvent.findMany` window above — losing antirisk state and
  // letting the next publish fire into an active behavior_anomaly window. Merge instead of
  // clearing: keep the later backoffUntil per persona, and evict only entries that are both
  // expired AND absent from the rebuilt set.
  for (const [personaId, state] of latestPerPersona) {
    const live = backoffState.get(personaId);
    if (!live || live.backoffUntil < state.backoffUntil) {
      backoffState.set(personaId, state);
    }
  }
  // Evict expired entries the rebuild did not surface (memory-bounded property, mirrors
  // breaker Map eviction). Concurrent applyBackoff entries that are still live are kept.
  for (const [personaId, state] of backoffState.entries()) {
    if (state.backoffUntil <= now && !latestPerPersona.has(personaId)) {
      backoffState.delete(personaId);
    }
  }

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'backoff_rebuilt_from_db',
      persona_count: backoffState.size,
      window_seconds: maxCapSeconds,
      timestamp: new Date().toISOString(),
    }),
  );
}

// ── Test-only helpers ─────────────────────────────────────

/**
 * Test-only: clear the in-memory backoffState. NOT for production use —
 * production relies on rebuildBackoffFromDb + natural expiry eviction.
 */
export function __resetBackoffMapForTest(): void {
  backoffState.clear();
}

/**
 * Test-only: inspect the backoff state for a persona (without side effects).
 * Returns undefined when no state is tracked.
 */
export function __getBackoffStateForTest(persona_id: string): BackoffState | undefined {
  return backoffState.get(persona_id);
}
