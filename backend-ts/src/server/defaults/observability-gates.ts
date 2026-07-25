import { getPrisma } from '../../lib/prisma.js';
import { ensureTraceId, getObservabilityDropCount, recordObservabilityEvent } from '../../services/observability.js';
import { getGroupCount } from '../normalizers.js';

export async function defaultGetObservabilitySummary(input: { windowMinutes: number }): Promise<{
  ok: boolean;
  summary: Record<string, unknown>;
}> {
  // G-002 / coding spec: online eval groupBy antirisk signal subclass.
  // Aggregates backoff_applied events (and antirisk_signal_detected) by error_subclass
  // so behavior_anomaly (-352) and rate_limit (-429) can be counted separately.
  const windowMs = Math.max(1, input.windowMinutes) * 60 * 1000;
  const since = new Date(Date.now() - windowMs);
  const prisma = getPrisma();
  const [bySubclassRows, dropCount] = await Promise.all([
    prisma.observabilityEvent.groupBy({
      by: ['error_subclass'],
      where: {
        created_at: { gte: since },
        event_type: { in: ['backoff_applied', 'antirisk_signal_detected'] },
        error_subclass: { not: null },
      },
      _count: { _all: true },
    }),
    Promise.resolve(getObservabilityDropCount()),
  ]);

  const byErrorSubclass: Record<string, number> = {};
  for (const row of bySubclassRows) {
    const key = row.error_subclass;
    if (key) {
      byErrorSubclass[key] = getGroupCount(row._count);
    }
  }

  return {
    ok: true,
    summary: {
      window_minutes: input.windowMinutes,
      by_error_subclass: byErrorSubclass,
      observability_drop_count: dropCount,
    },
  };
}

// TASK-007: readiness antirisk signal derivations. These count ObservabilityEvent /
// PublishLog rows over rolling windows to drive the backoff_active_rate and
// passive_response_violation_count readiness gates. Each is awaitable from the
// readiness route; on DB error they resolve false (fail-open) so a transient DB blip
// does not flip the gate red without evidence — the drop_count gate (fail-closed on
// the in-memory counter) covers the DB-down case separately.

// backoff_active_rate threshold (0.3): when >30% of publish attempts in the last
// 600s hit a -352/-429 (backoff_applied), the gate flips red.
const BACKOFF_ACTIVE_RATE_THRESHOLD = 0.3;
// backoff window (600s) matches the behavior_anomaly cap so the rate reflects the
// full backoff-pressure window, not just the last minute.
const BACKOFF_ACTIVE_RATE_WINDOW_SECONDS = 600;

export async function defaultIsBackoffActiveRateExceeded(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - BACKOFF_ACTIVE_RATE_WINDOW_SECONDS * 1000);
  try {
    const [backoffAppliedCount, publishIntentCount] = await Promise.all([
      prisma.observabilityEvent.count({
        where: { event_type: 'backoff_applied', created_at: { gte: since } },
      }),
      // BUG-002: filter the denominator to delivery-attempted statuses only. Counting ALL
      // publishLog rows (incl. manual_queue 'pending_review') dilutes the rate: manual_queue
      // rows never hit the Bilibili API so they can't contribute to backoff_applied, yet they
      // inflate the denominator within the 600s window and mask real -352 pressure as green
      // (e.g. 100 manual + 10 real attempts, 4 backoff → 0.036 < 0.3 false green).
      prisma.publishLog.count({
        where: { created_at: { gte: since }, status: { in: ['published', 'failed'] } },
      }),
    ]);
    // No publish attempts in the window -> no rate to exceed (fail-open, avoids div-by-zero).
    if (publishIntentCount === 0) return false;
    const rate = backoffAppliedCount / publishIntentCount;
    return rate >= BACKOFF_ACTIVE_RATE_THRESHOLD;
  } catch (error) {
    // BUG-003: fail-closed on DB query error. The generic SELECT 1 ping (foundation gate)
    // can pass while these observability/publishLog queries fail (schema drift, row lock,
    // query timeout) — treating that as "no antirisk pressure" (green) masks real -352/-429
    // pressure. Mirror defaultIsBehaviorAnomalyCountZero: a query-level failure MUST flip red.
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'backoff_active_rate_derivation_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    // observability fix: readiness-gate DB 查询失败翻红 (fail-closed true) 但仅 console.warn 镜像,
    // 无 ObservabilityEvent — 运营无法从统一 observability 流追踪门控翻红原因. 补 fire-and-forget
    // event (readiness-red-without-event 反模式, H9 pattern). 非阻塞, 不影响 fail-closed 返回值.
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'backoff_active_rate',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'backoff_active_rate',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return true;
  }
}

// passive_response_gate reject-count threshold (10): when the C-layer rejects more
// than 10 comments in the window, the gate flips red.
const PASSIVE_RESPONSE_VIOLATION_THRESHOLD = 10;
// Window matches the readiness probe cadence (last 10 min of passive-response activity).
const PASSIVE_RESPONSE_VIOLATION_WINDOW_SECONDS = 600;

export async function defaultIsPassiveResponseViolationExceeded(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - PASSIVE_RESPONSE_VIOLATION_WINDOW_SECONDS * 1000);
  try {
    const rejectedCount = await prisma.observabilityEvent.count({
      where: {
        event_type: 'passive_response_gate',
        status: 'rejected',
        created_at: { gte: since },
      },
    });
    return rejectedCount >= PASSIVE_RESPONSE_VIOLATION_THRESHOLD;
  } catch (error) {
    // BUG-003: fail-closed on DB query error (mirrors backoff_active_rate + behavior_anomaly).
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'passive_response_violation_derivation_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'passive_response_violation',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'passive_response_violation',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return true;
  }
}

// TASK-003/P3 SC4 gate: behavior_anomaly count within the rolling window MUST be zero.
// -352 behavior_anomaly is the high-severity subclass (cap 600s backoff). Any occurrence
// in the window blocks full real_publish. Queries ObservabilityEvent rows where
// event_type IN ['backoff_applied','antirisk_signal_detected'] AND error_subclass=
// 'behavior_anomaly' AND created_at >= now - BEHAVIOR_ANOMALY_WINDOW_SECONDS*1000.
// Fail-closed (returns false on DB error): SC4 is the hard full real_publish barrier,
// so a DB blip must NOT be assumed safe — unlike the backoff_active_rate /
// passive_response_violation gates which are soft signals (fail-open). The window
// default (86400s / 24h) is a conservative placeholder tunable by SME DD-03.
const BEHAVIOR_ANOMALY_WINDOW_SECONDS = Number.parseInt(process.env.BEHAVIOR_ANOMALY_WINDOW_SECONDS ?? '', 10) || 86400;

export async function defaultIsBehaviorAnomalyCountZero(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - BEHAVIOR_ANOMALY_WINDOW_SECONDS * 1000);
  try {
    const count = await prisma.observabilityEvent.count({
      where: {
        event_type: { in: ['backoff_applied', 'antirisk_signal_detected'] },
        error_subclass: 'behavior_anomaly',
        created_at: { gte: since },
      },
    });
    return count === 0;
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'behavior_anomaly_count_query_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    // observability fix: SC4 硬门 (real_publish barrier) DB 查询失败翻红 (fail-closed false) 但无
    // ObservabilityEvent — 最严重遗漏: DB blip 翻红阻止 real_publish 但运营无法从 observability 流
    // 追踪原因. 补 fire-and-forget event (readiness-red-without-event 反模式, H9 pattern).
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'behavior_anomaly_count',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'behavior_anomaly_count',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return false;
  }
}

// TASK-002/D1 gate: reply-visibility shadowbanned verdict count within the rolling window.
// A confirmed shadowbanned publish (ObservabilityEvent event_type='reply_visibility_check'
// AND error_subclass='shadowban') means the platform is silently swallowing replies — a
// sustained封号-grade signal. Fail-closed (returns false on ANY shadowbanned event in the
// window OR on DB error): mirrors isBehaviorAnomalyCountZero — a DB blip must NOT be assumed
// safe. probe_failed verdicts are NOT counted here (they record no antirisk signal, C-004
// fail-open), so a transient probe glitch cannot flip this red.
const REPLY_VISIBILITY_WINDOW_SECONDS = Number.parseInt(process.env.REPLY_VISIBILITY_WINDOW_SECONDS ?? '', 10) || 86400;

export async function defaultIsReplyVisibilityHealthy(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - REPLY_VISIBILITY_WINDOW_SECONDS * 1000);
  try {
    const count = await prisma.observabilityEvent.count({
      where: {
        event_type: 'reply_visibility_check',
        error_subclass: 'shadowban',
        created_at: { gte: since },
      },
    });
    return count === 0;
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'reply_visibility_count_query_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    // observability fix: reply_visibility gate DB 查询失败翻红 (fail-closed false) 但无 ObservabilityEvent
    // (readiness-red-without-event 反模式, H9 pattern). 注意: 此处 message 名与 publisher.ts 已修的
    // 'reply_visibility_check' record_failed 不同 — 此处是 isReplyVisibilityHealthy 门控 DB 查询 catch
    // (翻红 reply_visibility gate), publisher.ts:783 是发布侧探针记录失败. 补 fire-and-forget event.
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'reply_visibility_count',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'reply_visibility_count',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return false;
  }
}
