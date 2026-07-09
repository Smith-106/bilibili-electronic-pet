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
export const WARMUP_WINDOW_DAYS = Number.parseInt(process.env.WARMUP_WINDOW_DAYS ?? '14', 10);

// 保守占位：14 天内最小连续健康 probe 次数才断言存活。DD-03 可调。
const MIN_HEALTHY_PROBES_FOR_WARMUP = Number.parseInt(process.env.MIN_HEALTHY_PROBES_FOR_WARMUP ?? '4', 10);

let authProbeUnhealthy = false;
let consecutiveHealthyProbes = 0;
let lastHealthyProbeAt: Date | null = null;

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
 * consecutiveHealthyProbes >= MIN_HEALTHY_PROBES_FOR_WARMUP。
 * 保守占位阈值，SME+运营 可调。
 */
export function isWarmupSurvivalAsserted(): boolean {
  return lastHealthyProbeAt !== null && consecutiveHealthyProbes >= MIN_HEALTHY_PROBES_FOR_WARMUP;
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
    lastHealthyProbeAt = new Date();
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'probe_scheduler_healthy',
        consecutive_healthy_probes: consecutiveHealthyProbes,
        persona_id: personaId,
        timestamp: lastHealthyProbeAt.toISOString(),
      }),
    );
    return;
  }

  if (result.reason === 'not_logged_in') {
    // L8 fail-closed：风控信号 MUST 同步 await 持久化 (不可丢)。
    setAuthProbeUnhealthy(true);
    consecutiveHealthyProbes = 0;
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
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'probe_scheduler_failed',
      reason: result.reason,
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
