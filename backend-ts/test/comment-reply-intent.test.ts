import { describe, expect, it } from 'vitest';

import {
  buildCommentReplyPublishIntent,
  buildGatewayPublishIntent,
  buildPlatformPublishIntent,
  resolveCommentReplyIntentParts,
} from '../src/domain/publish/comment-reply-intent.js';

describe('comment reply publish intent', () => {
  it('preserves optional route context for future platform adapters', () => {
    const intent = buildCommentReplyPublishIntent({
      platform: 'qq',
      commentId: 'message-1',
      replyText: 'reply text',
      traceId: 'trace-1',
      source: 'worker-test',
      canonicalId: 'qq:message-1',
      route: {
        containerId: 'group-42',
        parentExternalId: 'message-0',
        metadata: {
          chat_type: 'group',
          adapter: 'napcat',
        },
      },
    });

    expect(intent).toMatchObject({
      traceId: 'trace-1',
      source: 'worker-test',
      target: {
        platform: 'qq',
        targetKind: 'comment-reply',
        externalId: 'message-1',
        canonicalId: 'qq:message-1',
        route: {
          containerId: 'group-42',
          parentExternalId: 'message-0',
          metadata: {
            chat_type: 'group',
            adapter: 'napcat',
          },
        },
      },
      payload: {
        text: 'reply text',
      },
    });

    expect(resolveCommentReplyIntentParts(intent)).toEqual({
      commentId: 'message-1',
      replyText: 'reply text',
      platform: 'qq',
      canonicalId: 'qq:message-1',
      route: {
        containerId: 'group-42',
        parentExternalId: 'message-0',
        metadata: {
          chat_type: 'group',
          adapter: 'napcat',
        },
      },
    });
  });

  it('normalizes blank platforms and builds wrapper intents', () => {
    const blankPlatformIntent = buildCommentReplyPublishIntent({
      platform: '   ',
      commentId: ' comment-1 ',
      replyText: 'reply text',
      canonicalId: '   ',
    });

    expect(blankPlatformIntent.target).toMatchObject({
      platform: 'unknown',
      externalId: 'comment-1',
      canonicalId: 'unknown:comment-1',
    });

    expect(
      buildGatewayPublishIntent({
        commentId: 'gateway-comment',
        replyText: 'gateway reply',
        forcePublish: false,
        traceId: 'trace-gateway',
        source: 'gateway',
      }),
    ).toMatchObject({
      source: 'gateway',
      target: {
        platform: 'bilibili',
        canonicalId: 'bilibili:gateway-comment',
      },
    });

    expect(
      buildPlatformPublishIntent({
        platform: 'QQ',
        commentId: 'message-2',
        replyText: 'platform reply',
        forcePublish: true,
        traceId: 'trace-platform',
        containerId: 'group-1',
        parentExternalId: 'message-1',
        userId: 'user-1',
        routingMetadata: { scene: 'group' },
      }),
    ).toMatchObject({
      source: 'platform-publish',
      target: {
        platform: 'qq',
        canonicalId: 'qq:message-2',
        route: {
          metadata: {
            scene: 'group',
            user_id: 'user-1',
          },
        },
      },
    });
  });
});
