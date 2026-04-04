/**
 * Bilibili API Client - Comment publishing and verification
 * Phase 3 of Enhancement Plan
 */

import type { PublishReplyService } from './interfaces.js';
import {
  loadBilibiliRuntimeConfig,
  type BilibiliRuntimeConfig,
} from './bilibili-runtime-config.js';

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
// Fetch with retry
// ============================================================

async function fetchWithRetry(
  url: string,
  config: BilibiliConfig
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        headers: buildHeaders(config),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(`Bilibili API error: ${String(error)}`);
      if (attempt < config.retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Bilibili] Retry ${attempt + 1}/${config.retries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
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
  config?: BilibiliConfig
): Promise<{ success: boolean; rpid: string }> {
  const resolvedConfig = config || await loadBilibiliConfig();
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
 * Get comments in a video
 */
async function getComments(
  videoId: string,
  config: BilibiliConfig
): Promise<Array<{
  comment_id: string;
  content: string;
  user_id: string;
}> | null> {
  try {
    const url = `${config.baseUrl}/x/v2/reply?typeoid=${videoId}&type=1&page_num=1`;
    const response = await fetchWithRetry(url, config);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data.data?.replies) {
      return data.data.replies.map((r: Record<string, unknown>) => ({
        comment_id: String(r.rpid),
        content: (r.content as Record<string, unknown>)?.message ? String((r.content as Record<string, unknown>).message) : '',
        user_id: String(r.mid),
      }));
    }
    return null;
  } catch (error) {
    console.error('[Bilibili] Get comments failed:', error);
    return null;
  }
}

/**
 * Get video info
 */
async function getVideoInfo(
  videoId: string,
  config: BilibiliConfig
): Promise<Record<string, unknown> | null> {
  try {
    const url = `${config.baseUrl}/x/web-interface/view?bvid=${videoId}`;
    const response = await fetchWithRetry(url, config);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data.data) {
      return {
        title: data.data.title || '',
        pic: data.data.pic || '',
        description: data.data.desc || '',
      };
    }
    return null;
  } catch (error) {
    console.error('[Bilibili] Get video info failed:', error);
    return null;
  }
}

/**
 * Verify credentials by checking login info
 */
async function verifyCredentials(
  config: BilibiliConfig
): Promise<boolean> {
  try {
    const url = `${config.baseUrl}/x/web-interface/nav?info=${config.dedeuserid}`;
    const response = await fetchWithRetry(url, config);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return !!(response.ok && data.data?.isLogin);
  } catch {
    return false;
  }
}

/**
 * Check if Bilibili API is fully configured
 */
export async function isBilibiliConfigured(): Promise<boolean> {
  const config = await loadBilibiliConfig();
  return !!(config?.sessdata && config?.biliJct && config?.buvid);
}
