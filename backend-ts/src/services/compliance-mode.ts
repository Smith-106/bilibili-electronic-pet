/**
 * Compliance mode (TASK-003, G3 ISS-001 legal-risk降险).
 *
 * 背景：ISS-001 法律风险 (bilibili-api 弘安律所侵权告知函 + 主动骚扰法律红线) 需要一个
 * 单一运维开关让系统一键切到纯 webhook 被动响应模式 — 不主动发评论、不主动探活、
 * 只被动响应 @ 自己 / 关键词命中的评论。COMPLIANCE_MODE 是 OQ-4 裁决的独立 feature flag
 * (非纯文档), 让运维一刀切合规降险, readiness 可 gate.
 *
 * 取值:
 * - 'off' (默认, byte-for-byte backward compat): 现有行为不变, 不强制 webhook / 不跳探活.
 * - 'passive': 合规被动模式 — publisher 强制走 publishWebhook (非 publishReal),
 *   probe-scheduler 跳过主动探活 (复用 BILIBILI_ENABLED=false 跳过语义),
 *   comment-ingest passive-response gate 强制启用 (PASSIVE_RESPONSE_GATE_ENABLED=false
 *   在 passive 模式下被覆盖 — 合规红线优先于 L8 rollback flag).
 *
 * 设计约束:
 * - 不加 schema 字段 (C-002 双写边界, 零 migration): 复用 env-config + ObservabilityEvent
 *   event_type='compliance_mode_check' 记录模式切换 (普通观测事件, fire-and-forget).
 * - backward-compat: 默认 'off', 现有行为 byte-for-byte 不变.
 * - BILIBILI_ENABLED 兼容: COMPLIANCE_MODE='passive' 不强制 BILIBILI_ENABLED=false
 *   (webhook 模式仍需 BILIBILI_ENABLED=true 收 webhook), 但 probe 主动探活跳过.
 * - 合规红线: 主动骚扰 (主动发评论 / 主动 @ 他人) MUST NOT 实现. isPassiveResponseEligible
 *   在 comment-ingest.ts 是被动响应硬约束, passive 模式下强制启用, 非被动命中 MUST 不入队.
 */

export type ComplianceMode = 'off' | 'passive';

/**
 * Resolve COMPLIANCE_MODE from env. Default 'off' (backward compat).
 * Unknown / empty values fall back to 'off' — invalid config MUST NOT silently
 * flip the system into passive mode (fail-safe to the documented default,
 * mirrors the isFinite guards in probe-scheduler.ts / observability.ts).
 */
export function getComplianceMode(): ComplianceMode {
  const raw = (process.env.COMPLIANCE_MODE ?? '').trim().toLowerCase();
  if (raw === 'passive') {
    return 'passive';
  }
  return 'off';
}

/**
 * Whether the system is running in passive compliance mode.
 * Single accessor consumed by publisher / probe-scheduler / comment-ingest /
 * readiness so all four mount points share one source of truth (OQ-4 单一开关).
 */
export function isCompliancePassive(): boolean {
  return getComplianceMode() === 'passive';
}
