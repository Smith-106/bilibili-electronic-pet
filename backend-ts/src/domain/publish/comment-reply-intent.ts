import type { PublishGatewayInput, PublishPlatformInput } from '../../server/contracts.js';
import type { PublishIntent, PublishTargetRoute } from './types.js';

export function buildCommentReplyPublishIntent(input: {
  platform: string;
  commentId: string;
  replyText: string;
  traceId?: string;
  source?: string;
  canonicalId?: string;
  route?: PublishTargetRoute;
}): PublishIntent {
  const platform = input.platform.trim().toLowerCase() || 'unknown';
  const commentId = input.commentId.trim();

  return {
    traceId: input.traceId,
    source: input.source,
    target: {
      platform,
      targetKind: 'comment-reply',
      externalId: commentId,
      canonicalId: input.canonicalId?.trim() || `${platform}:${commentId}`,
      route: input.route,
    },
    payload: {
      text: input.replyText,
    },
  };
}

export function buildGatewayPublishIntent(input: PublishGatewayInput): PublishIntent {
  return buildCommentReplyPublishIntent({
    platform: 'bilibili',
    commentId: input.commentId,
    replyText: input.replyText,
    traceId: input.traceId,
    source: input.source,
  });
}

export function buildPlatformPublishIntent(input: PublishPlatformInput): PublishIntent {
  return buildCommentReplyPublishIntent({
    platform: input.platform,
    commentId: input.commentId,
    replyText: input.replyText,
    traceId: input.traceId,
    source: 'platform-publish',
    canonicalId: input.canonicalId,
    route: {
      containerId: input.containerId,
      parentExternalId: input.parentExternalId,
      metadata: {
        ...(input.routingMetadata ?? {}),
        ...(input.userId ? { user_id: input.userId } : {}),
      },
    },
  });
}

export function resolveCommentReplyIntentParts(intent: PublishIntent): {
  commentId: string;
  replyText: string;
  platform: string;
  canonicalId: string;
  route?: PublishTargetRoute;
} {
  if (intent.target.targetKind !== 'comment-reply') {
    throw new Error(`unsupported_publish_target:${intent.target.targetKind}`);
  }

  return {
    commentId: intent.target.externalId,
    replyText: intent.payload.text,
    platform: intent.target.platform,
    canonicalId: intent.target.canonicalId,
    route: intent.target.route,
  };
}
