import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPetCoreService } from '../src/app/pet-core/service.js';
import type {
  CreatePetActionInput,
  PetActionRecord,
  PetCoreRepository,
  PetStateRecord,
  UpsertPetStateInput,
} from '../src/app/pet-core/types.js';

function buildState(overrides: Partial<PetStateRecord> = {}): PetStateRecord {
  return {
    id: 1,
    profile_key: 'default',
    pet_name: 'Mochi',
    species: 'browser-companion',
    archetype: 'gentle-helper',
    mood_label: 'Curious',
    mood_note: 'Ready for care.',
    relationship_level: 'Settling',
    relationship_note: 'The companion is still settling.',
    progress_stage: 'starter',
    progress_label: 'Starter loop',
    next_milestone: 'Stable care rhythm',
    last_check_in_at: null,
    needs: [
      { key: 'energy', label: 'Energy', score: 76, trend: 'steady' },
      { key: 'satiety', label: 'Satiety', score: 61, trend: 'steady' },
      { key: 'bond', label: 'Bond', score: 34, trend: 'steady' },
      { key: 'focus', label: 'Focus', score: 58, trend: 'steady' },
    ],
    proactive_signals: [],
    state_metadata: { action_count: 0 },
    created_at: new Date('2026-06-08T00:00:00.000Z'),
    updated_at: new Date('2026-06-08T00:00:00.000Z'),
    ...overrides,
  };
}

function buildAction(overrides: Partial<PetActionRecord> = {}): PetActionRecord {
  return {
    id: 1,
    profile_key: 'default',
    action: 'pat',
    note: null,
    event_detail: 'Pat interaction recorded and pet-core state advanced.',
    state_metadata: {},
    created_at: new Date('2026-06-08T00:10:00.000Z'),
    pet_state_id: 1,
    ...overrides,
  };
}

function createRepository(initialState: PetStateRecord | null, initialActions: PetActionRecord[] = []) {
  let state = initialState;
  let nextActionId = initialActions.length + 1;
  const actions = [...initialActions];

  const repository: PetCoreRepository = {
    getState: vi.fn(async () => state),
    upsertState: vi.fn(async (input: UpsertPetStateInput) => {
      state = {
        id: state?.id ?? 1,
        ...input,
        created_at: state?.created_at ?? new Date('2026-06-08T00:00:00.000Z'),
        updated_at: new Date('2026-06-08T00:20:00.000Z'),
      };
      return state;
    }),
    listRecentActions: vi.fn(async (_profileKey?: string, limit = 6) => actions.slice(0, limit)),
    createAction: vi.fn(async (input: CreatePetActionInput) => {
      const action = buildAction({
        id: nextActionId++,
        profile_key: input.profile_key ?? 'default',
        action: input.action,
        note: input.note ?? null,
        event_detail: input.event_detail,
        state_metadata: input.state_metadata ?? {},
        pet_state_id: input.pet_state_id ?? null,
      });
      actions.unshift(action);
      return action;
    }),
  };

  return {
    repository,
    getState: () => state,
    getActions: () => actions,
  };
}

describe('pet-core service coverage branches', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('returns null for v2 state when bootstrap is disabled and no state exists', async () => {
    const { repository } = createRepository(null);
    const service = createPetCoreService(repository);

    await expect(service.getCompanionStateV2()).resolves.toBeNull();

    expect(repository.upsertState).not.toHaveBeenCalled();
  });

  it('builds legacy companion state with default needs, generated signals, and bootstrap interaction', async () => {
    const { repository } = createRepository(
      buildState({
        needs: [],
        proactive_signals: [],
        last_check_in_at: null,
      }),
    );
    const service = createPetCoreService(repository);

    const state = await service.getCompanionState();

    expect(state?.vitals.map((entry) => entry.label)).toEqual(['Energy', 'Satiety', 'Bond', 'Focus', 'Stage']);
    expect(state?.recentSignals).toContain(
      'The companion still benefits from short reassurance actions and follow-up notes.',
    );
    expect(state?.recentInteractions).toEqual([
      {
        kind: 'signal',
        title: 'Pet core bootstrap',
        detail: 'Pet-core persistence is ready, but no interaction has been recorded yet.',
        timestamp: 'Pending',
        source: 'Pet Core',
      },
    ]);
  });

  it('records pat and wake actions with relationship and progress thresholds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T01:00:00.000Z'));
    const { repository, getState } = createRepository(
      buildState({
        needs: [
          { key: 'bond', label: 'Bond', score: 72, trend: 'steady' },
          { key: 'focus', label: 'Focus', score: 42, trend: 'steady' },
        ],
        state_metadata: { action_count: 11 },
      }),
    );
    const service = createPetCoreService(repository);

    const pat = await service.recordAction({ action: 'pat' });

    expect(pat.state.snapshot.relationship.level).toBe('Bonded');
    expect(pat.state.snapshot.progress.stage).toBe('bonded');
    expect(pat.state.companion.memorySummary).toContain('Cross-platform social scenes');
    expect(getState()?.needs.find((entry) => entry.key === 'bond')?.score).toBe(80);
    expect(getState()?.needs.find((entry) => entry.key === 'focus')?.score).toBe(45);

    const wake = await service.recordAction({ action: 'wake', note: 'morning reset' });

    expect(wake.action.event_detail).toBe('Wake interaction recorded. morning reset');
    expect(wake.state.companion.mood.label).toBe('Alert');
    expect(getState()?.needs.find((entry) => entry.key === 'energy')?.score).toBe(57);
  });

  it('records feed actions with low-need proactive signals and fallback action list', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T02:00:00.000Z'));
    const { repository } = createRepository(
      buildState({
        needs: [
          { key: 'energy', label: 'Energy', score: 20, trend: 'steady' },
          { key: 'satiety', label: 'Satiety', score: 20, trend: 'steady' },
          { key: 'bond', label: 'Bond', score: 46, trend: 'steady' },
          { key: 'focus', label: 'Focus', score: 20, trend: 'steady' },
        ],
        state_metadata: { action_count: 4 },
      }),
    );
    vi.mocked(repository.listRecentActions).mockResolvedValue([]);
    const service = createPetCoreService(repository);

    const result = await service.recordAction({ action: 'feed', note: null });

    expect(result.state.snapshot.progress.stage).toBe('settling');
    expect(result.state.snapshot.relationship.level).toBe('Growing');
    expect(result.state.snapshot.proactiveSignals.map((entry) => entry.key)).toEqual([
      'energy-recharge',
      'snack-reminder',
      'focus-reset',
    ]);
    expect(result.state.companion.recentInteractions[0]).toMatchObject({
      kind: 'feed',
      title: 'Feed interaction',
    });
  });

  it('handles runtime fallback action shapes and default state needs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T03:00:00.000Z'));
    const { repository, getState } = createRepository(
      buildState({
        needs: [],
        next_milestone: null,
        state_metadata: {},
      }),
    );
    const service = createPetCoreService(repository);

    const companionBeforeAction = await service.getCompanionState();

    expect(companionBeforeAction?.memorySummary).not.toContain('Next milestone');

    const result = await service.recordAction({ action: '' as never, note: '' });

    expect(result.action).toMatchObject({
      action: '',
      event_detail: ' interaction recorded and pet-core state advanced.',
    });
    expect(result.state.companion.recentInteractions[0]).toMatchObject({
      kind: '',
      title: ' interaction',
    });
    expect(result.state.companion.memorySummary).toContain('Next milestone: Stable care rhythm.');
    expect(getState()?.needs.map((entry) => entry.key)).toEqual(['energy', 'satiety', 'bond', 'focus']);
    expect(getState()?.state_metadata).toMatchObject({
      action_count: 1,
      last_action: '',
    });
  });
});
