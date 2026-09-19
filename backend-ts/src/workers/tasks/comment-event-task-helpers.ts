/**
 * Comment event task helpers — payload type, interaction/publish-intent builders,
 * queue factory. Extracted from comment-event.task.ts (pure extraction, no behavior change).
 */

import { BaseTaskPayload, createTaskQueue } from '../task-queue.js';
import type { InteractionEvent } from '../../domain/interaction/types.js';
import type { PublishIntent } from '../../domain/publish/types.js';

/**
 * Comment event payload structure
 */
export type CommentEventPayload = BaseTaskPayload & {
  comment_id: string;
  video_id?: string;
  user_id?: string;
  content?: string;
  parent_id?: string;
  platform?: string;
  source: string;
  force_long?: boolean;
  style_profile?: string;
  role_profile?: string;
  role_card_key?: string;
  interaction?: InteractionEvent;
  /** Active persona name (BilibiliCredential.name, TASK-002); attached by comment-ingest. */
  persona_id?: string;
  /**
   * D3 memory space id (TASK-004 G4). Optional — when present, comment-event.task recalls
   * top-K MemoryItem from this space and injects as memory_context into GenerateReplyService.
   * When absent, recall is skipped (byte-for-byte single-turn behavior, backward-compat).
   * Per-pet isolation (C-009): each pet maps to its own memory_space_id; caller resolves it.
   */
  memory_space_id?: number;
};

export function buildInteractionEventFromPayload(payload: CommentEventPayload): InteractionEvent {
  if (payload.interaction) {
    return payload.interaction;
  }

  const platform = (payload.platform || 'bilibili').trim().toLowerCase() || 'bilibili';

  return {
    platform,
    ingressSource: payload.source,
    traceId: payload.trace_id,
    actor: payload.user_id ? { platformUserId: payload.user_id } : undefined,
    reference: {
      subjectKind: 'comment',
      externalId: payload.comment_id,
      canonicalId: `${platform}:${payload.comment_id}`,
      containerId: payload.video_id,
      parentExternalId: payload.parent_id,
    },
    content: {
      text: payload.content,
    },
    legacyComment: {
      commentId: payload.comment_id,
      videoId: payload.video_id,
      parentId: payload.parent_id,
    },
  };
}

export function buildPublishIntent(input: {
  interaction: InteractionEvent;
  replyText: string;
  traceId: string;
  source?: string;
}): PublishIntent {
  const routeMetadata =
    input.interaction.platform === 'qq'
      ? {
          chat_type: input.interaction.reference.containerId ? 'group' : 'private',
          ...(input.interaction.actor?.platformUserId ? { user_id: input.interaction.actor.platformUserId } : {}),
        }
      : undefined;

  return {
    traceId: input.traceId,
    source: input.source ?? 'comment-event-worker',
    target: {
      platform: input.interaction.platform,
      targetKind: 'comment-reply',
      externalId: input.interaction.reference.externalId,
      canonicalId: input.interaction.reference.canonicalId,
      route: {
        containerId: input.interaction.reference.containerId,
        parentExternalId: input.interaction.reference.parentExternalId,
        metadata: routeMetadata,
      },
    },
    payload: {
      text: input.replyText,
    },
  };
}

/**
 * Create comment event queue
 */
export function createCommentEventQueue(queueName = 'comment-event') {
  return createTaskQueue<CommentEventPayload>(queueName);
}
