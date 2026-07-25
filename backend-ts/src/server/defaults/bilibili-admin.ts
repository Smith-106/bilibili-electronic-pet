import { getPrisma } from '../../lib/prisma.js';
import { DuplicateKeyError, isPrismaP2002 } from '../../lib/duplicate-key-error.js';
import type { BilibiliDiagnostics, BilibiliVideo, RuntimeSettings } from '../contracts.js';
import { normalizeBilibiliVideoRecord } from '../normalizers.js';

export async function defaultGetBilibiliStatus(input: {
  settings: RuntimeSettings;
  buildBilibiliDiagnostics: () => Promise<BilibiliDiagnostics> | BilibiliDiagnostics;
}): Promise<{
  ok: boolean;
  config: Record<string, unknown>;
  credential: Record<string, unknown> | null;
  videos: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
}> {
  const prisma = getPrisma();
  const [credential, totalVideos, pollEnabledCount, diagnostics] = await Promise.all([
    prisma.bilibiliCredential.findFirst({
      where: { is_active: true },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    }),
    prisma.bilibiliVideo.count({}),
    prisma.bilibiliVideo.count({ where: { poll_enabled: true } }),
    input.buildBilibiliDiagnostics(),
  ]);

  return {
    ok: true,
    config: {
      enabled: input.settings.bilibiliEnabled,
      poll_enabled: input.settings.bilibiliPollEnabled,
      publish_enabled: input.settings.bilibiliPublishEnabled,
      poll_interval_seconds: input.settings.bilibiliPollIntervalSeconds,
      rate_limit_per_minute: 60,
    },
    credential: credential
      ? {
          id: credential.id,
          name: credential.name,
          is_active: credential.is_active,
          expires_at: credential.expires_at?.toISOString() ?? null,
          last_used_at: credential.last_used_at?.toISOString() ?? null,
          created_at: credential.created_at?.toISOString() ?? null,
          updated_at: credential.updated_at?.toISOString() ?? null,
        }
      : null,
    videos: {
      total: totalVideos,
      video_count: totalVideos,
      poll_enabled_count: pollEnabledCount,
    },
    diagnostics,
  };
}

export async function defaultListBilibiliVideos(input: {
  pollEnabled?: boolean;
  limit: number;
  offset: number;
}): Promise<{ ok: boolean; total: number; items: BilibiliVideo[] }> {
  const prisma = getPrisma();
  const where = input.pollEnabled === undefined ? {} : { poll_enabled: input.pollEnabled };
  const [total, items] = await Promise.all([
    prisma.bilibiliVideo.count({ where }),
    prisma.bilibiliVideo.findMany({
      where,
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      skip: input.offset,
      take: input.limit,
    }),
  ]);
  const bvids = items.map((item) => item.bvid).filter((value): value is string => Boolean(value));
  const comments =
    bvids.length === 0
      ? []
      : await prisma.comment.findMany({
          where: { video_id: { in: bvids } },
          select: { video_id: true },
        });
  const commentCounts = new Map<string, number>();
  for (const comment of comments) {
    const videoId = String(comment.video_id ?? '');
    if (!videoId) {
      continue;
    }
    commentCounts.set(videoId, (commentCounts.get(videoId) ?? 0) + 1);
  }

  return {
    ok: true,
    total,
    items: items.map((item) =>
      normalizeBilibiliVideoRecord(item as unknown as Record<string, unknown>, {
        commentCount: commentCounts.get(item.bvid) ?? 0,
      }),
    ),
  };
}

export async function defaultAddBilibiliVideo(input: {
  bvid: string;
  pollEnabled?: boolean;
}): Promise<{ ok: boolean; item: BilibiliVideo }> {
  const prisma = getPrisma();
  let item;
  try {
    item = await prisma.bilibiliVideo.create({
      data: {
        bvid: input.bvid,
        poll_enabled: input.pollEnabled ?? true,
      },
    });
  } catch (error) {
    // ISS-002: admin create of @unique bilibiliVideo.bvid — P2002 = duplicate bvid resubmit.
    // catch-as-conflict → 409 (admin path, not publisher's duplicate-success).
    if (isPrismaP2002(error)) {
      throw new DuplicateKeyError('bilibili_video_duplicate');
    }
    throw error;
  }

  return {
    ok: true,
    item: normalizeBilibiliVideoRecord(item as unknown as Record<string, unknown>),
  };
}
