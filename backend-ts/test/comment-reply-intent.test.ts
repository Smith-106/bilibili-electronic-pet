import { describe, expect, it } from 'vitest';

import {
  buildCommentReplyPublishIntent,
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
});
