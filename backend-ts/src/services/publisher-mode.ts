/**
 * Publisher mode resolution + stage gate.
 * Extracted from publisher.ts (pure extraction — public API unchanged).
 */

import { getObservabilityDropCount } from './observability.js';
import { isCompliancePassive } from './compliance-mode.js';

// dry_run: stage 0 — no API call, no publish_log write, no enqueue (pure observation).
export type PublisherMode = 'dry_run' | 'manual_queue' | 'simulated' | 'webhook' | 'real_publish';

export function getPublisherMode(): PublisherMode {
  const mode = (process.env.PUBLISHER_MODE || 'manual_queue').trim().toLowerCase();
  if (['dry_run', 'manual_queue', 'simulated', 'webhook', 'real_publish'].includes(mode)) {
    return mode as PublisherMode;
  }
  return 'manual_queue';
}

// COMPLIANCE_MODE='passive' (TASK-003, G3 ISS-001): single compliance switch forces webhook
// publishing (never real_publish — active solicitation via the native Bilibili API is the
// legal red-line). Resolved once per publish call so the stage-gate check AND the dispatch
// share the same override. Default 'off' is byte-for-byte backward compatible (returns the
// env-declared mode unchanged). 'passive' overrides real_publish/manual_queue/simulated
// → 'webhook'; dry_run is preserved (compliance does not force active publishing).
export function resolveEffectivePublisherMode(): PublisherMode {
  const mode = getPublisherMode();
  if (isCompliancePassive() && mode !== 'dry_run') {
    return 'webhook';
  }
  return mode;
}

// ── Stage gate (P3 warmup: 阶段门禁 guard) ────────────────
//
// real_publish 进阶前 MUST 校验 readiness 全绿 + observability drop_count=0
// (SC4: full real_publish 前 readiness 全绿 + drop_count=0 + 无 behavior_anomaly).
// fail-closed: 不满足返回 stage_gate_blocked, 不盲飞.
//
// STAGE_GATE_ENABLED (L1 env 隔离, 默认 false) 开启后 real_publish 走门禁校验;
// 关闭时维持既有行为 (legacy tests / 回退路径不受影响).
//
// ISS-20260710-001 fix-landed: stageReady 注入点 (DI) 替代 publisher 直接读 env 桥.
// publisher 不再 process.env.STAGE_REAL_PUBLISH_READY 跨层隐式耦合; 由 worker 边界
// (worker-main.ts) 启动时 setStageReadyResolver 注入 readiness ACK callback.
// resolver 默认 fail-closed (() => false): 未注入即拒绝 real_publish, 进程重启自动
// 归零消除 env 残留忘清零风险. publisher 仍同步校验 drop_count=0 (SC4 硬屏障).
export function isStageGateEnabled(): boolean {
  return process.env.STAGE_GATE_ENABLED === 'true';
}

// Injected readiness ACK resolver. Default fail-closed — real_publish blocked until
// worker-main injects a real callback. Replaced the previous direct
// process.env.STAGE_REAL_PUBLISH_READY read (ISS-20260710-001: cross-layer env coupling
// + stale-env blind-fly risk eliminated; resolver resets to false on process restart).
let stageReadyResolver: () => boolean = () => false;

/**
 * Inject the stage-ready resolver (called once at worker boot, worker-main.ts).
 * The resolver SHOULD AND-gate the operator ACK with live antirisk flags so a stale
 * ACK env cannot blind-fly past a readiness flip (e.g. threeLayerFlagsAllOn).
 * publisher additionally requires observability drop_count=0 (SC4) — keep that here,
 * not in the resolver, so the hard barrier stays in the publishing layer.
 */
export function setStageReadyResolver(resolver: () => boolean): void {
  stageReadyResolver = resolver;
}

/**
 * Test-only: reset the stageReady resolver to its fail-closed default so tests do not
 * leak an injected resolver across cases. Mirrors __resetBackoffMapForTest isolation.
 */
export function __resetStageReadyResolverForTest(): void {
  stageReadyResolver = () => false;
}

export function isStageRealPublishReady(): boolean {
  return stageReadyResolver() && getObservabilityDropCount() === 0;
}
