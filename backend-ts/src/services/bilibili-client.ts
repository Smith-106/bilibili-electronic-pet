/**
 * Bilibili API Client - Comment publishing and verification
 * Phase 3 of Enhancement Plan
 */

import { loadBilibiliRuntimeConfig, type BilibiliRuntimeConfig } from './bilibili-runtime-config.js';

// ============================================================
// Configuration
// ============================================================

type BilibiliConfig = BilibiliRuntimeConfig;

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

// ============================================================
// Public API
// ============================================================

/**
 * Post a reply to a comment
 */
export async function postReply(
  commentId: string,
  replyText: string,
  config?: BilibiliConfig,
): Promise<{ success: boolean; rpid: string }> {
  const resolvedConfig = config || (await loadBilibiliConfig());
  if (!resolvedConfig) {
    console.error('[Bilibili] Cannot post reply: not configured');
    return { success: false, rpid: '' };
  }
  try {
    const url = `${resolvedConfig.baseUrl}/x/v2/reply/add`;
    const body = JSON.stringify({
      type: 1,
      oid: commentId,
      message: replyText,
      csrf: resolvedConfig.biliJct,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), resolvedConfig.timeout);

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
      throw new Error(`Bilibili reply API returned error: ${data.message || JSON.stringify(data)}`);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('[Bilibili] Reply failed:', error);
    return { success: false, rpid: '' };
  }
}

/**
 * Check if Bilibili API is fully configured
 */
export async function isBilibiliConfigured(): Promise<boolean> {
  const config = await loadBilibiliConfig();
  return !!(config?.sessdata && config?.biliJct && config?.buvid);
}
