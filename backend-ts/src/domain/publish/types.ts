export type PublishTargetKind = 'comment-reply' | 'message';

export type PublishTargetRoute = {
  containerId?: string;
  parentExternalId?: string;
  metadata?: Record<string, string>;
};

export type PublishTarget = {
  platform: string;
  targetKind: PublishTargetKind;
  externalId: string;
  canonicalId: string;
  route?: PublishTargetRoute;
};

export type PublishPayload = {
  text: string;
};

export type PublishIntent = {
  traceId?: string;
  source?: string;
  target: PublishTarget;
  payload: PublishPayload;
};

// ISS-20260713-001: publishIntentWithResult tuple[1] reason 值域收窄为显式联合类型.
// 此前 tuple[1] 为 string, 三 vocab (normalize-failure / antirisk-subclass / business-status)
// 共享单一 string 槽位无类型约束, 跨 vocab 串台 (如 'rate_limited' 属 antirisk 操作状态却与
// publish_log normalize vocab 混用) 编译器无法拒绝. 收窄后新增 classifier 串台即 tsc 报错,
// 强制开发者显式选择. 命名对齐 (审计 2026-07-13): subclass 侧用 'rate_limit' (AntiriskSubclass
// 分类), tuple[1] 操作状态侧用 'rate_limited' (publish 被风控拦截的操作结果), 二者在联合中显式区隔.
//
// tuple[1] 对运行时控制流零影响 (write-only 落 risk_flags.publish_reason / gateway_reason /
// observability metadata), 唯一 enum 消费分支 comment-event.task.ts:599 `!== 'idempotent_replay'`
// 已含于联合. 联合 = publisher 全部返回点字面量 ∪ 消费方期望字面量.
export type PublishReason =
  // business-status (published=true 或无 publish 发生)
  | 'published'
  | 'duplicate_reply'
  | 'idempotent_replay' // 消费方期望 (comment-event.task.ts:599/620), gateway-publish.ts:131 HTTP reason 同源
  | 'dry_run_skipped'
  | 'manual_queued'
  | 'simulated'
  | 'webhook_published'
  // normalize-failure (normalizeFailureReason 返回, 落 publish_log.failure_reason)
  | 'publish_failed'
  | 'bilibili_api_error'
  | 'network_error'
  | 'not_configured'
  // antirisk 操作状态 (publish 被风控拦截的操作结果; subclass 分类见 services/publisher AntiriskSubclass)
  | 'rate_limited'
  | 'shadowbanned'
  | 'circuit_breaker_open'
  | 'backoff_active'
  | 'stage_gate_blocked'
  // mode-specific / stage 状态
  | 'simulated_mock_failed'
  | 'webhook_not_configured'
  | '5xx'
  | 'stage_quota_misconfigured'
  | 'stage_quota_exceeded';

// normalizeFailureReason 返回值域 = PublishReason 的 normalize-failure 子集.
export type NormalizedFailureReason =
  | 'not_configured'
  | 'publish_failed'
  | 'bilibili_api_error'
  | 'network_error';
