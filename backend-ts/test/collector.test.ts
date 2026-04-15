import { describe, expect, it } from 'vitest';

import {
  collectCommentEvent,
  collectInteractionEvent,
  normalizeCommentEventToInteractionEvent,
  normalizeInteractionEventToCommentEvent,
} from '../src/services/collector.js';

describe('collector interaction seam', () => {
  it('keeps the legacy comment event shape for existing pipelines', () => {
    expect(
      collectCommentEvent(
        {
          event: {
            rpid: 'reply-1',
            aid: 'BV1xx',
            mid: 'user-9',
            message: 'hello world',
            root: 'root-1',
            trace_id: 'trace-1',
          },
        },
        'bilibili',
        'bilibili',
      ),
    ).toEqual({
      comment_id: 'reply-1',
      video_id: 'BV1xx',
      user_id: 'user-9',
      content: 'hello world',
      parent_id: 'root-1',
      platform: 'bilibili',
      source: 'bilibili',
      trace_id: 'trace-1',
    });
  });

  it('normalizes a collected comment into a platform-agnostic interaction event', () => {
    expect(
      normalizeCommentEventToInteractionEvent({
        comment_id: 'reply-1',
        video_id: 'BV1xx',
        user_id: 'user-9',
        content: 'hello world',
        parent_id: 'root-1',
        platform: 'bilibili',
        source: 'bilibili',
        trace_id: 'trace-1',
      }),
    ).toEqual({
      platform: 'bilibili',
      ingressSource: 'bilibili',
      traceId: 'trace-1',
      actor: { platformUserId: 'user-9' },
      reference: {
        subjectKind: 'comment',
        externalId: 'reply-1',
        canonicalId: 'bilibili:reply-1',
        containerId: 'BV1xx',
        parentExternalId: 'root-1',
      },
      content: { text: 'hello world' },
      legacyComment: {
        commentId: 'reply-1',
        videoId: 'BV1xx',
        parentId: 'root-1',
      },
    });
  });

  it('falls back to an unknown platform for generic ingress sources', () => {
    expect(
      collectInteractionEvent(
        {
          comment_id: 'reply-2',
          content: 'pending platform attribution',
        },
        'webhook',
      ),
    ).toEqual({
      platform: 'unknown',
      ingressSource: 'webhook',
      traceId: undefined,
      actor: undefined,
      reference: {
        subjectKind: 'comment',
        externalId: 'reply-2',
        canonicalId: 'webhook:reply-2',
        containerId: undefined,
        parentExternalId: undefined,
      },
      content: { text: 'pending platform attribution' },
      legacyComment: {
        commentId: 'reply-2',
        videoId: undefined,
        parentId: undefined,
      },
    });
  });

  it('can derive the legacy comment shape back from an interaction event', () => {
    expect(
      normalizeInteractionEventToCommentEvent({
        platform: 'qq',
        ingressSource: 'sidecar',
        traceId: 'trace-2',
        actor: { platformUserId: 'user-2' },
        reference: {
          subjectKind: 'comment',
          externalId: 'external-2',
          canonicalId: 'qq:external-2',
          containerId: 'group-8',
          parentExternalId: 'parent-3',
        },
        content: { text: 'hello from sidecar' },
        legacyComment: {
          commentId: 'comment-compat-2',
          videoId: 'group-compat-8',
          parentId: 'parent-compat-3',
        },
      }),
    ).toEqual({
      comment_id: 'comment-compat-2',
      video_id: 'group-compat-8',
      user_id: 'user-2',
      content: 'hello from sidecar',
      parent_id: 'parent-compat-3',
      platform: 'qq',
      source: 'sidecar',
      trace_id: 'trace-2',
    });
  });
});
