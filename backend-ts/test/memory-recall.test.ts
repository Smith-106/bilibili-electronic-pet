import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMemoryService, __memoryServiceTesting } from '../src/app/memory/memory-service.js';
import type { MemoryItemRecord } from '../src/app/memory/types.js';
import type { MemoryRepository } from '../src/infra/db/repositories/memory-repository.js';
import { __llmClientTesting } from '../src/services/llm-client.js';

// MEMORY_RECALL_LIMIT env (TASK-004 G4): 与 llm-client.ts loadLLMConfig 同 process.env 内联读取 pattern
// (TASK-003 发现 trackedEnvKeys 是各测试文件本地 const, 非中心列表 — 故本文件独立维护).
const trackedEnvKeys = ['MEMORY_RECALL_LIMIT'] as const;

const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function clearTrackedEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function restoreTrackedEnv(): void {
  clearTrackedEnv();
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    }
  }
}

function buildItem(overrides: Partial<MemoryItemRecord> & { id: number }): MemoryItemRecord {
  const base: MemoryItemRecord = {
    id: overrides.id,
    space_id: 1,
    item_key: `item-${overrides.id}`,
    content: `content-${overrides.id}`,
    content_type: 'note',
    source: 'operator',
    item_metadata: {},
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };
  return { ...base, ...overrides };
}

function buildRepository(itemsBySpaceId: Record<number, MemoryItemRecord[]>): MemoryRepository {
  const repo: MemoryRepository = {
    listSpaces: vi.fn(async () => []),
    createSpace: vi.fn(async () => ({}) as never),
    listItems: vi.fn(async (filters) => {
      if (typeof filters?.spaceId === 'number') {
        return itemsBySpaceId[filters.spaceId] ?? [];
      }
      return [];
    }),
    upsertItem: vi.fn(async () => ({}) as never),
    listGrants: vi.fn(async () => []),
    upsertGrant: vi.fn(async () => ({}) as never),
    listIdentityLinks: vi.fn(async () => []),
    upsertIdentityLink: vi.fn(async () => ({}) as never),
  };
  return repo;
}

beforeEach(() => {
  clearTrackedEnv();
});

afterEach(() => {
  restoreTrackedEnv();
});

describe('D3 memory recall (TASK-004 G4, C-003/C-009)', () => {
  describe('resolveMemoryRecallLimit', () => {
    it('defaults to 20 when env unset', () => {
      expect(__memoryServiceTesting.resolveMemoryRecallLimit()).toBe(20);
    });

    it('honors a positive integer env value', () => {
      process.env.MEMORY_RECALL_LIMIT = '3';
      expect(__memoryServiceTesting.resolveMemoryRecallLimit()).toBe(3);
    });

    it('falls back to 20 for non-positive or NaN values', () => {
      for (const v of ['0', '-5', 'abc', '']) {
        process.env.MEMORY_RECALL_LIMIT = v;
        expect(__memoryServiceTesting.resolveMemoryRecallLimit()).toBe(20);
      }
    });

    it('clamps to MAX (1000) to defeat context-window bypass', () => {
      process.env.MEMORY_RECALL_LIMIT = '99999';
      expect(__memoryServiceTesting.resolveMemoryRecallLimit()).toBe(1000);
    });
  });

  describe('readConfidence', () => {
    it('returns metadata.confidence when it is a finite number', () => {
      expect(__memoryServiceTesting.readConfidence(buildItem({ id: 1, item_metadata: { confidence: 0.8 } }))).toBe(0.8);
    });

    it('returns 0 when confidence missing or non-finite (fail-open, no throw)', () => {
      expect(__memoryServiceTesting.readConfidence(buildItem({ id: 1, item_metadata: {} }))).toBe(0);
      expect(__memoryServiceTesting.readConfidence(buildItem({ id: 1, item_metadata: { confidence: 'high' } }))).toBe(0);
      expect(__memoryServiceTesting.readConfidence(buildItem({ id: 1, item_metadata: { confidence: NaN } }))).toBe(0);
      expect(__memoryServiceTesting.readConfidence(buildItem({ id: 1, item_metadata: { confidence: Infinity } }))).toBe(0);
    });
  });

  describe('recall sorting + truncation (C-003)', () => {
    it('returns items sorted by confidence DESC then updated_at DESC then id DESC', async () => {
      // 5 items, mixed confidence + timestamps. Expected order:
      //   id=2 (conf 0.9), id=5 (conf 0.5, latest ts), id=4 (conf 0.5, mid ts), id=3 (conf 0.1), id=1 (conf 0).
      const items: MemoryItemRecord[] = [
        buildItem({ id: 1, item_metadata: { confidence: 0 }, updated_at: new Date('2026-01-05T00:00:00.000Z') }),
        buildItem({ id: 2, item_metadata: { confidence: 0.9 }, updated_at: new Date('2026-01-01T00:00:00.000Z') }),
        buildItem({ id: 3, item_metadata: { confidence: 0.1 }, updated_at: new Date('2026-01-10T00:00:00.000Z') }),
        buildItem({ id: 4, item_metadata: { confidence: 0.5 }, updated_at: new Date('2026-01-08T00:00:00.000Z') }),
        buildItem({ id: 5, item_metadata: { confidence: 0.5 }, updated_at: new Date('2026-01-09T00:00:00.000Z') }),
      ];
      const repo = buildRepository({ 1: items });
      const service = createMemoryService(repo);

      const result = await service.recall(1);

      expect(result.items.map((i) => i.id)).toEqual([2, 5, 4, 3, 1]);
      expect(result.limit).toBe(20);
    });

    it('truncates to top-MEMORY_RECALL_LIMIT (C-003: MUST NOT inject full set)', async () => {
      // 5 items all confidence 0.5 (tie → updated_at DESC + id DESC). Limit=3 → top-3 by recency.
      process.env.MEMORY_RECALL_LIMIT = '3';
      const items: MemoryItemRecord[] = [
        buildItem({ id: 1, updated_at: new Date('2026-01-01T00:00:00.000Z') }),
        buildItem({ id: 2, updated_at: new Date('2026-01-02T00:00:00.000Z') }),
        buildItem({ id: 3, updated_at: new Date('2026-01-03T00:00:00.000Z') }),
        buildItem({ id: 4, updated_at: new Date('2026-01-04T00:00:00.000Z') }),
        buildItem({ id: 5, updated_at: new Date('2026-01-05T00:00:00.000Z') }),
      ];
      const repo = buildRepository({ 1: items });
      const service = createMemoryService(repo);

      const result = await service.recall(1);

      expect(result.items).toHaveLength(3);
      expect(result.limit).toBe(3);
      expect(result.items.map((i) => i.id)).toEqual([5, 4, 3]);
    });

    it('isolates by spaceId (C-009: per-pet space, recall only queries the given space)', async () => {
      const repo = buildRepository({
        1: [buildItem({ id: 1, space_id: 1, content: 'pet-A-memory' })],
        2: [buildItem({ id: 2, space_id: 2, content: 'pet-B-memory' })],
      });
      const service = createMemoryService(repo);

      const resultA = await service.recall(1);
      const resultB = await service.recall(2);

      expect(resultA.items.map((i) => i.content)).toEqual(['pet-A-memory']);
      expect(resultB.items.map((i) => i.content)).toEqual(['pet-B-memory']);
      // spaceId passed through to repository (per-pet isolation enforced at query layer, no schema change).
      expect(repo.listItems).toHaveBeenNthCalledWith(1, { spaceId: 1 });
      expect(repo.listItems).toHaveBeenNthCalledWith(2, { spaceId: 2 });
    });

    it('returns empty items (but valid limit) when space has no memory', async () => {
      const repo = buildRepository({ 1: [] });
      const service = createMemoryService(repo);

      const result = await service.recall(1);

      expect(result.items).toEqual([]);
      expect(result.limit).toBe(20);
    });
  });
});

describe('D3 memoryContext injection into buildMessages (TASK-004 G4, backward-compat)', () => {
  // Build a memoryContext with two items, verify it appears as a user message block.
  it('injects memory items as a 历史记忆 user message when memoryContext provided', () => {
    const memoryContext = {
      items: [
        buildItem({ id: 1, content: 'user said hello', updated_at: new Date('2026-07-01T00:00:00.000Z') }),
        buildItem({ id: 2, content: 'bot replied warmly', updated_at: new Date('2026-07-02T00:00:00.000Z') }),
      ],
      limit: 20,
    };

    const messages = __llmClientTesting.buildMessages(
      'system',
      'comment text',
      'knowledge',
      'search',
      'doro',
      undefined,
      'medium',
      memoryContext,
    );

    const memoryMsg = messages.find((m) => typeof m.content === 'string' && m.content.includes('历史记忆'));
    expect(memoryMsg).toBeDefined();
    expect(memoryMsg?.role).toBe('user');
    expect(memoryMsg?.content).toContain('user said hello');
    expect(memoryMsg?.content).toContain('bot replied warmly');
    expect(memoryMsg?.content).toContain('2026-07-01');
  });

  it('skips memory message when memoryContext is undefined (byte-for-byte single-turn backward-compat)', () => {
    const withoutMemory = __llmClientTesting.buildMessages(
      'system',
      'comment text',
      'knowledge',
      'search',
      'doro',
      undefined,
      'medium',
      undefined,
    );
    const baselineNoMemoryArg = __llmClientTesting.buildMessages(
      'system',
      'comment text',
      'knowledge',
      'search',
      'doro',
      undefined,
      'medium',
    );

    // Passing undefined MUST equal not passing the arg at all (byte-for-byte).
    expect(withoutMemory).toEqual(baselineNoMemoryArg);
    expect(withoutMemory.find((m) => m.content.includes('历史记忆'))).toBeUndefined();
  });

  it('skips memory message when memoryContext.items is empty', () => {
    const messages = __llmClientTesting.buildMessages(
      'system',
      'comment text',
      'knowledge',
      'search',
      'doro',
      undefined,
      'medium',
      { items: [], limit: 20 },
    );

    expect(messages.find((m) => m.content.includes('历史记忆'))).toBeUndefined();
  });
});
