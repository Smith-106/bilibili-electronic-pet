/**
 * Bilibili Comment Poller Service
 * Ported from Python: app/services/bilibili_poller.py
 *
 * Polls enabled videos for new comments and injects them into the processing pipeline.
 */

import type { PrismaClient } from '@prisma/client';

import { getPrisma } from '../lib/prisma.js';
import { loadBilibiliRuntimeConfig, type BilibiliRuntimeConfig } from './bilibili-runtime-config.js';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
const MAX_PAGES = 5;

interface BilibiliComment {
  rpid: number;
  mid: number;
  content: string;
  parent_rpid: number;
  ctime: number;
}

interface PollResult {
  status: string;
  videos: number;
  comments: number;
  events_injected: number;
  details: Array<{
    bvid: string;
    comments: number;
    status: string;
    error?: string;
  }>;
}

interface PollVideoResult {
  status: string;
  new_comments: number;
}

function emptyPollResult(status: string): PollResult {
  return {
    status,
    videos: 0,
    comments: 0,
    events_injected: 0,
    details: [],
  };
}

/**
 * Fetch comments page from Bilibili API
 */
async function fetchCommentsPage(
  aid: number,
  page: number,
  config: { baseUrl: string; sessdata: string; biliJct: string; buvid: string; userAgent: string; timeout: number },
): Promise<BilibiliComment[]> {
  const url = `${config.baseUrl}/x/v2/reply?type=1&oid=${aid}&pn=${page}&ps=20&sort=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
        Cookie: `SESSDATA=${config.sessdata}; bili_jct=${config.biliJct}; BUVID3=${config.buvid};`,
        Referer: 'https://www.bilibili.com',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const replies = (data.data as Record<string, unknown>)?.replies;

    if (!Array.isArray(replies)) return [];

    return replies.map((r: Record<string, unknown>) => ({
      rpid: Number(r.rpid),
      mid: Number(r.mid),
      content: String((r.content as Record<string, unknown>)?.message ?? ''),
      parent_rpid: Number(r.parent ?? 0),
      ctime: Number(r.ctime ?? 0),
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch comments with retry
 */
async function fetchCommentsWithRetry(
  aid: number,
  page: number,
  config: { baseUrl: string; sessdata: string; biliJct: string; buvid: string; userAgent: string; timeout: number },
): Promise<BilibiliComment[] | null> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetchCommentsPage(aid, page, config);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[bilibili-poller] Retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} for aid=${aid} page=${page}: ${lastError.message}`,
      );
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  console.error(`[bilibili-poller] Retry exhausted for aid=${aid} page=${page}: ${lastError?.message}`);
  return null;
}

/**
 * Load bilibili config from environment
 */
async function loadConfig(prisma: PrismaClient): Promise<BilibiliRuntimeConfig | null> {
  return loadBilibiliRuntimeConfig(prisma);
}

/**
 * Poll a single video for new comments
 */
async function pollVideoComments(
  prisma: PrismaClient,
  video: { id: number; bvid: string; aid: number | null; last_rpid: number },
  config: BilibiliRuntimeConfig,
): Promise<PollVideoResult> {
  // Ensure we have an aid
  let aid = video.aid;
  if (!aid) {
    // Try to fetch video info to get aid
    try {
      const infoUrl = `${config.baseUrl}/x/web-interface/view?bvid=${video.bvid}`;
      const resp = await fetch(infoUrl, {
        headers: {
          'User-Agent': config.userAgent,
          Referer: 'https://www.bilibili.com',
        },
      });
      if (resp.ok) {
        const info = (await resp.json()) as Record<string, unknown>;
        const data = info.data as Record<string, unknown> | undefined;
        if (data?.aid) {
          aid = Number(data.aid);
          await prisma.bilibiliVideo.update({
            where: { id: video.id },
            data: { aid },
          });
        }
      }
    } catch {
      // ignore
    }

    if (!aid) {
      await prisma.bilibiliVideo.update({
        where: { id: video.id },
        data: { last_poll_status: 'error', last_poll_error: 'no_aid' },
      });
      return { status: 'error', new_comments: 0 };
    }
  }

  const lastRpid = video.last_rpid;
  const allComments: BilibiliComment[] = [];
  let hasMore = true;
  let page = 1;

  while (hasMore && page <= MAX_PAGES) {
    const comments = await fetchCommentsWithRetry(aid, page, config);

    if (comments === null) {
      await prisma.bilibiliVideo.update({
        where: { id: video.id },
        data: { last_poll_status: 'error', last_poll_error: 'retry_exhausted' },
      });
      break;
    }

    if (comments.length === 0) {
      hasMore = false;
      break;
    }

    if (lastRpid > 0) {
      const newOnes = comments.filter((c) => c.rpid > lastRpid);
      if (newOnes.length > 0) {
        allComments.push(...newOnes);
      } else {
        hasMore = false;
        break;
      }

      // Check if we've reached older comments
      if (comments.some((c) => c.rpid <= lastRpid)) {
        hasMore = false;
      }
    } else {
      allComments.push(...comments);
    }

    page++;
  }

  // Update poll status
  if (allComments.length > 0) {
    const maxRpid = Math.max(...allComments.map((c) => c.rpid));
    await prisma.bilibiliVideo.update({
      where: { id: video.id },
      data: {
        last_rpid: maxRpid,
        last_polled_at: new Date(),
        last_poll_status: 'ok',
        last_poll_error: null,
      },
    });
  } else {
    const current = await prisma.bilibiliVideo.findUnique({ where: { id: video.id } });
    if (current?.last_poll_status !== 'error') {
      await prisma.bilibiliVideo.update({
        where: { id: video.id },
        data: { last_polled_at: new Date(), last_poll_status: 'no_new', last_poll_error: null },
      });
    }
  }

  // Inject new comments into the pipeline
  let injected = 0;
  for (const c of allComments) {
    const platform = 'bilibili';
    const canonicalCommentId = `${platform}:${c.rpid}`;

    try {
      await prisma.comment.create({
        data: {
          platform,
          canonical_comment_id: canonicalCommentId,
          comment_id: String(c.rpid),
          video_id: video.bvid,
          user_id: String(c.mid),
          content: c.content,
          parent_id: c.parent_rpid ? String(c.parent_rpid) : null,
        },
      });
      injected++;
      console.info(`[bilibili-poller] Injected comment rpid=${c.rpid} bvid=${video.bvid} user=${c.mid}`);
    } catch {
      // Duplicate comment — skip
    }
  }

  console.info(`[bilibili-poller] bvid=${video.bvid} total=${allComments.length} injected=${injected}`);

  return { status: 'success', new_comments: injected };
}

/**
 * Poll all enabled videos — main entry point
 */
export async function pollAllVideos(): Promise<PollResult> {
  const prisma = getPrisma();

  const config = await loadConfig(prisma);
  if (!config) {
    return emptyPollResult('disabled');
  }

  const videos = await prisma.bilibiliVideo.findMany({
    where: { poll_enabled: true },
  });

  if (videos.length === 0) {
    return emptyPollResult('no_videos');
  }

  let totalComments = 0;
  let totalEvents = 0;
  const details: PollResult['details'] = [];

  for (const video of videos) {
    try {
      const result = await pollVideoComments(
        prisma,
        { id: video.id, bvid: video.bvid, aid: video.aid, last_rpid: video.last_rpid },
        config,
      );
      totalComments += result.new_comments;
      totalEvents += result.new_comments;

      details.push({
        bvid: video.bvid,
        comments: result.new_comments,
        status: result.status,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[bilibili-poller] Error polling bvid=${video.bvid}: ${msg}`);
      details.push({ bvid: video.bvid, comments: 0, status: 'error', error: msg });
    }
  }

  return {
    status: 'completed',
    videos: videos.length,
    comments: totalComments,
    events_injected: totalEvents,
    details,
  };
}

export async function pollVideoById(videoId: number): Promise<PollResult> {
  const prisma = getPrisma();

  const config = await loadConfig(prisma);
  if (!config) {
    return emptyPollResult('disabled');
  }

  const video = await prisma.bilibiliVideo.findUnique({
    where: { id: videoId },
  });
  if (!video) {
    return emptyPollResult('not_found');
  }

  try {
    const result = await pollVideoComments(
      prisma,
      { id: video.id, bvid: video.bvid, aid: video.aid, last_rpid: video.last_rpid },
      config,
    );

    return {
      status: 'completed',
      videos: 1,
      comments: result.new_comments,
      events_injected: result.new_comments,
      details: [
        {
          bvid: video.bvid,
          comments: result.new_comments,
          status: result.status,
        },
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[bilibili-poller] Error polling bvid=${video.bvid}: ${msg}`);
    return {
      status: 'error',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: video.bvid,
          comments: 0,
          status: 'error',
          error: msg,
        },
      ],
    };
  }
}
