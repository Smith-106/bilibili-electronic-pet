import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = {
  comment: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  replyJob: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  roleCard: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  knowledgeEntry: {
    findMany: vi.fn(),
  },
  userState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  publishLog: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  memorySpace: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  memoryGrant: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  memoryItem: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  identityLink: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
}));

const {
  createComment,
  createPublishLog,
  createReplyJob,
  getActiveRoleCard,
  getCommentByCanonicalId,
  getPublishLogByCanonicalId,
  getReplyJobById,
  getReplyJobsByStatus,
  getRoleCardByKey,
  getUserState,
  searchKnowledge,
  updateReplyJobStatus,
  updateUserState,
} = await import('../src/services/db-queries.js');
const { createMemoryRepository } = await import('../src/infra/db/repositories/memory-repository.js');
const { createMemoryService } = await import('../src/app/memory/memory-service.js');
const { upsertCompanionFeedItem, COMPANION_SYSTEM_SPACE_KEY } = await import('../src/app/memory/companion-feed.js');

function resetMockPrisma(): void {
  mockPrisma.comment.findUnique.mockReset();
  mockPrisma.comment.create.mockReset();
  mockPrisma.replyJob.create.mockReset();
  mockPrisma.replyJob.findMany.mockReset();
  mockPrisma.replyJob.update.mockReset();
  mockPrisma.replyJob.findUnique.mockReset();
  mockPrisma.roleCard.findUnique.mockReset();
  mockPrisma.roleCard.findFirst.mockReset();
  mockPrisma.knowledgeEntry.findMany.mockReset();
  mockPrisma.userState.findUnique.mockReset();
  mockPrisma.userState.upsert.mockReset();
  mockPrisma.publishLog.findUnique.mockReset();
  mockPrisma.publishLog.create.mockReset();
  mockPrisma.memorySpace.findMany.mockReset();
  mockPrisma.memorySpace.create.mockReset();
  mockPrisma.memoryGrant.findMany.mockReset();
  mockPrisma.memoryGrant.upsert.mockReset();
  mockPrisma.memoryItem.findMany.mockReset();
  mockPrisma.memoryItem.upsert.mockReset();
  mockPrisma.identityLink.findMany.mockReset();
  mockPrisma.identityLink.upsert.mockReset();
}

beforeEach(() => {
  resetMockPrisma();
});

describe('comment db queries', () => {
  it('returns null when a canonical comment is missing', async () => {
    mockPrisma.comment.findUnique.mockResolvedValue(null);

    await expect(getCommentByCanonicalId('bilibili:missing')).resolves.toBeNull();
    expect(mockPrisma.comment.findUnique).toHaveBeenCalledWith({
      where: { canonical_comment_id: 'bilibili:missing' },
    });
  });

  it('maps a canonical comment into the service shape', async () => {
    const createdAt = new Date('2026-04-04T16:00:00.000Z');
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: 42,
      platform: 'bilibili',
      canonical_comment_id: 'bilibili:42',
      comment_id: '42',
      video_id: 'BV1xx',
      user_id: '10086',
      content: 'hello',
      parent_id: '7',
      created_at: createdAt,
    });

    await expect(getCommentByCanonicalId('bilibili:42')).resolves.toEqual({
      id: 42,
      platform: 'bilibili',
      canonical_comment_id: 'bilibili:42',
      comment_id: '42',
      video_id: 'BV1xx',
      user_id: '10086',
      content: 'hello',
      parent_id: '7',
      created_at: createdAt,
    });
  });

  it('creates a comment with nullable parent id', async () => {
    const createdAt = new Date('2026-04-04T16:10:00.000Z');
    mockPrisma.comment.create.mockResolvedValue({
      id: 43,
      platform: 'qq',
      canonical_comment_id: 'qq:43',
      comment_id: '43',
      video_id: 'group-1',
      user_id: 'alice',
      content: 'ping',
      parent_id: null,
      created_at: createdAt,
    });

    await expect(
      createComment({
        platform: 'qq',
        canonical_comment_id: 'qq:43',
        comment_id: '43',
        video_id: 'group-1',
        user_id: 'alice',
        content: 'ping',
        parent_id: '',
      }),
    ).resolves.toEqual({
      id: 43,
      platform: 'qq',
      canonical_comment_id: 'qq:43',
      comment_id: '43',
      video_id: 'group-1',
      user_id: 'alice',
      content: 'ping',
      parent_id: null,
      created_at: createdAt,
    });

    expect(mockPrisma.comment.create).toHaveBeenCalledWith({
      data: {
        platform: 'qq',
        canonical_comment_id: 'qq:43',
        comment_id: '43',
        video_id: 'group-1',
        user_id: 'alice',
        content: 'ping',
        parent_id: null,
      },
    });
  });
});

describe('reply job db queries', () => {
  it('creates reply jobs with defaults and serialized flags', async () => {
    mockPrisma.replyJob.create.mockResolvedValue({ id: 51 });

    await expect(
      createReplyJob({
        comment_id: 'c-1',
      }),
    ).resolves.toBe(51);

    expect(mockPrisma.replyJob.create).toHaveBeenCalledWith({
      data: {
        comment_id: 'c-1',
        canonical_comment_id: null,
        status: 'queued',
        length_mode: 'medium',
        style_mode: 'doro',
        reply_text: null,
        risk_flags: JSON.stringify({}),
        attempts: 0,
        published_at: null,
      },
    });
  });

  it('creates reply jobs with explicit nullable fields and zero attempts preserved by defaults', async () => {
    const publishedAt = new Date('2026-04-04T16:30:00.000Z');
    mockPrisma.replyJob.create.mockResolvedValue({ id: 52 });

    await expect(
      createReplyJob({
        comment_id: '',
        canonical_comment_id: 'bilibili:c-2',
        status: 'manual_queue',
        length_mode: 'short',
        style_mode: 'plain',
        reply_text: 'reply',
        risk_flags: { score: 1 },
        attempts: 0,
        published_at: publishedAt,
      }),
    ).resolves.toBe(52);

    expect(mockPrisma.replyJob.create).toHaveBeenCalledWith({
      data: {
        comment_id: '',
        canonical_comment_id: 'bilibili:c-2',
        status: 'manual_queue',
        length_mode: 'short',
        style_mode: 'plain',
        reply_text: 'reply',
        risk_flags: JSON.stringify({ score: 1 }),
        attempts: 0,
        published_at: publishedAt,
      },
    });
  });

  it('lists reply jobs by status and parses mixed risk flag storage', async () => {
    const createdAt = new Date('2026-04-04T17:00:00.000Z');
    mockPrisma.replyJob.findMany.mockResolvedValue([
      {
        id: 61,
        comment_id: 'c-1',
        canonical_comment_id: 'bilibili:c-1',
        status: 'manual_queue',
        length_mode: 'long',
        style_mode: 'warm',
        reply_text: 'reply 1',
        risk_flags: JSON.stringify({ score: 2 }),
        attempts: 1,
        published_at: null,
        created_at: createdAt,
      },
      {
        id: 62,
        comment_id: 'c-2',
        canonical_comment_id: null,
        status: 'manual_queue',
        length_mode: 'short',
        style_mode: 'plain',
        reply_text: 'reply 2',
        risk_flags: { score: 3 },
        attempts: 2,
        published_at: createdAt,
        created_at: createdAt,
      },
    ]);

    await expect(getReplyJobsByStatus('manual_queue')).resolves.toEqual([
      {
        id: 61,
        comment_id: 'c-1',
        canonical_comment_id: 'bilibili:c-1',
        status: 'manual_queue',
        length_mode: 'long',
        style_mode: 'warm',
        reply_text: 'reply 1',
        risk_flags: { score: 2 },
        attempts: 1,
        published_at: null,
        created_at: createdAt,
      },
      {
        id: 62,
        comment_id: 'c-2',
        canonical_comment_id: null,
        status: 'manual_queue',
        length_mode: 'short',
        style_mode: 'plain',
        reply_text: 'reply 2',
        risk_flags: { score: 3 },
        attempts: 2,
        published_at: createdAt,
        created_at: createdAt,
      },
    ]);

    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: { status: 'manual_queue' },
      orderBy: { created_at: 'asc' },
      take: 100,
    });
  });

  it('respects an explicit reply job limit', async () => {
    mockPrisma.replyJob.findMany.mockResolvedValue([]);

    await getReplyJobsByStatus('published', 5);

    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: { status: 'published' },
      orderBy: { created_at: 'asc' },
      take: 5,
    });
  });

  it('updates reply job status in place', async () => {
    mockPrisma.replyJob.update.mockResolvedValue(undefined);

    await expect(updateReplyJobStatus(77, 'published')).resolves.toBeUndefined();
    expect(mockPrisma.replyJob.update).toHaveBeenCalledWith({
      where: { id: 77 },
      data: { status: 'published' },
    });
  });

  it('returns null when a reply job cannot be found by id', async () => {
    mockPrisma.replyJob.findUnique.mockResolvedValue(null);

    await expect(getReplyJobById(80)).resolves.toBeNull();
    expect(mockPrisma.replyJob.findUnique).toHaveBeenCalledWith({
      where: { id: 80 },
    });
  });

  it('maps a reply job by id and preserves object risk flags', async () => {
    const createdAt = new Date('2026-04-04T17:20:00.000Z');
    mockPrisma.replyJob.findUnique.mockResolvedValue({
      id: 81,
      comment_id: 'c-81',
      canonical_comment_id: 'qq:c-81',
      status: 'published',
      length_mode: 'medium',
      style_mode: 'doro',
      reply_text: 'done',
      risk_flags: { publish_reason: 'ok' },
      attempts: 3,
      published_at: createdAt,
      created_at: createdAt,
    });

    await expect(getReplyJobById(81)).resolves.toEqual({
      id: 81,
      comment_id: 'c-81',
      canonical_comment_id: 'qq:c-81',
      status: 'published',
      length_mode: 'medium',
      style_mode: 'doro',
      reply_text: 'done',
      risk_flags: { publish_reason: 'ok' },
      attempts: 3,
      published_at: createdAt,
      created_at: createdAt,
    });
  });

  it('maps a reply job by id and parses string risk flags', async () => {
    const createdAt = new Date('2026-04-04T17:25:00.000Z');
    mockPrisma.replyJob.findUnique.mockResolvedValue({
      id: 82,
      comment_id: 'c-82',
      canonical_comment_id: 'bilibili:c-82',
      status: 'manual_queue',
      length_mode: 'long',
      style_mode: 'gentle',
      reply_text: 'pending',
      risk_flags: JSON.stringify({ reason: 'manual_review' }),
      attempts: 1,
      published_at: null,
      created_at: createdAt,
    });

    await expect(getReplyJobById(82)).resolves.toEqual({
      id: 82,
      comment_id: 'c-82',
      canonical_comment_id: 'bilibili:c-82',
      status: 'manual_queue',
      length_mode: 'long',
      style_mode: 'gentle',
      reply_text: 'pending',
      risk_flags: { reason: 'manual_review' },
      attempts: 1,
      published_at: null,
      created_at: createdAt,
    });
  });
});

describe('role card db queries', () => {
  it('returns null when the requested role card does not exist', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue(null);

    await expect(getRoleCardByKey('missing-card')).resolves.toBeNull();
    expect(mockPrisma.roleCard.findUnique).toHaveBeenCalledWith({
      where: { key: 'missing-card' },
    });
  });

  it('returns null when no active role card exists', async () => {
    mockPrisma.roleCard.findFirst.mockResolvedValue(null);

    await expect(getActiveRoleCard()).resolves.toBeNull();
  });

  it('preserves plain string tone values and parses object constraints', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue({
      id: 11,
      key: 'default',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay warm',
      tone: 'friendly',
      constraints: JSON.stringify({ max_length: 120 }),
      created_at: new Date('2026-04-04T16:00:00.000Z'),
      updated_at: new Date('2026-04-04T16:10:00.000Z'),
    });

    await expect(getRoleCardByKey('default')).resolves.toEqual({
      id: 11,
      key: 'default',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay warm',
      tone: 'friendly',
      constraints: { max_length: 120 },
      created_at: new Date('2026-04-04T16:00:00.000Z'),
      updated_at: new Date('2026-04-04T16:10:00.000Z'),
    });
  });

  it('preserves object tone values and normalizes blank constraints', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue({
      id: 13,
      key: 'object-card',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay structured',
      tone: { style: 'formal' },
      constraints: '   ',
      created_at: new Date('2026-04-04T16:40:00.000Z'),
      updated_at: new Date('2026-04-04T16:50:00.000Z'),
    });

    await expect(getRoleCardByKey('object-card')).resolves.toEqual({
      id: 13,
      key: 'object-card',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay structured',
      tone: { style: 'formal' },
      constraints: '',
      created_at: new Date('2026-04-04T16:40:00.000Z'),
      updated_at: new Date('2026-04-04T16:50:00.000Z'),
    });
  });

  it('falls back for non-string tone values and preserves json primitives as strings', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue({
      id: 14,
      key: 'edge-card',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay careful',
      tone: 7,
      constraints: JSON.stringify(['avoid spam']),
      created_at: new Date('2026-04-04T16:55:00.000Z'),
      updated_at: new Date('2026-04-04T17:00:00.000Z'),
    });

    await expect(getRoleCardByKey('edge-card')).resolves.toEqual({
      id: 14,
      key: 'edge-card',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay careful',
      tone: '',
      constraints: '["avoid spam"]',
      created_at: new Date('2026-04-04T16:55:00.000Z'),
      updated_at: new Date('2026-04-04T17:00:00.000Z'),
    });
  });

  it('preserves plain string constraints for the active role card', async () => {
    mockPrisma.roleCard.findFirst.mockResolvedValue({
      id: 12,
      key: 'active-card',
      enabled: true,
      is_active: true,
      system_prompt: 'Be concise',
      tone: JSON.stringify({ style: 'formal' }),
      constraints: 'avoid spoilers',
      created_at: new Date('2026-04-04T16:20:00.000Z'),
      updated_at: new Date('2026-04-04T16:30:00.000Z'),
    });

    await expect(getActiveRoleCard()).resolves.toEqual({
      id: 12,
      key: 'active-card',
      enabled: true,
      is_active: true,
      system_prompt: 'Be concise',
      tone: { style: 'formal' },
      constraints: 'avoid spoilers',
      created_at: new Date('2026-04-04T16:20:00.000Z'),
      updated_at: new Date('2026-04-04T16:30:00.000Z'),
    });
    expect(mockPrisma.roleCard.findFirst).toHaveBeenCalledWith({
      where: {
        enabled: true,
        is_active: true,
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });
});

describe('knowledge, user state, and publish log queries', () => {
  it('searches enabled knowledge entries and maps the response shape', async () => {
    const updatedAt = new Date('2026-04-04T18:00:00.000Z');
    mockPrisma.knowledgeEntry.findMany.mockResolvedValue([
      {
        id: 91,
        category: 'faq',
        title: 'Shipping',
        content: 'Use tracking',
        enabled: true,
        updated_at: updatedAt,
      },
    ]);

    await expect(searchKnowledge('shipping')).resolves.toEqual([
      {
        id: 91,
        category: 'faq',
        title: 'Shipping',
        answer: 'Use tracking',
        enabled: true,
        updated_at: updatedAt,
      },
    ]);

    expect(mockPrisma.knowledgeEntry.findMany).toHaveBeenCalledWith({
      where: {
        enabled: true,
        OR: [
          { title: { contains: 'shipping' } },
          { content: { contains: 'shipping' } },
          { category: { contains: 'shipping' } },
        ],
      },
      take: 10,
    });
  });

  it('returns null when a user state does not exist', async () => {
    mockPrisma.userState.findUnique.mockResolvedValue(null);

    await expect(getUserState('ghost')).resolves.toBeNull();
    expect(mockPrisma.userState.findUnique).toHaveBeenCalledWith({
      where: { user_id: 'ghost' },
    });
  });

  it('parses recent phrases from both string and object storage', async () => {
    const updatedAt = new Date('2026-04-04T18:10:00.000Z');
    mockPrisma.userState.findUnique.mockResolvedValueOnce({
      id: 101,
      user_id: 'alice',
      recent_phrases: JSON.stringify({ phrases: ['hello'] }),
      cooldown_enabled: true,
      updated_at: updatedAt,
    });
    mockPrisma.userState.upsert.mockResolvedValueOnce({
      id: 101,
      user_id: 'alice',
      recent_phrases: { phrases: ['world'] },
      cooldown_enabled: false,
      updated_at: updatedAt,
    });

    await expect(getUserState('alice')).resolves.toEqual({
      id: 101,
      user_id: 'alice',
      recent_phrases: { phrases: ['hello'] },
      cooldown_enabled: true,
      updated_at: updatedAt,
    });

    await expect(
      updateUserState('alice', {
        recent_phrases: { phrases: ['world'] },
      }),
    ).resolves.toEqual({
      id: 101,
      user_id: 'alice',
      recent_phrases: { phrases: ['world'] },
      cooldown_enabled: false,
      updated_at: updatedAt,
    });

    expect(mockPrisma.userState.upsert).toHaveBeenCalledWith({
      where: { user_id: 'alice' },
      update: {
        recent_phrases: JSON.stringify({ phrases: ['world'] }),
        cooldown_enabled: false,
      },
      create: {
        user_id: 'alice',
        recent_phrases: JSON.stringify({ phrases: ['world'] }),
        cooldown_enabled: false,
      },
    });
  });

  it('preserves object recent phrases and parses string upsert results with default updates', async () => {
    const updatedAt = new Date('2026-04-04T18:15:00.000Z');
    mockPrisma.userState.findUnique.mockResolvedValueOnce({
      id: 102,
      user_id: 'bob',
      recent_phrases: { phrases: ['object-storage'] },
      cooldown_enabled: false,
      updated_at: updatedAt,
    });
    mockPrisma.userState.upsert.mockResolvedValueOnce({
      id: 102,
      user_id: 'bob',
      recent_phrases: JSON.stringify({}),
      cooldown_enabled: false,
      updated_at: updatedAt,
    });

    await expect(getUserState('bob')).resolves.toEqual({
      id: 102,
      user_id: 'bob',
      recent_phrases: { phrases: ['object-storage'] },
      cooldown_enabled: false,
      updated_at: updatedAt,
    });

    await expect(updateUserState('bob', {})).resolves.toEqual({
      id: 102,
      user_id: 'bob',
      recent_phrases: {},
      cooldown_enabled: false,
      updated_at: updatedAt,
    });

    expect(mockPrisma.userState.upsert).toHaveBeenCalledWith({
      where: { user_id: 'bob' },
      update: {
        recent_phrases: JSON.stringify({}),
        cooldown_enabled: false,
      },
      create: {
        user_id: 'bob',
        recent_phrases: JSON.stringify({}),
        cooldown_enabled: false,
      },
    });
  });

  it('creates publish logs and returns existing logs by composite key', async () => {
    const createdAt = new Date('2026-04-04T18:20:00.000Z');
    const publishedAt = new Date('2026-04-04T18:21:00.000Z');
    mockPrisma.publishLog.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 111,
      platform: 'bilibili',
      canonical_comment_id: 'bilibili:111',
      comment_id: '111',
      reply_hash: 'hash-1',
      source: 'worker',
      status: 'published',
      published_at: publishedAt,
      failure_reason: null,
      created_at: createdAt,
    });
    mockPrisma.publishLog.create.mockResolvedValue({
      id: 111,
      platform: 'bilibili',
      canonical_comment_id: 'bilibili:111',
      comment_id: '111',
      reply_hash: 'hash-1',
      source: 'worker',
      status: 'published',
      published_at: publishedAt,
      failure_reason: null,
      created_at: createdAt,
    });

    await expect(getPublishLogByCanonicalId('bilibili:111', 'hash-0')).resolves.toBeNull();

    await expect(
      createPublishLog({
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:111',
        comment_id: '111',
        reply_hash: 'hash-1',
        source: 'worker',
        status: 'published',
        published_at: publishedAt,
      }),
    ).resolves.toEqual({
      id: 111,
      platform: 'bilibili',
      canonical_comment_id: 'bilibili:111',
      comment_id: '111',
      reply_hash: 'hash-1',
      source: 'worker',
      status: 'published',
      published_at: publishedAt,
      failure_reason: null,
      created_at: createdAt,
    });

    await expect(getPublishLogByCanonicalId('bilibili:111', 'hash-1')).resolves.toEqual({
      id: 111,
      platform: 'bilibili',
      canonical_comment_id: 'bilibili:111',
      comment_id: '111',
      reply_hash: 'hash-1',
      source: 'worker',
      status: 'published',
      published_at: publishedAt,
      failure_reason: null,
      created_at: createdAt,
    });

    expect(mockPrisma.publishLog.create).toHaveBeenCalledWith({
      data: {
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:111',
        comment_id: '111',
        reply_hash: 'hash-1',
        source: 'worker',
        status: 'published',
        published_at: publishedAt,
        failure_reason: null,
      },
    });
  });

  it('creates publish logs with explicit failure reason and null published time defaults', async () => {
    const createdAt = new Date('2026-04-04T18:30:00.000Z');
    mockPrisma.publishLog.create.mockResolvedValue({
      id: 112,
      platform: 'qq',
      canonical_comment_id: 'qq:112',
      comment_id: '112',
      reply_hash: 'hash-2',
      source: 'worker',
      status: 'failed',
      published_at: null,
      failure_reason: 'publish failed',
      created_at: createdAt,
    });

    await expect(
      createPublishLog({
        platform: 'qq',
        canonical_comment_id: 'qq:112',
        comment_id: '112',
        reply_hash: 'hash-2',
        source: 'worker',
        status: 'failed',
        failure_reason: 'publish failed',
      }),
    ).resolves.toEqual({
      id: 112,
      platform: 'qq',
      canonical_comment_id: 'qq:112',
      comment_id: '112',
      reply_hash: 'hash-2',
      source: 'worker',
      status: 'failed',
      published_at: null,
      failure_reason: 'publish failed',
      created_at: createdAt,
    });
  });
});

describe('memory repository and service', () => {
  it('lists memory spaces with repository filters', async () => {
    mockPrisma.memorySpace.findMany.mockResolvedValue([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    const repository = createMemoryRepository();

    await expect(repository.listSpaces({ spaceType: 'operator' })).resolves.toEqual([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    expect(mockPrisma.memorySpace.findMany).toHaveBeenCalledWith({
      where: { space_type: 'operator' },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('upserts memory grants with the composite space-subject key', async () => {
    mockPrisma.memoryGrant.upsert.mockResolvedValue({
      id: 5,
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'write',
      created_at: new Date('2026-04-08T09:00:00.000Z'),
      updated_at: new Date('2026-04-08T09:05:00.000Z'),
    });

    const repository = createMemoryRepository();

    await expect(
      repository.upsertGrant({
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
      }),
    ).resolves.toEqual({
      id: 5,
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'write',
      created_at: new Date('2026-04-08T09:00:00.000Z'),
      updated_at: new Date('2026-04-08T09:05:00.000Z'),
    });

    expect(mockPrisma.memoryGrant.upsert).toHaveBeenCalledWith({
      where: {
        uq_memory_grants_subject: {
          space_id: 7,
          subject_type: 'operator',
          subject_id: 'alice',
        },
      },
      update: {
        access_level: 'write',
        updated_at: expect.any(Date),
      },
      create: {
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
      },
    });
  });

  it('resolves accessible spaces from subject grants', async () => {
    mockPrisma.memoryGrant.findMany.mockResolvedValue([
      {
        id: 9,
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
        created_at: new Date('2026-04-08T09:00:00.000Z'),
        updated_at: new Date('2026-04-08T09:05:00.000Z'),
      },
    ]);
    mockPrisma.memorySpace.findMany.mockResolvedValue([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    const service = createMemoryService();

    await expect(service.listAccessibleSpaces('operator', 'alice')).resolves.toEqual([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    expect(mockPrisma.memoryGrant.findMany).toHaveBeenCalledWith({
      where: {
        subject_type: 'operator',
        subject_id: 'alice',
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    expect(mockPrisma.memorySpace.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [7] },
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('upserts identity links with a platform/external identity key', async () => {
    mockPrisma.identityLink.upsert.mockResolvedValue({
      id: 12,
      subject_type: 'operator',
      subject_id: 'alice',
      platform: 'bilibili',
      external_id: 'uid-42',
      display_name: 'Alice',
      created_at: new Date('2026-04-08T10:00:00.000Z'),
      updated_at: new Date('2026-04-08T10:15:00.000Z'),
    });

    const service = createMemoryService();

    await expect(
      service.linkIdentity({
        subject_type: 'operator',
        subject_id: 'alice',
        external_id: 'uid-42',
        display_name: 'Alice',
      }),
    ).resolves.toEqual({
      id: 12,
      subject_type: 'operator',
      subject_id: 'alice',
      platform: 'bilibili',
      external_id: 'uid-42',
      display_name: 'Alice',
      created_at: new Date('2026-04-08T10:00:00.000Z'),
      updated_at: new Date('2026-04-08T10:15:00.000Z'),
    });

    expect(mockPrisma.identityLink.upsert).toHaveBeenCalledWith({
      where: {
        uq_identity_links_platform_external: {
          platform: 'bilibili',
          external_id: 'uid-42',
        },
      },
      update: {
        subject_type: 'operator',
        subject_id: 'alice',
        display_name: 'Alice',
        updated_at: expect.any(Date),
      },
      create: {
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'bilibili',
        external_id: 'uid-42',
        display_name: 'Alice',
      },
    });
  });

  it('lists memory items with repository filters', async () => {
    mockPrisma.memoryItem.findMany.mockResolvedValue([
      {
        id: 21,
        space_id: 7,
        item_key: 'status:latest',
        content: 'Operator alpha is attentive.',
        content_type: 'summary',
        source: 'companion',
        item_metadata: JSON.stringify({ score: 0.8 }),
        created_at: new Date('2026-04-11T00:00:00.000Z'),
        updated_at: new Date('2026-04-11T00:10:00.000Z'),
      },
    ]);

    const repository = createMemoryRepository();

    await expect(repository.listItems({ spaceId: 7, contentType: 'summary' })).resolves.toEqual([
      {
        id: 21,
        space_id: 7,
        item_key: 'status:latest',
        content: 'Operator alpha is attentive.',
        content_type: 'summary',
        source: 'companion',
        item_metadata: { score: 0.8 },
        created_at: new Date('2026-04-11T00:00:00.000Z'),
        updated_at: new Date('2026-04-11T00:10:00.000Z'),
      },
    ]);

    expect(mockPrisma.memoryItem.findMany).toHaveBeenCalledWith({
      where: {
        space_id: 7,
        content_type: 'summary',
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('lists memory items with item key and source filters and maps blank metadata', async () => {
    mockPrisma.memoryItem.findMany.mockResolvedValue([
      {
        id: 22,
        space_id: 8,
        item_key: 'status:source-filtered',
        content: 'Filtered memory item.',
        content_type: 'note',
        source: 'operator',
        item_metadata: '',
        created_at: new Date('2026-04-11T01:00:00.000Z'),
        updated_at: new Date('2026-04-11T01:10:00.000Z'),
      },
    ]);

    const repository = createMemoryRepository();

    await expect(
      repository.listItems({
        itemKey: 'status:source-filtered',
        source: 'operator',
      }),
    ).resolves.toEqual([
      {
        id: 22,
        space_id: 8,
        item_key: 'status:source-filtered',
        content: 'Filtered memory item.',
        content_type: 'note',
        source: 'operator',
        item_metadata: {},
        created_at: new Date('2026-04-11T01:00:00.000Z'),
        updated_at: new Date('2026-04-11T01:10:00.000Z'),
      },
    ]);

    expect(mockPrisma.memoryItem.findMany).toHaveBeenCalledWith({
      where: {
        item_key: 'status:source-filtered',
        source: 'operator',
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('upserts memory items with the composite space-item key', async () => {
    mockPrisma.memoryItem.upsert.mockResolvedValue({
      id: 21,
      space_id: 7,
      item_key: 'status:latest',
      content: 'Operator alpha is attentive.',
      content_type: 'summary',
      source: 'companion',
      item_metadata: JSON.stringify({ score: 0.8 }),
      created_at: new Date('2026-04-11T00:00:00.000Z'),
      updated_at: new Date('2026-04-11T00:10:00.000Z'),
    });

    const service = createMemoryService();

    await expect(
      service.upsertItem({
        space_id: 7,
        item_key: 'status:latest',
        content: 'Operator alpha is attentive.',
        content_type: 'summary',
        source: 'companion',
        item_metadata: { score: 0.8 },
      }),
    ).resolves.toEqual({
      id: 21,
      space_id: 7,
      item_key: 'status:latest',
      content: 'Operator alpha is attentive.',
      content_type: 'summary',
      source: 'companion',
      item_metadata: { score: 0.8 },
      created_at: new Date('2026-04-11T00:00:00.000Z'),
      updated_at: new Date('2026-04-11T00:10:00.000Z'),
    });

    expect(mockPrisma.memoryItem.upsert).toHaveBeenCalledWith({
      where: {
        uq_memory_items_space_key: {
          space_id: 7,
          item_key: 'status:latest',
        },
      },
      update: {
        content: 'Operator alpha is attentive.',
        content_type: 'summary',
        source: 'companion',
        item_metadata: JSON.stringify({ score: 0.8 }),
        updated_at: expect.any(Date),
      },
      create: {
        space_id: 7,
        item_key: 'status:latest',
        content: 'Operator alpha is attentive.',
        content_type: 'summary',
        source: 'companion',
        item_metadata: JSON.stringify({ score: 0.8 }),
      },
    });
  });

  it('upserts memory spaces, items, grants, and identity links with repository defaults', async () => {
    mockPrisma.memorySpace.create.mockResolvedValueOnce({
      id: 41,
      space_key: 'operator:defaulted',
      space_type: 'operator',
      title: 'Defaulted',
      summary: '',
      created_at: new Date('2026-04-12T00:00:00.000Z'),
      updated_at: new Date('2026-04-12T00:01:00.000Z'),
    });
    mockPrisma.memoryItem.upsert.mockResolvedValueOnce({
      id: 42,
      space_id: 41,
      item_key: 'default:item',
      content: 'Default item',
      content_type: 'note',
      source: 'operator',
      item_metadata: '{}',
      created_at: new Date('2026-04-12T00:02:00.000Z'),
      updated_at: new Date('2026-04-12T00:03:00.000Z'),
    });
    mockPrisma.memoryGrant.upsert.mockResolvedValueOnce({
      id: 43,
      space_id: 41,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'read',
      created_at: new Date('2026-04-12T00:04:00.000Z'),
      updated_at: new Date('2026-04-12T00:05:00.000Z'),
    });
    mockPrisma.identityLink.upsert.mockResolvedValueOnce({
      id: 44,
      subject_type: 'operator',
      subject_id: 'alice',
      platform: 'bilibili',
      external_id: 'uid-default',
      display_name: null,
      created_at: new Date('2026-04-12T00:06:00.000Z'),
      updated_at: new Date('2026-04-12T00:07:00.000Z'),
    });

    const repository = createMemoryRepository();

    await expect(repository.createSpace({ space_key: 'operator:defaulted', title: 'Defaulted' })).resolves.toMatchObject({
      space_type: 'operator',
      summary: '',
    });
    await expect(repository.upsertItem({ space_id: 41, item_key: 'default:item', content: 'Default item' })).resolves.toMatchObject({
      content_type: 'note',
      source: 'operator',
      item_metadata: {},
    });
    await expect(
      repository.upsertGrant({ space_id: 41, subject_type: 'operator', subject_id: 'alice' }),
    ).resolves.toMatchObject({ access_level: 'read' });
    await expect(
      repository.upsertIdentityLink({ subject_type: 'operator', subject_id: 'alice', external_id: 'uid-default' }),
    ).resolves.toMatchObject({ platform: 'bilibili', display_name: null });

    expect(mockPrisma.memorySpace.create).toHaveBeenCalledWith({
      data: {
        space_key: 'operator:defaulted',
        space_type: 'operator',
        title: 'Defaulted',
        summary: '',
      },
    });
    expect(mockPrisma.memoryItem.upsert).toHaveBeenCalledWith({
      where: {
        uq_memory_items_space_key: {
          space_id: 41,
          item_key: 'default:item',
        },
      },
      update: {
        content: 'Default item',
        content_type: 'note',
        source: 'operator',
        item_metadata: '{}',
        updated_at: expect.any(Date),
      },
      create: {
        space_id: 41,
        item_key: 'default:item',
        content: 'Default item',
        content_type: 'note',
        source: 'operator',
        item_metadata: '{}',
      },
    });
    expect(mockPrisma.memoryGrant.upsert).toHaveBeenCalledWith({
      where: {
        uq_memory_grants_subject: {
          space_id: 41,
          subject_type: 'operator',
          subject_id: 'alice',
        },
      },
      update: {
        access_level: 'read',
        updated_at: expect.any(Date),
      },
      create: {
        space_id: 41,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'read',
      },
    });
    expect(mockPrisma.identityLink.upsert).toHaveBeenCalledWith({
      where: {
        uq_identity_links_platform_external: {
          platform: 'bilibili',
          external_id: 'uid-default',
        },
      },
      update: {
        subject_type: 'operator',
        subject_id: 'alice',
        display_name: null,
        updated_at: expect.any(Date),
      },
      create: {
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'bilibili',
        external_id: 'uid-default',
        display_name: null,
      },
    });
  });

  it('lists grants and identity links with all repository filters', async () => {
    mockPrisma.memoryGrant.findMany.mockResolvedValueOnce([
      {
        id: 45,
        space_id: 41,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'read',
        created_at: new Date('2026-04-12T01:00:00.000Z'),
        updated_at: new Date('2026-04-12T01:01:00.000Z'),
      },
    ]);
    mockPrisma.identityLink.findMany.mockResolvedValueOnce([
      {
        id: 46,
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'qq',
        external_id: 'qq-openid-1',
        display_name: 'Alice QQ',
        created_at: new Date('2026-04-12T01:02:00.000Z'),
        updated_at: new Date('2026-04-12T01:03:00.000Z'),
      },
    ]);

    const repository = createMemoryRepository();

    await expect(
      repository.listGrants({ spaceId: 41, subjectType: 'operator', subjectId: 'alice' }),
    ).resolves.toEqual([
      {
        id: 45,
        space_id: 41,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'read',
        created_at: new Date('2026-04-12T01:00:00.000Z'),
        updated_at: new Date('2026-04-12T01:01:00.000Z'),
      },
    ]);
    await expect(
      repository.listIdentityLinks({
        subjectType: 'operator',
        subjectId: 'alice',
        platform: 'qq',
        externalId: 'qq-openid-1',
      }),
    ).resolves.toEqual([
      {
        id: 46,
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'qq',
        external_id: 'qq-openid-1',
        display_name: 'Alice QQ',
        created_at: new Date('2026-04-12T01:02:00.000Z'),
        updated_at: new Date('2026-04-12T01:03:00.000Z'),
      },
    ]);

    expect(mockPrisma.memoryGrant.findMany).toHaveBeenCalledWith({
      where: {
        space_id: 41,
        subject_type: 'operator',
        subject_id: 'alice',
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    expect(mockPrisma.identityLink.findMany).toHaveBeenCalledWith({
      where: {
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'qq',
        external_id: 'qq-openid-1',
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('lists grants and identity links when optional repository filters are omitted', async () => {
    mockPrisma.memoryGrant.findMany.mockResolvedValueOnce([]);
    mockPrisma.identityLink.findMany.mockResolvedValueOnce([]);

    const repository = createMemoryRepository();

    await expect(repository.listGrants({ spaceId: 41 })).resolves.toEqual([]);
    await expect(repository.listIdentityLinks({})).resolves.toEqual([]);

    expect(mockPrisma.memoryGrant.findMany).toHaveBeenCalledWith({
      where: {
        space_id: 41,
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    expect(mockPrisma.identityLink.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('creates the companion system space on first signal write', async () => {
    mockPrisma.memorySpace.findMany.mockResolvedValueOnce([]);
    mockPrisma.memorySpace.create.mockResolvedValueOnce({
      id: 99,
      space_key: COMPANION_SYSTEM_SPACE_KEY,
      space_type: 'system',
      title: 'Companion System',
      summary: 'Auto-generated companion feed signals sourced from backend activity.',
      created_at: new Date('2026-04-11T00:00:00.000Z'),
      updated_at: new Date('2026-04-11T00:00:00.000Z'),
    });
    mockPrisma.memoryItem.upsert.mockResolvedValueOnce({
      id: 31,
      space_id: 99,
      item_key: 'signal:publish-latest',
      content: 'Published reply for comment c-1.',
      content_type: 'companion_signal',
      source: 'worker',
      item_metadata: JSON.stringify({ trace_id: 'trace-1' }),
      created_at: new Date('2026-04-11T00:00:00.000Z'),
      updated_at: new Date('2026-04-11T00:01:00.000Z'),
    });

    await expect(
      upsertCompanionFeedItem({
        itemKey: 'signal:publish-latest',
        content: 'Published reply for comment c-1.',
        source: 'worker',
        metadata: { trace_id: 'trace-1' },
      }),
    ).resolves.toEqual({
      id: 31,
      space_id: 99,
      item_key: 'signal:publish-latest',
      content: 'Published reply for comment c-1.',
      content_type: 'companion_signal',
      source: 'worker',
      item_metadata: { trace_id: 'trace-1' },
      created_at: new Date('2026-04-11T00:00:00.000Z'),
      updated_at: new Date('2026-04-11T00:01:00.000Z'),
    });

    expect(mockPrisma.memorySpace.create).toHaveBeenCalled();
    expect(mockPrisma.memoryItem.upsert).toHaveBeenCalled();
  });

  it('reuses the companion system space after a concurrent unique-key race', async () => {
    mockPrisma.memorySpace.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 99,
          space_key: COMPANION_SYSTEM_SPACE_KEY,
          space_type: 'system',
          title: 'Companion System',
          summary: 'Auto-generated companion feed signals sourced from backend activity.',
          created_at: new Date('2026-04-11T00:00:00.000Z'),
          updated_at: new Date('2026-04-11T00:00:00.000Z'),
        },
      ]);
    mockPrisma.memorySpace.create.mockRejectedValueOnce(new Error('P2002 unique constraint failed'));
    mockPrisma.memoryItem.upsert.mockResolvedValueOnce({
      id: 32,
      space_id: 99,
      item_key: 'signal:race-latest',
      content: 'Concurrent writer already created the companion space.',
      content_type: 'companion_signal',
      source: 'worker',
      item_metadata: JSON.stringify({ trace_id: 'trace-race-1' }),
      created_at: new Date('2026-04-11T00:00:00.000Z'),
      updated_at: new Date('2026-04-11T00:01:00.000Z'),
    });

    await expect(
      upsertCompanionFeedItem({
        itemKey: 'signal:race-latest',
        content: 'Concurrent writer already created the companion space.',
        source: 'worker',
        metadata: { trace_id: 'trace-race-1' },
      }),
    ).resolves.toEqual({
      id: 32,
      space_id: 99,
      item_key: 'signal:race-latest',
      content: 'Concurrent writer already created the companion space.',
      content_type: 'companion_signal',
      source: 'worker',
      item_metadata: { trace_id: 'trace-race-1' },
      created_at: new Date('2026-04-11T00:00:00.000Z'),
      updated_at: new Date('2026-04-11T00:01:00.000Z'),
    });

    expect(mockPrisma.memorySpace.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.memorySpace.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.memoryItem.upsert).toHaveBeenCalledWith({
      where: {
        uq_memory_items_space_key: {
          space_id: 99,
          item_key: 'signal:race-latest',
        },
      },
      update: {
        content: 'Concurrent writer already created the companion space.',
        content_type: 'companion_signal',
        source: 'worker',
        item_metadata: JSON.stringify({ trace_id: 'trace-race-1' }),
        updated_at: expect.any(Date),
      },
      create: {
        space_id: 99,
        item_key: 'signal:race-latest',
        content: 'Concurrent writer already created the companion space.',
        content_type: 'companion_signal',
        source: 'worker',
        item_metadata: JSON.stringify({ trace_id: 'trace-race-1' }),
      },
    });
  });

  it('reuses an existing companion system space and writes default feed metadata', async () => {
    mockPrisma.memorySpace.findMany.mockResolvedValueOnce([
      {
        id: 100,
        space_key: COMPANION_SYSTEM_SPACE_KEY,
        space_type: 'system',
        title: 'Companion System',
        summary: 'Existing space',
        created_at: new Date('2026-04-13T00:00:00.000Z'),
        updated_at: new Date('2026-04-13T00:01:00.000Z'),
      },
    ]);
    mockPrisma.memoryItem.upsert.mockResolvedValueOnce({
      id: 33,
      space_id: 100,
      item_key: 'signal:defaults',
      content: 'Default companion signal.',
      content_type: 'companion_signal',
      source: 'system',
      item_metadata: '{}',
      created_at: new Date('2026-04-13T00:02:00.000Z'),
      updated_at: new Date('2026-04-13T00:03:00.000Z'),
    });

    await expect(
      upsertCompanionFeedItem({
        itemKey: 'signal:defaults',
        content: 'Default companion signal.',
      }),
    ).resolves.toMatchObject({
      space_id: 100,
      item_key: 'signal:defaults',
      content_type: 'companion_signal',
      source: 'system',
      item_metadata: {},
    });

    expect(mockPrisma.memorySpace.create).not.toHaveBeenCalled();
    expect(mockPrisma.memoryItem.upsert).toHaveBeenCalledWith({
      where: {
        uq_memory_items_space_key: {
          space_id: 100,
          item_key: 'signal:defaults',
        },
      },
      update: {
        content: 'Default companion signal.',
        content_type: 'companion_signal',
        source: 'system',
        item_metadata: '{}',
        updated_at: expect.any(Date),
      },
      create: {
        space_id: 100,
        item_key: 'signal:defaults',
        content: 'Default companion signal.',
        content_type: 'companion_signal',
        source: 'system',
        item_metadata: '{}',
      },
    });
  });

  it('rethrows companion system space creation failures when the race fallback is empty', async () => {
    mockPrisma.memorySpace.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.memorySpace.create.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      upsertCompanionFeedItem({
        itemKey: 'signal:create-failed',
        content: 'This should not be written.',
      }),
    ).rejects.toThrow('database unavailable');

    expect(mockPrisma.memoryItem.upsert).not.toHaveBeenCalled();
  });
});
