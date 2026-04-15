/**
 * Comment event collector with source-aware field mapping
 * Migrated from: app/services/collector.py
 *
 * Normalizes incoming payloads from different sources (webhook, poller,
 * official, bilibili, douyin, kuaishou) using _pick_first + _read_path
 * for flexible field name resolution.
 */

import type { InteractionEvent } from '../domain/interaction/types.js';

// ── Helpers ────────────────────────────────────────────────

function readPath(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function pickFirst(payload: Record<string, unknown>, ...paths: string[]): unknown {
  for (const path of paths) {
    const value = readPath(payload, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str || undefined;
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return !value.trim();
  return false;
}

// ── Source Mappers ─────────────────────────────────────────
// Each mapper returns a normalized dict with canonical field names.

type Mapper = (payload: Record<string, unknown>) => Record<string, unknown>;

const mapWebhook: Mapper = (p) => ({
  comment_id: pickFirst(p, 'comment_id', 'commentId'),
  video_id: pickFirst(p, 'video_id', 'videoId'),
  user_id: pickFirst(p, 'user_id', 'userId'),
  content: pickFirst(p, 'content', 'message'),
  parent_id: pickFirst(p, 'parent_id', 'parentId'),
  trace_id: pickFirst(p, 'trace_id', 'traceId', 'meta.trace_id', 'meta.traceId'),
});

const mapPoller: Mapper = (p) => ({
  comment_id: pickFirst(p, 'comment_id', 'id', 'rpid', 'event.comment_id', 'event.id', 'event.rpid'),
  video_id: pickFirst(p, 'video_id', 'oid', 'aid', 'event.video_id', 'event.oid'),
  user_id: pickFirst(p, 'user_id', 'mid', 'uid', 'event.user_id', 'event.mid'),
  content: pickFirst(
    p,
    'content',
    'message',
    'text',
    'content.message',
    'event.content',
    'event.message',
    'event.content.message',
  ),
  parent_id: pickFirst(p, 'parent_id', 'root', 'parent', 'event.parent_id', 'event.root'),
  trace_id: pickFirst(p, 'trace_id', 'traceId', 'event.trace_id', 'event.traceId', 'meta.trace_id', 'meta.traceId'),
});

const mapOfficial: Mapper = (p) => ({
  comment_id: pickFirst(
    p,
    'comment_id',
    'commentId',
    'data.comment_id',
    'data.commentId',
    'event.comment_id',
    'event.commentId',
  ),
  video_id: pickFirst(p, 'video_id', 'videoId', 'data.video_id', 'data.videoId', 'event.video_id', 'event.videoId'),
  user_id: pickFirst(p, 'user_id', 'userId', 'data.user_id', 'data.userId', 'event.user_id', 'event.userId'),
  content: pickFirst(
    p,
    'content',
    'message',
    'data.content',
    'data.message',
    'event.content',
    'event.message',
    'event.content.message',
  ),
  parent_id: pickFirst(
    p,
    'parent_id',
    'parentId',
    'data.parent_id',
    'data.parentId',
    'event.parent_id',
    'event.parentId',
  ),
  trace_id: pickFirst(
    p,
    'trace_id',
    'traceId',
    'data.trace_id',
    'data.traceId',
    'event.trace_id',
    'event.traceId',
    'meta.trace_id',
    'meta.traceId',
  ),
});

const mapBilibili: Mapper = (p) => ({
  comment_id: pickFirst(p, 'comment_id', 'commentId', 'rpid', 'event.comment_id', 'event.rpid'),
  video_id: pickFirst(p, 'video_id', 'videoId', 'aid', 'bvid', 'event.video_id', 'event.aid'),
  user_id: pickFirst(p, 'user_id', 'userId', 'mid', 'event.user_id', 'event.mid'),
  content: pickFirst(p, 'content', 'message', 'text', 'event.content', 'event.message', 'event.content.message'),
  parent_id: pickFirst(p, 'parent_id', 'parentId', 'root', 'event.parent_id', 'event.root'),
  trace_id: pickFirst(p, 'trace_id', 'traceId', 'event.trace_id', 'event.traceId', 'meta.trace_id'),
});

const mapDouyin: Mapper = (p) => ({
  comment_id: pickFirst(p, 'comment_id', 'commentId', 'item_id', 'event.comment_id', 'event.item_id'),
  video_id: pickFirst(p, 'video_id', 'videoId', 'aweme_id', 'event.video_id', 'event.aweme_id'),
  user_id: pickFirst(p, 'user_id', 'userId', 'sec_uid', 'uid', 'event.user_id', 'event.sec_uid'),
  content: pickFirst(p, 'content', 'text', 'message', 'event.content', 'event.text', 'event.message'),
  parent_id: pickFirst(p, 'parent_id', 'parentId', 'reply_id', 'event.parent_id', 'event.reply_id'),
  trace_id: pickFirst(p, 'trace_id', 'traceId', 'event.trace_id', 'event.traceId', 'meta.trace_id'),
});

const mapQq: Mapper = (p) => ({
  comment_id: pickFirst(
    p,
    'comment_id',
    'commentId',
    'message_id',
    'messageId',
    'event.comment_id',
    'event.message_id',
    'event.messageId',
  ),
  video_id: pickFirst(p, 'video_id', 'videoId', 'group_id', 'groupId', 'chat_id', 'event.group_id', 'event.chat_id'),
  user_id: pickFirst(p, 'user_id', 'userId', 'sender_id', 'senderId', 'event.user_id', 'event.sender_id'),
  content: pickFirst(p, 'content', 'text', 'message', 'raw_message', 'event.content', 'event.text', 'event.message'),
  parent_id: pickFirst(p, 'parent_id', 'parentId', 'reply_to', 'event.parent_id', 'event.reply_to'),
  trace_id: pickFirst(p, 'trace_id', 'traceId', 'event.trace_id', 'event.traceId', 'meta.trace_id'),
});

const mapKuaishou: Mapper = (p) => ({
  comment_id: pickFirst(p, 'comment_id', 'commentId', 'comment_id_str', 'event.comment_id'),
  video_id: pickFirst(p, 'video_id', 'videoId', 'photo_id', 'event.video_id', 'event.photo_id'),
  user_id: pickFirst(p, 'user_id', 'userId', 'author_id', 'uid', 'event.user_id', 'event.author_id'),
  content: pickFirst(p, 'content', 'text', 'message', 'event.content', 'event.text', 'event.message'),
  parent_id: pickFirst(p, 'parent_id', 'parentId', 'root_comment_id', 'event.parent_id', 'event.root_comment_id'),
  trace_id: pickFirst(p, 'trace_id', 'traceId', 'event.trace_id', 'event.traceId', 'meta.trace_id'),
});

const SOURCE_MAPPERS: Record<string, Mapper> = {
  webhook: mapWebhook,
  poller: mapPoller,
  official: mapOfficial,
  bilibili: mapBilibili,
  qq: mapQq,
  douyin: mapDouyin,
  kuaishou: mapKuaishou,
};

// ── Public API ─────────────────────────────────────────────

export type CollectorSource = 'webhook' | 'poller' | 'official' | 'bilibili' | 'qq' | 'douyin' | 'kuaishou';

export interface CollectedCommentEvent {
  comment_id: string;
  video_id?: string;
  user_id?: string;
  content?: string;
  parent_id?: string;
  platform?: string;
  source: CollectorSource;
  trace_id?: string;
}

function resolveInteractionPlatform(event: Pick<CollectedCommentEvent, 'platform' | 'source'>): string {
  const candidate = (event.platform ?? '').trim().toLowerCase();
  if (candidate && !['webhook', 'poller', 'official'].includes(candidate)) {
    return candidate;
  }
  if (['bilibili', 'qq', 'douyin', 'kuaishou'].includes(event.source)) {
    return event.source;
  }
  return 'unknown';
}

function resolveInteractionCanonicalPlatform(event: Pick<CollectedCommentEvent, 'platform' | 'source'>): string {
  const platform = resolveInteractionPlatform(event);
  if (platform !== 'unknown') {
    return platform;
  }
  return (event.platform ?? event.source).trim().toLowerCase() || 'unknown';
}

export function normalizeCommentEventToInteractionEvent(event: CollectedCommentEvent): InteractionEvent {
  const platform = resolveInteractionPlatform(event);
  const canonicalPlatform = resolveInteractionCanonicalPlatform(event);

  return {
    platform,
    ingressSource: event.source,
    traceId: event.trace_id,
    actor: event.user_id ? { platformUserId: event.user_id } : undefined,
    reference: {
      subjectKind: 'comment',
      externalId: event.comment_id,
      canonicalId: `${canonicalPlatform}:${event.comment_id}`,
      containerId: event.video_id,
      parentExternalId: event.parent_id,
    },
    content: {
      text: event.content,
    },
    legacyComment: {
      commentId: event.comment_id,
      videoId: event.video_id,
      parentId: event.parent_id,
    },
  };
}

export function normalizeInteractionEventToCommentEvent(event: InteractionEvent): CollectedCommentEvent {
  const platform = event.platform.trim().toLowerCase() || 'unknown';

  return {
    comment_id: event.legacyComment?.commentId ?? event.reference.externalId,
    video_id: event.legacyComment?.videoId ?? event.reference.containerId,
    user_id: event.actor?.platformUserId,
    content: event.content.text,
    parent_id: event.legacyComment?.parentId ?? event.reference.parentExternalId,
    platform,
    source: event.ingressSource as CollectorSource,
    trace_id: event.traceId,
  };
}

/**
 * Collect and normalize a comment event from any source.
 * Applies source-specific field alias mapping before validation.
 */
export function collectCommentEvent(
  payload: Record<string, unknown>,
  source: CollectorSource,
  platform?: string,
): CollectedCommentEvent {
  const mapper = SOURCE_MAPPERS[source];
  if (!mapper) {
    throw new Error(`unsupported_collector_source: ${source}`);
  }

  const mapped = mapper(payload);

  // Validate required fields (only comment_id is strictly required at route level)
  if (isBlank(mapped.comment_id)) {
    throw new Error('invalid_' + source + '_payload: missing_fields=comment_id');
  }

  return {
    comment_id: toStringOrUndefined(mapped.comment_id) ?? '',
    video_id: toStringOrUndefined(mapped.video_id),
    user_id: toStringOrUndefined(mapped.user_id),
    content: toStringOrUndefined(mapped.content),
    parent_id: toStringOrUndefined(mapped.parent_id),
    platform: platform ?? source,
    source,
    trace_id: toStringOrUndefined(mapped.trace_id),
  };
}

export function collectInteractionEvent(
  payload: Record<string, unknown>,
  source: CollectorSource,
  platform?: string,
): InteractionEvent {
  return normalizeCommentEventToInteractionEvent(collectCommentEvent(payload, source, platform));
}
