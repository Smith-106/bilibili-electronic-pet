/**
 * Bilibili API Client - Comment publishing and verification
 * Phase 3 of Enhancement Plan
 */

import { loadBilibiliRuntimeConfig, type BilibiliRuntimeConfig } from './bilibili-runtime-config.js';

// ============================================================
// Configuration
// ============================================================

type BilibiliConfig = BilibiliRuntimeConfig;
const DEFAULT_AUTH_PROBE_TIMEOUT_MS = 5000;

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
 * Post a reply to a comment
 */
export async function postReply(
  commentId: string,
  replyText: string,
  config?: BilibiliConfig,
): Promise<PostReplyResult> {
  const resolvedConfig = config || (await loadBilibiliConfig());
  if (!resolvedConfig) {
    console.error('[Bilibili] Cannot post reply: not configured');
    return { success: false, rpid: '' };
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
      return {
        ok: false,
        reason: typeof payload?.message === 'string' && payload.message.trim() ? payload.message.trim() : 'api_error',
        status: response.status,
      };
    }
    if (payload?.data?.isLogin !== true) {
      return { ok: false, reason: 'not_logged_in', status: response.status };
    }

    return { ok: true, reason: 'verified', status: response.status };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      reason: error instanceof Error && error.message ? error.message : 'probe_failed',
    };
  }
}

/**
 * Check if Bilibili API is fully configured
 */
export async function isBilibiliConfigured(): Promise<boolean> {
  const config = await loadBilibiliConfig();
  return !!(config?.sessdata && config?.biliJct && config?.buvid);
}
