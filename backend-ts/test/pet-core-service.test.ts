import { describe, expect, it } from 'vitest';

import { createPetCoreService } from '../src/app/pet-core/service.js';
import type {
  CreatePetActionInput,
  PetActionRecord,
  PetCoreRepository,
  PetStateRecord,
  UpsertPetStateInput,
} from '../src/app/pet-core/types.js';

function createInMemoryRepository() {
  let state: PetStateRecord | null = null;
  let nextActionId = 1;
  const actions: PetActionRecord[] = [];

  const repository: PetCoreRepository = {
    async getState() {
      return state;
    },
    async upsertState(input: UpsertPetStateInput) {
      const persisted: PetStateRecord = {
        id: state?.id ?? 1,
        profile_key: input.profile_key,
        pet_name: input.pet_name,
        species: input.species,
        archetype: input.archetype,
        mood_label: input.mood_label,
        mood_note: input.mood_note,
        relationship_level: input.relationship_level,
        relationship_note: input.relationship_note,
        progress_stage: input.progress_stage,
        progress_label: input.progress_label,
        next_milestone: input.next_milestone,
        last_check_in_at: input.last_check_in_at,
        needs: input.needs,
        proactive_signals: input.proactive_signals,
        state_metadata: input.state_metadata,
        created_at: state?.created_at ?? new Date('2026-04-12T00:00:00.000Z'),
        updated_at: new Date('2026-04-12T00:00:00.000Z'),
      };
      state = persisted;
      return persisted;
    },
    async listRecentActions(_profileKey, limit = 6) {
      return actions.slice(0, limit);
    },
    async createAction(input: CreatePetActionInput) {
      const record: PetActionRecord = {
        id: nextActionId++,
        profile_key: input.profile_key ?? 'default',
        action: input.action,
        note: input.note ?? null,
        event_detail: input.event_detail,
        state_metadata: input.state_metadata ?? {},
        created_at: new Date('2026-04-12T00:10:00.000Z'),
        pet_state_id: input.pet_state_id ?? null,
      };
      actions.unshift(record);
      return record;
    },
  };

  return { repository, getState: () => state, getActions: () => actions };
}

describe('pet-core service', () => {
  it('bootstraps a v2 companion state when requested', async () => {
    const { repository } = createInMemoryRepository();
    const service = createPetCoreService(repository);

    const state = await service.getCompanionStateV2({ bootstrap: true });

    expect(state).not.toBeNull();
    expect(state?.version).toBe('v2');
    expect(state?.snapshot.profile.petName).toBe('Mochi');
    expect(state?.companion.loopMode).toBe('Pet core companion');
  });

  it('records pet actions and advances the stored state independently of memory tables', async () => {
    const { repository, getState, getActions } = createInMemoryRepository();
    const service = createPetCoreService(repository);

    const result = await service.recordAction({ action: 'feed', note: 'late snack' });

    expect(result.action.action).toBe('feed');
    expect(result.state.version).toBe('v2');
    expect(result.state.snapshot.progress.stage).not.toBe('');
    expect(result.state.companion.recentInteractions[0]?.kind).toBe('feed');
    expect(getActions()).toHaveLength(1);
    expect(getState()?.state_metadata.action_count).toBe(1);
  });

  it('returns null for the legacy companion state path until pet-core data exists', async () => {
    const { repository } = createInMemoryRepository();
    const service = createPetCoreService(repository);

    const state = await service.getCompanionState();

    expect(state).toBeNull();
  });
});
