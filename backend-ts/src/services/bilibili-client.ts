/**
 * Bilibili API Client - Comment publishing and verification
 * Phase 3 of Enhancement Plan
 */

import { loadBilibiliRuntimeConfig, type BilibiliRuntimeConfig } from './bilibili-runtime-config.js';
import { fetchCommentsPage } from './bilibili-poller.js';

// ============================================================
// Configuration
// ============================================================

type BilibiliConfig = BilibiliRuntimeConfig;
const DEFAULT_AUTH_PROBE_TIMEOUT_MS = 5000;

/**
 * BUG-003: thrown by postReply when no Bilibili runtime config is loaded (credentials
 * unconfigured OR decryption failure forced an env fallback that also yielded nothing).
 * Distinct from a Bilibili-side publish failure: a not-configured state is an operator
 * error that MUST surface (credential/decrypt blocker), not be masked as a routine
 * publish_failed. The publisher catch path classifies it as 'not_configured'.
 */
export class NotConfiguredError extends Error {
  constructor(message = 'bilibili_runtime_config_not_loaded') {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

export type BilibiliAuthProbeResult = {
  ok: boolean;
  reason: string;
  status?: number;
};

async function loadBilibiliConfig(): Promise<BilibiliConfig | null> {
  return loadBilibiliRuntimeConfig();
}

// ============================================================
// HTTP Helpers
// ============================================================

function buildHeaders(config: BilibiliConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'User-Agent': config.userAgent,
    Cookie: `SESSDATA=${config.sessdata}; bili_jct=${config.biliJct}; BUVID3=${config.buvid};`,
    Referer: 'https://api.bilibili.com',
    Origin: 'https://api.bilibili.com',
  };
}

function buildAbortController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

function resolveAuthProbeTimeoutMs(timeoutMs: number): number {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return DEFAULT_AUTH_PROBE_TIMEOUT_MS;
  }
  return Math.min(timeoutMs, DEFAULT_AUTH_PROBE_TIMEOUT_MS);
}

// ============================================================
// Public API
// ============================================================

/**
 * Result of posting a reply to a Bilibili comment.
 *
 * `error_code` carries the structured Bilibili API `code` (e.g. -352 for
 * behavior_anomaly risk-control, -101 for auth failure) so the publisher can
 * classify antirisk signals without parsing error messages. `v_voucher` is
 * surfaced from the -352 response body so the behavior_anomaly subclass is
 * distinguishable from generic rate_limit (coding spec: 错误码352须解析v_voucher子类分流).
 *
 * Network / HTTP errors propagate as thrown Errors so the publisher catch path
 * (publishIntentWithResult) can classify them — postReply no longer swallows
 * them to a bare {success:false} (ISS-20260709-005).
 */
export type PostReplyResult = {
  success: boolean;
  rpid: string;
  error_code?: number;
  v_voucher?: string;
};

/**
 * Mock injection shape for postReply's config param (P3 warmup / L7). The simulated
 * stage passes a mock-only object (no credentials) so postReply short-circuits before
 * issuing any fetch. Distinct from the full BilibiliConfig so callers can't accidentally
 * ship a mock-only object to real_publish.
 */
export type PostReplyMockConfig = {
  mockPostReplyResult: {
    success?: boolean;
    rpid?: string;
    error_code?: number;
    v_voucher?: string;
  };
};

/**
 * Post a reply to a comment
 */
export async function postReply(
  commentId: string,
  replyText: string,
  config?: BilibiliConfig | PostReplyMockConfig,
): Promise<PostReplyResult> {
  // Mock injection short-circuit (P3 warmup / L7): when config.mockPostReplyResult
  // is set, return the canned PostReplyResult WITHOUT issuing a fetch. Lets the
  // simulated stage drive -352 behavior_anomaly (or success) responses end-to-end
  // through classifyAntiriskSubclass → applyBackoff for online eval without hitting
  // the real Bilibili API. Default undefined in real_publish (no short-circuit).
  if (config?.mockPostReplyResult) {
    const mock = config.mockPostReplyResult;
    return {
      success: mock.success ?? false,
      rpid: mock.rpid ?? '',
      error_code: mock.error_code,
      v_voucher: mock.v_voucher,
    };
  }

  // Past the short-circuit, a mock-only PostReplyMockConfig is impossible (its
  // mockPostReplyResult is required + truthy). Narrow to BilibiliConfig for the fetch path.
  const resolvedConfig: BilibiliConfig | null = (config as BilibiliConfig | undefined) || (await loadBilibiliConfig());
  if (!resolvedConfig) {
    // BUG-003: throw a typed NotConfiguredError instead of returning a bare {success:false}.
    // A not-loaded config (credentials unconfigured / decryption failure) is an operator
    // error that MUST be visible — masking it as success:false makes the publisher record a
    // generic 'publish_failed', hiding the real credential/decrypt root cause.
    throw new NotConfiguredError();
  }
  const url = `${resolvedConfig.baseUrl}/x/v2/reply/add`;
  const body = JSON.stringify({
    type: 1,
    oid: commentId,
    message: replyText,
    csrf: resolvedConfig.biliJct,
  });

  const { controller, timeoutId } = buildAbortController(resolvedConfig.timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(resolvedConfig),
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bilibili reply API error: ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (data.code === 0 && data.data?.rpid) {
      return { success: true, rpid: String(data.data.rpid) };
    }

    // -352 behavior_anomaly: surface error_code + v_voucher so the publisher can
    // route to classifyAntiriskSubclass and the A-layer backoff can apply the
    // behavior_anomaly cap (600s) distinct from generic rate_limit (60s).
    if (data.code === -352) {
      const voucher = data.data?.v_voucher;
      return {
        success: false,
        rpid: '',
        error_code: -352,
        v_voucher: voucher !== undefined && voucher !== null ? String(voucher) : undefined,
      };
    }

    // Other non-zero API codes: surface error_code so callers can branch on it.
    return { success: false, rpid: '', error_code: data.code };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function probeBilibiliAuth(config?: BilibiliConfig): Promise<BilibiliAuthProbeResult> {
  const resolvedConfig = config || (await loadBilibiliConfig());
  if (!resolvedConfig) {
    return { ok: false, reason: 'not_configured' };
  }

  const { controller, timeoutId } = buildAbortController(resolveAuthProbeTimeoutMs(resolvedConfig.timeout));

  try {
    const response = await fetch(`${resolvedConfig.baseUrl}/x/web-interface/nav`, {
      method: 'GET',
      headers: buildHeaders(resolvedConfig),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, reason: `http_${response.status}`, status: response.status };
    }

    const payload = await response.json();
    if (payload?.code !== 0) {
      // BUG-004 (security): the raw upstream payload.message can contain account-specific
      // context (per the SEC-002 note in probe-scheduler.ts) and flows into /api/admin/
      // bililibi/status diagnostics. Return the safe 'api_error' enum — mirrors the
      // safeReason normalization in probe-scheduler.ts. The raw message is not surfaced.
      return { ok: false, reason: 'api_error', status: response.status };
    }
    if (payload?.data?.isLogin !== true) {
      return { ok: false, reason: 'not_logged_in', status: response.status };
    }

    return { ok: true, reason: 'verified', status: response.status };
  } catch {
    clearTimeout(timeoutId);
    // BUG-004 (security): error.message can contain URL fragments / upstream context —
    // return the safe 'probe_failed' enum instead (mirrors probe-scheduler safeReason).
    return { ok: false, reason: 'probe_failed' };
  }
}

/**
 * Check if Bilibili API is fully configured
 */
export async function isBilibiliConfigured(): Promise<boolean> {
  const config = await loadBilibiliConfig();
  return !!(config?.sessdata && config?.biliJct && config?.buvid);
}

// ============================================================
// Reply visibility self-check (TASK-002 / D1)
// ============================================================

/**
 * Outcome of the post-publish visibility probe. `status` is the fail-closed /
 * fail-open discriminator (C-004):
 *  - 'visible'       — probe succeeded and the rpid is present in the comment list
 *  - 'shadowbanned'  — probe succeeded BUT the rpid is absent (fail-closed: triggers
 *                      'shadowban' antirisk subclass + applyBackoff + readiness red)
 *  - 'probe_failed'  — probe itself faulted (network / 5xx / timeout); fail-open:
 *                      MUST NOT trigger backoff or block readiness (a transient probe
 *                      glitch must not be misclassified as a shadowban and apply a 600s
 *                      backoff that would withhold legitimate publishing).
 *
 * `probe_method` records which view surfaced the verdict:
 *  - 'sender_cookie' — the probe ran with the publisher's own SESSDATA cookie (default
 *                       dual-view path; a missing rpid here is the strong shadowban signal)
 *  - 'seek_rpid'      — the anonymous fallback (no auth cookie) re-listed the page and
 *                       still did not find the rpid, confirming shadowban across views
 */
export type ReplyVisibilityResult = {
  visible: boolean;
  status: 'visible' | 'shadowbanned' | 'probe_failed';
  probe_method: 'sender_cookie' | 'seek_rpid';
  reason?: string;
};

/**
 * Visibility-probe backing config shape. Mirrors the subset of BilibiliRuntimeConfig
 * that fetchCommentsPage consumes (baseUrl / sessdata / biliJct / buvid / userAgent /
 * timeout). Typed as an explicit interface so the probe + its tests can pass a minimal
 * config without constructing a full BilibiliRuntimeConfig (and so the anonymous
 * seek_rpid fallback can pass a cookieless variant).
 */
export interface VisibilityProbeConfig {
  baseUrl: string;
  sessdata: string;
  biliJct: string;
  buvid: string;
  userAgent: string;
  timeout: number;
}

// WARN-1 fix: the /x/v2/reply list returns the top-N replies by heat (pn=${page}&ps=20&sort=1).
// A single page (pn=1, top 20 by heat) misses replies on high-volume videos (>20 replies) or
// replies that have not yet bubbled to page 1. Probing only page 1 caused both views to report
// rpid-absent and the dual-view logic collapsed to 'shadowbanned' — a false positive that
// triggers the 600s shadowban backoff (reused behavior_anomaly cap) and withholds legitimate
// publishing. Mirror the poller's MAX_PAGES=5 pagination: scan pages 1..MAX_PROBE_PAGES, rpid
// present on ANY page → visible; all pages fetched successfully with rpid absent → shadowban.
// Override via VISIBILITY_PROBE_MAX_PAGES (same env-flag pattern as backoff-decision.ts).
const MAX_PROBE_PAGES = (() => {
  const raw = process.env.VISIBILITY_PROBE_MAX_PAGES ?? '';
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

/**
 * Verify a freshly-posted reply is actually visible on the Bilibili comment list
 * (D1 platform-side semantic closure). Returns a fail-closed/fail-open-classified
 * result; NEVER throws — all fetch/parse failures collapse to status='probe_failed'
 * so the publisher can applyBackoff only on confirmed shadowbanned verdicts.
 *
 * Dual-view probe (R2):
 *  1. sender_cookie — list /x/v2/reply with the publisher's own SESSDATA cookie. A
 *     present rpid means visible. A missing rpid is suspicious (the platform may be
 *     filtering the author's own shadowbanned reply from their own view) so we fall
 *     through to the anonymous view rather than declaring shadowban on one sample.
 *  2. seek_rpid fallback — re-list the page WITHOUT the auth cookie (anonymous view).
 *     If the rpid is still absent, the reply is genuinely not publicly visible →
 *     'shadowbanned' (fail-closed). If the anonymous view surfaces it, the reply is
 *     visible to the public (the sender's own view was just filtered) → 'visible'.
 *
 * WARN-1: each view paginates pages 1..MAX_PROBE_PAGES (default 5, mirrors poller
 * MAX_PAGES) rather than sampling only page 1. The /x/v2/reply list is sorted by heat
 * (sort=1, ps=20); a fresh reply or one on a high-volume video (>20 replies) lands on
 * a later page, so a single-page probe would see rpid-absent in BOTH views and falsely
 * return 'shadowbanned'. rpid present on ANY page → visible; all pages fetched
 * successfully with rpid absent across both views → shadowbanned. A mid-scan page
 * fetch fault → probe_failed (fail-open, C-004) — never shadowbanned on a fault.
 *
 * `commentId` is the oid (video aid) the reply was posted under — /x/v2/reply lists
 * by oid, so we need it to scope the page fetch. Mirrors postReply's oid semantics.
 *
 * C-004 error classification:
 *  - Network / non-2xx HTTP / AbortError from fetchCommentsPage → 'probe_failed'
 *    (fail-open). The thrown Error.message is NOT persisted verbatim upstream —
 *    publisher.ts stores only the safe 'probe_failed' enum in failure_reason.
 *  - Successful list fetch with the rpid absent in BOTH views → 'shadowbanned'
 *    (fail-closed → shadowban antirisk subclass + applyBackoff + readiness red).
 */
export async function verifyReplyVisible(
  rpid: string | number,
  commentId: string,
  config: VisibilityProbeConfig,
): Promise<ReplyVisibilityResult> {
  const targetRpid = Number(rpid);
  if (!Number.isFinite(targetRpid) || targetRpid <= 0) {
    // A non-finite / non-positive rpid means postReply did not actually surface a real
    // rpid — there is nothing to verify. Treat as probe_failed (fail-open) rather than
    // shadowbanned so we do not punish a publish that did not even return an rpid.
    return {
      visible: false,
      status: 'probe_failed',
      probe_method: 'sender_cookie',
      reason: 'invalid_rpid',
    };
  }

  const aid = Number(commentId);
  if (!Number.isFinite(aid) || aid <= 0) {
    // Without a valid oid we cannot list the comment page — fail-open (probe_failed),
    // not fail-closed (shadowbanned), so a malformed commentId does not trigger backoff.
    return {
      visible: false,
      status: 'probe_failed',
      probe_method: 'sender_cookie',
      reason: 'invalid_oid',
    };
  }

  // View 1: sender_cookie (publisher's own auth). fetchCommentsPage throws on
  // network / non-2xx / abort — catch collapses to probe_failed (fail-open, C-004).
  // WARN-1: paginate pages 1..MAX_PROBE_PAGES; rpid on any page → visible. A mid-scan
  // fault (page 2+ network failure) is still probe_failed, never shadowbanned.
  try {
    for (let page = 1; page <= MAX_PROBE_PAGES; page++) {
      const replies = await fetchCommentsPage(aid, page, config);
      if (replies.some((r) => r.rpid === targetRpid)) {
        return { visible: true, status: 'visible', probe_method: 'sender_cookie' };
      }
    }
  } catch {
    // Fail-open: a probe infrastructure fault (incl. mid-pagination network fault) is
    // NOT a shadowban. Persist the safe enum upstream (publisher stores 'probe_failed'
    // in failure_reason), never the raw error.message (can carry URL fragments / upstream
    // bodies — BUG-006 pattern).
    return {
      visible: false,
      status: 'probe_failed',
      probe_method: 'sender_cookie',
      reason: 'fetch_failed',
    };
  }

  // View 2: seek_rpid fallback (anonymous — no auth cookie). The Bilibili reply list
  // endpoint is public; passing an empty SESSDATA/bili_jct/buvid yields the anonymous
  // view. A shadowbanned reply is absent from BOTH views; a reply visible to the public
  // but filtered from the author's own view surfaces here.
  const anonymousConfig: VisibilityProbeConfig = {
    ...config,
    sessdata: '',
    biliJct: '',
    buvid: '',
  };
  try {
    for (let page = 1; page <= MAX_PROBE_PAGES; page++) {
      const replies = await fetchCommentsPage(aid, page, anonymousConfig);
      if (replies.some((r) => r.rpid === targetRpid)) {
        // Anonymous view sees the reply → it is publicly visible (sender's own view was
        // just filtered, e.g. by author-self-hide). Not a shadowban.
        return { visible: true, status: 'visible', probe_method: 'seek_rpid' };
      }
    }
  } catch {
    // seek_rpid fetch faulted (incl. mid-pagination fault) — still fail-open
    // (probe_failed), never shadowbanned.
    return {
      visible: false,
      status: 'probe_failed',
      probe_method: 'seek_rpid',
      reason: 'seek_fetch_failed',
    };
  }

  // Both views succeeded across all MAX_PROBE_PAGES pages and neither surfaced the
  // rpid — fail-closed: shadowbanned.
  return {
    visible: false,
    status: 'shadowbanned',
    probe_method: 'seek_rpid',
    reason: 'rpid_absent_dual_view',
  };
}
