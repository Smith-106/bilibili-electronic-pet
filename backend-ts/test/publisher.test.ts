import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  publishLog: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => prismaMock,
}));

vi.mock('../src/services/bilibili-client.js', () => ({
  postReply: vi.fn(),
}));

import { publishIntentWithResult } from '../src/services/publisher.js';

function buildIntent() {
  return {
    traceId: 'trace-publisher-1',
    source: 'publisher-test',
    target: {
      platform: 'qq',
      targetKind: 'comment-reply' as const,
      externalId: 'message-1',
      canonicalId: 'qq:message-1',
    },
    payload: {
      text: 'reply text',
    },
  };
}

describe('publisher duplicate log lookup fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLISHER_MODE = 'manual_queue';
  });

  afterEach(() => {
    delete process.env.PUBLISHER_MODE;
  });

  it('continues publish flow when duplicate lookup hits a known publish_log storage error', async () => {
    prismaMock.publishLog.findFirst.mockRejectedValueOnce(new Error('no such table: main.publish_logs'));
    prismaMock.publishLog.create.mockResolvedValueOnce({ id: 1 });

    const [published, reason, publishedAt, metadata] = await publishIntentWithResult(buildIntent());

    expect(published).toBe(true);
    expect(reason).toBe('manual_queued');
    expect(publishedAt).toBeInstanceOf(Date);
    expect(metadata).toBeNull();
    expect(prismaMock.publishLog.create).toHaveBeenCalledOnce();
  });

  it('returns publish_failed for non-storage lookup failures and records a failed publish log', async () => {
    prismaMock.publishLog.findFirst.mockRejectedValueOnce(new Error('db offline'));
    prismaMock.publishLog.create.mockResolvedValueOnce({ id: 2 });

    const [published, reason, publishedAt, metadata] = await publishIntentWithResult(buildIntent());

    expect(published).toBe(false);
    expect(reason).toBe('publish_failed');
    expect(publishedAt).toBeInstanceOf(Date);
    expect(metadata).toBeNull();
    expect(prismaMock.publishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          // BUG-006: failure_reason is the normalized enum, not the raw error message (which
          // could contain upstream content / DB internals). 'db offline' → 'publish_failed'.
          failure_reason: 'publish_failed',
        }),
      }),
    );
  });
});
