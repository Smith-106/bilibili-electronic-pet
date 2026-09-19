/**
 * Publish failure normalization + antirisk subclass classification + simulated mock parsing.
 * Extracted from publisher.ts (pure extraction — behavior unchanged).
 */

import type { NormalizedFailureReason } from '../domain/publish/types.js';

export function isPublishLogStorageError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('no such table: main.publish_logs') ||
    (message.includes('no such column') && message.includes('reservation_key'))
  );
}

/**
 * BUG-006 (security): normalize a publish failure reason into a safe enum before persisting
 * it to publish_log.failure_reason (surfaced via admin gateway-logs routes). The raw thrown
 * Error.message can contain upstream Bilibili response bodies (e.g.
 * "Bilibili reply API error: 500: <raw upstream body>") or fetch URL fragments — third-party
 * content that must not be stored verbatim in the audit log. The raw message is still logged
 * to console.error (operator-only) and into the antirisk signal metadata for diagnosis.
 *
 * Classification mirrors the failure surface: not_configured (operator/credential error),
 * bilibili_api_error (non-2xx HTTP or Bilibili API reject), network_error (fetch-level),
 * publish_failed (anything else).
 */
export function normalizeFailureReason(error: unknown): NormalizedFailureReason {
  // BUG-003: duck-type NotConfiguredError by name (not instanceof) so the check still works
  // when the caller's module mock of bilibili-client does not re-export the class.
  if (error instanceof Error && error.name === 'NotConfiguredError') return 'not_configured';
  if (!(error instanceof Error)) return 'publish_failed';
  const message = error.message;
  if (message.startsWith('Bilibili reply API error:')) return 'bilibili_api_error';
  // F2: publishReal/publishSimulated re-throw -352 behavior_anomaly as
  // `-352 behavior_anomaly v_voucher=...` (publisher.ts:503/365). This is a Bilibili API
  // reject (the highest-severity antirisk code), so classify as bilibili_api_error — not
  // the generic publish_failed fallthrough. classifyAntiriskSubclass still routes it to
  // rate_limited + backoff downstream; this only fixes the publish_log audit classification.
  if (/-352|behavior_anomaly|v_voucher/i.test(message)) return 'bilibili_api_error';
  // fetch-level failures (AbortError, TypeError "fetch failed", DNS/network errors)
  // F2 (review-odyssey 004): 衡全 errno 族 — econn 前缀覆盖 econnreset/econnrefused/econnaborted,
  // eaddr 覆盖 eaddrinuse/eaddrnotavail (原正则漏 ECONNRESET 误分类为 publish_failed)。
  // F2 (review-odyssey 006): 补 ehostunreach/enetunreach/epipe/eai/enetreset — f74e00a 漏的同类 errno 族
  // (host/network unreachable + broken pipe + DNS EAI_AGAIN 临时失败 + ENETRESET 网络重置同属 fetch 层
  // 网络失败, 误分类 publish_failed 会污染 real_publish throw 路径的 publish_log.failure_reason enum,
  // 隐藏 network_error 语义)。eai 前缀覆盖 eai_again/eai_nodata 等 getaddrinfo 族。
  if (
    error.name === 'AbortError' ||
    error.name === 'TypeError' ||
    /fetch failed|network|econn|enotfound|etimedout|eaddr|ehostunreach|enetunreach|epipe|eai|enetreset/i.test(message)
  ) {
    return 'network_error';
  }
  return 'publish_failed';
}

// ── Mock injection for the simulated stage (P3 warmup / L7) ──
//
// PUBLISHER_SIMULATED_RESPONSES drives the mock PostReplyResult injected into
// postReply via config.mockPostReplyResult when PUBLISHER_MODE=simulated. Lets the
// simulated stage emit -352 behavior_anomaly (or success) responses end-to-end
// through classifyAntiriskSubclass → applyBackoff for online eval, WITHOUT touching
// the real Bilibili API. Format: `error_code:-352,v_voucher:voucher_xxx` or
// `success:true,rpid:mock_123`. Unset → publishSimulated keeps the legacy
// "simulate success" behavior (backward compatible).
//
// Fail-closed: malformed env throws (not silently ignored) per risk mitigation.
export type MockPostReplyResult = {
  success?: boolean;
  rpid?: string;
  error_code?: number;
  v_voucher?: string;
};

export function parseMockFromEnv(): MockPostReplyResult | undefined {
  const raw = process.env.PUBLISHER_SIMULATED_RESPONSES;
  if (!raw || !raw.trim()) return undefined;

  const mock: MockPostReplyResult = {};
  for (const pair of raw.split(',')) {
    const sep = pair.indexOf(':');
    if (sep <= 0) {
      throw new Error(`PUBLISHER_SIMULATED_RESPONSES invalid pair (expected key:value): ${pair}`);
    }
    const key = pair.slice(0, sep).trim();
    const value = pair.slice(sep + 1).trim();
    if (!key) {
      throw new Error(`PUBLISHER_SIMULATED_RESPONSES empty key in pair: ${pair}`);
    }
    if (key === 'success') {
      mock.success = value === 'true';
    } else if (key === 'rpid') {
      mock.rpid = value;
    } else if (key === 'error_code') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) {
        throw new Error(`PUBLISHER_SIMULATED_RESPONSES error_code not finite: ${value}`);
      }
      mock.error_code = parsed;
    } else if (key === 'v_voucher') {
      mock.v_voucher = value;
    } else {
      throw new Error(`PUBLISHER_SIMULATED_RESPONSES unknown key: ${key}`);
    }
  }
  return mock;
}

/**
 * Antirisk error subclass classifier (coding spec: 错误码352须解析v_voucher子类分流).
 *
 * Bilibili -352 → behavior_anomaly (退避 cap 600s); HTTP 429 / generic rate limit → rate_limit (cap 60s).
 * TASK-002/D1: post-publish visibility probe shadowbanned verdict → 'shadowban' (cap 600s,
 * mirrors behavior_anomaly — a platform-side shadowban is a sustained-封号-grade signal so it
 * shares the high-severity backoff cap). Inspects the error message/code for known signals.
 * Returns null when the error is not an antirisk signal (then it flows through the normal
 * publish_failed path).
 *
 * The 'shadowban' branch is matched when publishReal re-throws a structured marker carrying
 * the shadowbanned probe verdict (mirrors the existing -352 re-throw pattern): the catch path
 * then routes through applyBackoff('shadowban') + recordAntiriskSignal. A probe_failed verdict
 * MUST NOT match here — it is fail-open and only recorded in PublishLog (C-004).
 */
export type AntiriskSubclass = 'behavior_anomaly' | 'rate_limit' | 'shadowban';

export function classifyAntiriskSubclass(error: unknown): AntiriskSubclass | null {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '');
  const lower = message.toLowerCase();
  const code = (error as { code?: unknown })?.code;

  // TASK-002/D1: shadowbanned visibility verdict (probe succeeded but the reply is absent
  // from the comment list in both views). publishReal throws a marker carrying the
  // 'shadowbanned' token + the probe_method so this classifier routes it to the shadowban
  // backoff + readiness gate. probe_failed verdicts never reach here (publishReal records
  // those as a published row with a probe_failed failure_reason and does NOT throw).
  if (lower.includes('shadowbanned') || lower.includes('shadowban')) {
    return 'shadowban';
  }

  // -352 behavior_anomaly (Bilibili risk-control). Also match the v_voucher /
  // behavior_anomaly markers per coding spec.
  if (message.includes('-352') || code === -352 || lower.includes('behavior_anomaly') || lower.includes('v_voucher')) {
    return 'behavior_anomaly';
  }

  // -429 / HTTP 429 / generic rate limit.
  if (
    message.includes('-429') ||
    code === -429 ||
    lower.includes('429') ||
    lower.includes('rate_limit') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limited') ||
    lower.includes('ratelimited')
  ) {
    return 'rate_limit';
  }

  return null;
}
