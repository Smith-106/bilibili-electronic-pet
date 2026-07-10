/**
 * probeBilibiliAuth 周期调度 + 14 天存活断言/告警 (TASK-005, L8/L6/SC5).
 *
 * 背景：P3 预热 stage config + 信号驱动退出需要"14 天观察期账号存活 observable"。
 * worker-main.ts 启动后 setInterval 周期调用 probeBilibiliAuthScheduler()，
 * F2 默认 3600s (1h) 可配置 (PROBE_AUTH_INTERVAL_SECONDS)。timer.unref() 不阻止
 * 进程退出。
 *
 * not_logged_in 告警分支 (fail-closed 同步 await recordAntiriskSignal)：
 * - setAuthProbeUnhealthy(true) → isAuthProbeHealthy() 返回 false → readiness
 *   auth_probe_healthy gate 标红 (productBlocker `antirisk:auth_probe_healthy`)。
 * - 同步 await recordAntiriskSignal 写 ObservabilityEvent
 *   {event_type:'account_alive_probe_failed', error_subclass:'auth_not_logged_in'}。
 *   依据 L8/Spec：风控信号 MUST 同步持久化 (不可丢)，MUST NOT fire-and-forget。
 *
 * ok 分支：consecutiveHealthyProbes++ + lastHealthyProbeAt=new Date()，
 * isAuthProbeHealthy() 返回 true (readiness gate 绿)。
 *
 * 14 天存活断言器 (L6/DD-03)：
 * isWarmupSurvivalAsserted() = lastHealthyProbeAt !== null &&
 * consecutiveHealthyProbes >= MIN_HEALTHY_PROBES_FOR_WARMUP。
 * WARMUP_WINDOW_DAYS 默认 14 (上限固定)，MIN_HEALTHY_PROBES 保守占位待 SME+运营 调。
 */

import { probeBilibiliAuth } from './bilibili-client.js';
import { loadBilibiliRuntimeConfig } from './bilibili-runtime-config.js';
import { recordAntiriskSignal } from './observability.js';
import { ensureTraceId } from './observability.js';

// 14 天观察期上限 (L6)：固定作上限 + 信号作提前退出条件。阈值 DD-03 待 SME+运营。
// SEC-003 fix: 下界校验 fail-closed — 非法值 (<1) 退回保守默认 14, 不允许 0/负值使窗口失效.
const rawWarmupDays = Number.parseInt(process.env.WARMUP_WINDOW_DAYS ?? '14', 10);
export const WARMUP_WINDOW_DAYS = Number.isFinite(rawWarmupDays) && rawWarmupDays >= 1 ? rawWarmupDays : 14;

// 保守占位：14 天内最小连续健康 probe 次数才断言存活。DD-03 可调。
// SEC-003 fix: 下界校验 — 非法值 (<1) 退回默认 4.
const rawMinHealthyProbes = Number.parseInt(process.env.MIN_HEALTHY_PROBES_FOR_WARMUP ?? '4', 10);
const MIN_HEALTHY_PROBES_FOR_WARMUP = Number.isFinite(rawMinHealthyProbes) && rawMinHealthyProbes >= 1 ? rawMinHealthyProbes : 4;

const WARMUP_WINDOW_MS = WARMUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// MAINT-003 note: authProbeUnhealthy 采用倒置语义 (true=不健康) 是历史遗留陷阱.
// 外部消费经正向 isAuthProbeHealthy() (= !authProbeUnhealthy), 模块内 setAuthProbeUnhealthy
// 是唯一写点. 重命名为正向 authProbeHealthy 会改 5+ 处调用 + readiness gate 已消费
// isAuthProbeHealthy(), 收益小风险中, 保留倒置 + 此注释消除陷阱.
let authProbeUnhealthy = false;
let consecutiveHealthyProbes = 0;
let lastHealthyProbeAt: Date | null = null;
// CORR-001 fix: 首次健康 probe 时间, 用于 14 天窗口下限校验 (consecutiveHealthyProbes 达标
// 且首次健康距今 >= WARMUP_WINDOW_DAYS 才断言存活, 避免 4h 连续 probe 提前满足 14 天观察期).
let firstHealthyProbeAt: Date | null = null;

/**
 * readiness gate callback：probeBilibiliAuth 是否健康。
 * not_logged_in (或最近一次 probe 失败) → false → readiness 标红。
 */
export function isAuthProbeHealthy(): boolean {
  return !authProbeUnhealthy;
}

function setAuthProbeUnhealthy(value: boolean): void {
  authProbeUnhealthy = value;
}

/**
 * 14 天存活断言器 (SC5/L6/DD-03)：lastHealthyProbeAt 非 null AND
 * consecutiveHealthyProbes >= MIN_HEALTHY_PROBES_FOR_WARMUP AND
 * 首次健康 probe 距今 >= WARMUP_WINDOW_DAYS (CORR-001 fix: 时间窗下限, 避免 4h
 * 连续 probe 提前满足 14 天观察期). 保守占位阈值, SME+运营 可调.
 *
 * 注: 本函数逻辑已正确消费 WARMUP_WINDOW_DAYS (非 dead export). 接入 readiness gate
 * 作退出信号判定待 DD-03 SME 裁决退出阈值后单独实现 (ARCH-003 二分裁决: 接入留 DD-03).
 */
export function isWarmupSurvivalAsserted(): boolean {
  if (lastHealthyProbeAt === null || firstHealthyProbeAt === null) {
    return false;
  }
  if (consecutiveHealthyProbes < MIN_HEALTHY_PROBES_FOR_WARMUP) {
    return false;
  }
  const elapsedMs = lastHealthyProbeAt.getTime() - firstHealthyProbeAt.getTime();
  return elapsedMs >= WARMUP_WINDOW_MS;
}

/**
 * 周期调度入口：loadBilibiliRuntimeConfig → probeBilibiliAuth → 分流。
 *
 * not_logged_in: setAuthProbeUnhealthy(true) + 同步 await recordAntiriskSignal
 * (fail-closed 风控信号，L8 不可丢) + console.error JSON 告警。
 *
 * ok: setAuthProbeUnhealthy(false) + consecutiveHealthyProbes++ +
 * lastHealthyProbeAt=new Date() + console.log info。
 *
 * 其他失败 (网络/probe_failed/http_*): setAuthProbeUnhealthy(true) 但不写
 * antirisk signal (非风控类账号状态信号)；仅 console.error 告警。
 */
export async function probeBilibiliAuthScheduler(): Promise<void> {
  const config = await loadBilibiliRuntimeConfig();
  if (!config) {
    setAuthProbeUnhealthy(true);
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'probe_scheduler_no_credential',
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  const personaId = config.credentialName ?? null;
  const result = await probeBilibiliAuth(config);

  if (result.ok) {
    setAuthProbeUnhealthy(false);
    consecutiveHealthyProbes += 1;
    const now = new Date();
    lastHealthyProbeAt = now;
    // CORR-001: 记录首次健康 probe 时间作 14 天窗口下限基准 (断言器消费).
    if (firstHealthyProbeAt === null) {
      firstHealthyProbeAt = now;
    }
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'probe_scheduler_healthy',
        consecutive_healthy_probes: consecutiveHealthyProbes,
        persona_id: personaId,
        timestamp: now.toISOString(),
      }),
    );
    return;
  }

  if (result.reason === 'not_logged_in') {
    // L8 fail-closed：风控信号 MUST 同步 await 持久化 (不可丢)。
    setAuthProbeUnhealthy(true);
    consecutiveHealthyProbes = 0;
    // CORR-001: 连续性中断重置 14 天窗口基准.
    firstHealthyProbeAt = null;
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'probe_scheduler_not_logged_in',
        persona_id: personaId,
        timestamp: new Date().toISOString(),
      }),
    );
    await recordAntiriskSignal({
      event_type: 'account_alive_probe_failed',
      trace_id: ensureTraceId(),
      error_subclass: 'auth_not_logged_in',
      persona_id: personaId,
    });
    return;
  }

  // 其他失败分支：标红但不写 antirisk signal (非账号存活类信号)。
  setAuthProbeUnhealthy(true);
  // CORR-001: 连续性中断重置 14 天窗口基准.
  firstHealthyProbeAt = null;
  // SEC-002 fix: reason 归一化为枚举类别, 不泄露 Bilibili API 原始 message
  // (payload.message 可能含账号上下文; fetch error.message 可能含 URL 片段).
  // 已知枚举 (not_logged_in/http_*/api_error/probe_failed) 保留; 未知原始文本归一为 'api_error'.
  const rawReason = result.reason;
  const safeReason =
    rawReason === 'not_logged_in' ||
    rawReason === 'api_error' ||
    rawReason === 'probe_failed' ||
    (typeof rawReason === 'string' && rawReason.startsWith('http_'))
      ? rawReason
      : 'api_error';
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'probe_scheduler_failed',
      reason: safeReason,
      persona_id: personaId,
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * 测试辅助：重置 probe scheduler 状态。仅在测试中使用。
 */
export function __resetProbeSchedulerForTest(): void {
  authProbeUnhealthy = false;
  consecutiveHealthyProbes = 0;
  lastHealthyProbeAt = null;
}
