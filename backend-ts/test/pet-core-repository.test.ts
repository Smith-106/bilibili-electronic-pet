import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPetCoreRepository } from '../src/infra/db/repositories/pet-core-repository.js';

const mockPrisma = {
  petState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  petAction: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

beforeEach(() => {
  mockPrisma.petState.findUnique.mockReset();
  mockPrisma.petState.upsert.mockReset();
  mockPrisma.petAction.findMany.mockReset();
  mockPrisma.petAction.create.mockReset();
});

describe('pet core repository', () => {
  it('returns null when no pet state exists for the profile', async () => {
    const repository = createPetCoreRepository(mockPrisma as never);
    mockPrisma.petState.findUnique.mockResolvedValue(null);

    await expect(repository.getState('default')).resolves.toBeNull();
    expect(mockPrisma.petState.findUnique).toHaveBeenCalledWith({
      where: { profile_key: 'default' },
    });
  });

  it('maps pet state records and falls back on invalid json payloads', async () => {
    const repository = createPetCoreRepository(mockPrisma as never);
    const timestamp = new Date('2026-04-12T00:00:00.000Z');
    mockPrisma.petState.findUnique.mockResolvedValue({
      id: 1,
      profile_key: 'default',
      pet_name: 'Mochi',
      species: 'cat',
      archetype: 'helper',
      mood_label: 'Calm',
      mood_note: 'Settled in',
      relationship_level: 'trusted',
      relationship_note: 'Stays close',
      progress_stage: 'stage-2',
      progress_label: 'Comfortable',
      next_milestone: null,
      last_check_in_at: timestamp,
      needs_json: 'not-json',
      proactive_signals_json: null,
      state_metadata: '{"energy":80}',
      created_at: timestamp,
      updated_at: timestamp,
    });

    await expect(repository.getState('default')).resolves.toEqual({
      id: 1,
      profile_key: 'default',
      pet_name: 'Mochi',
      species: 'cat',
      archetype: 'helper',
      mood_label: 'Calm',
      mood_note: 'Settled in',
      relationship_level: 'trusted',
      relationship_note: 'Stays close',
      progress_stage: 'stage-2',
      progress_label: 'Comfortable',
      next_milestone: null,
      last_check_in_at: timestamp,
      needs: [],
      proactive_signals: [],
      state_metadata: { energy: 80 },
      created_at: timestamp,
      updated_at: timestamp,
    });
  });

  it('upserts pet state records with serialized json fields', async () => {
    const repository = createPetCoreRepository(mockPrisma as never);
    const timestamp = new Date('2026-04-12T00:10:00.000Z');
    mockPrisma.petState.upsert.mockResolvedValue({
      id: 2,
      profile_key: 'default',
      pet_name: 'Mochi',
      species: 'cat',
      archetype: 'helper',
      mood_label: 'Happy',
      mood_note: 'Fed well',
      relationship_level: 'bonded',
      relationship_note: 'Follows commands',
      progress_stage: 'stage-3',
      progress_label: 'Thriving',
      next_milestone: 'Playtime',
      last_check_in_at: timestamp,
      needs_json: JSON.stringify([{ key: 'energy', label: 'Energy', score: 0.9 }]),
      proactive_signals_json: JSON.stringify([{ key: 'play', label: 'Play', detail: 'Wants attention' }]),
      state_metadata: JSON.stringify({ streak: 3 }),
      created_at: timestamp,
      updated_at: timestamp,
    });

    const input = {
      profile_key: 'default',
      pet_name: 'Mochi',
      species: 'cat',
      archetype: 'helper',
      mood_label: 'Happy',
      mood_note: 'Fed well',
      relationship_level: 'bonded',
      relationship_note: 'Follows commands',
      progress_stage: 'stage-3',
      progress_label: 'Thriving',
      next_milestone: 'Playtime',
      last_check_in_at: timestamp,
      needs: [{ key: 'energy', label: 'Energy', score: 0.9 as const }],
      proactive_signals: [{ key: 'play', label: 'Play', detail: 'Wants attention' }],
      state_metadata: { streak: 3 },
    };

    await expect(repository.upsertState(input)).resolves.toEqual({
      id: 2,
      ...input,
      created_at: timestamp,
      updated_at: timestamp,
    });

    expect(mockPrisma.petState.upsert).toHaveBeenCalledWith({
      where: { profile_key: 'default' },
      update: {
        pet_name: 'Mochi',
        species: 'cat',
        archetype: 'helper',
        mood_label: 'Happy',
        mood_note: 'Fed well',
        relationship_level: 'bonded',
        relationship_note: 'Follows commands',
        progress_stage: 'stage-3',
        progress_label: 'Thriving',
        next_milestone: 'Playtime',
        last_check_in_at: timestamp,
        needs_json: JSON.stringify([{ key: 'energy', label: 'Energy', score: 0.9 }]),
        proactive_signals_json: JSON.stringify([{ key: 'play', label: 'Play', detail: 'Wants attention' }]),
        state_metadata: JSON.stringify({ streak: 3 }),
        updated_at: expect.any(Date),
      },
      create: {
        profile_key: 'default',
        pet_name: 'Mochi',
        species: 'cat',
        archetype: 'helper',
        mood_label: 'Happy',
        mood_note: 'Fed well',
        relationship_level: 'bonded',
        relationship_note: 'Follows commands',
        progress_stage: 'stage-3',
        progress_label: 'Thriving',
        next_milestone: 'Playtime',
        last_check_in_at: timestamp,
        needs_json: JSON.stringify([{ key: 'energy', label: 'Energy', score: 0.9 }]),
        proactive_signals_json: JSON.stringify([{ key: 'play', label: 'Play', detail: 'Wants attention' }]),
        state_metadata: JSON.stringify({ streak: 3 }),
      },
    });
  });

  it('lists recent actions with descending order and default limit', async () => {
    const repository = createPetCoreRepository(mockPrisma as never);
    const createdAt = new Date('2026-04-12T00:20:00.000Z');
    mockPrisma.petAction.findMany.mockResolvedValue([
      {
        id: 3,
        profile_key: 'default',
        action: 'feed',
        note: 'night snack',
        event_detail: 'fed',
        state_metadata: 'invalid-json',
        created_at: createdAt,
        pet_state_id: 2,
      },
    ]);

    await expect(repository.listRecentActions()).resolves.toEqual([
      {
        id: 3,
        profile_key: 'default',
        action: 'feed',
        note: 'night snack',
        event_detail: 'fed',
        state_metadata: {},
        created_at: createdAt,
        pet_state_id: 2,
      },
    ]);

    expect(mockPrisma.petAction.findMany).toHaveBeenCalledWith({
      where: { profile_key: 'default' },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 6,
    });
  });

  it('creates action records with defaults and mapped metadata', async () => {
    const repository = createPetCoreRepository(mockPrisma as never);
    const createdAt = new Date('2026-04-12T00:30:00.000Z');
    mockPrisma.petAction.create.mockResolvedValue({
      id: 4,
      profile_key: 'default',
      action: 'play',
      note: null,
      event_detail: 'toy',
      state_metadata: JSON.stringify({ toy: 'ball' }),
      created_at: createdAt,
      pet_state_id: null,
    });

    await expect(
      repository.createAction({
        action: 'play',
        event_detail: 'toy',
      }),
    ).resolves.toEqual({
      id: 4,
      profile_key: 'default',
      action: 'play',
      note: null,
      event_detail: 'toy',
      state_metadata: { toy: 'ball' },
      created_at: createdAt,
      pet_state_id: null,
    });

    expect(mockPrisma.petAction.create).toHaveBeenCalledWith({
      data: {
        profile_key: 'default',
        pet_state_id: null,
        action: 'play',
        note: null,
        event_detail: 'toy',
        state_metadata: JSON.stringify({}),
      },
    });
  });
});
