import type { PetAction, PetState, PrismaClient } from '@prisma/client';

import { getPrisma } from '../../../lib/prisma.js';
import type {
  CreatePetActionInput,
  PetActionRecord,
  PetCoreRepository,
  PetStateRecord,
  StoredPetNeed,
  StoredPetSignal,
  UpsertPetStateInput,
} from '../../../app/pet-core/types.js';

type PetCorePrismaClient = Pick<PrismaClient, 'petAction' | 'petState'>;

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function mapPetState(record: PetState): PetStateRecord {
  return {
    id: record.id,
    profile_key: record.profile_key,
    pet_name: record.pet_name,
    species: record.species,
    archetype: record.archetype,
    mood_label: record.mood_label,
    mood_note: record.mood_note,
    relationship_level: record.relationship_level,
    relationship_note: record.relationship_note,
    progress_stage: record.progress_stage,
    progress_label: record.progress_label,
    next_milestone: record.next_milestone,
    last_check_in_at: record.last_check_in_at,
    needs: parseJson<StoredPetNeed[]>(record.needs_json, []),
    proactive_signals: parseJson<StoredPetSignal[]>(record.proactive_signals_json, []),
    state_metadata: parseJson<Record<string, unknown>>(record.state_metadata, {}),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapPetAction(record: PetAction): PetActionRecord {
  return {
    id: record.id,
    profile_key: record.profile_key,
    action: record.action as PetActionRecord['action'],
    note: record.note,
    event_detail: record.event_detail,
    state_metadata: parseJson<Record<string, unknown>>(record.state_metadata, {}),
    created_at: record.created_at,
    pet_state_id: record.pet_state_id,
  };
}

export function createPetCoreRepository(
  prisma: PetCorePrismaClient = getPrisma() as PetCorePrismaClient,
): PetCoreRepository {
  return {
    async getState(profileKey = 'default') {
      const result = await prisma.petState.findUnique({
        where: { profile_key: profileKey },
      });
      return result ? mapPetState(result) : null;
    },

    async upsertState(input: UpsertPetStateInput) {
      const result = await prisma.petState.upsert({
        where: { profile_key: input.profile_key },
        update: {
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
          needs_json: JSON.stringify(input.needs),
          proactive_signals_json: JSON.stringify(input.proactive_signals),
          state_metadata: JSON.stringify(input.state_metadata),
          updated_at: new Date(),
        },
        create: {
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
          needs_json: JSON.stringify(input.needs),
          proactive_signals_json: JSON.stringify(input.proactive_signals),
          state_metadata: JSON.stringify(input.state_metadata),
        },
      });

      return mapPetState(result);
    },

    async listRecentActions(profileKey = 'default', limit = 6) {
      const results = await prisma.petAction.findMany({
        where: { profile_key: profileKey },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: limit,
      });
      return results.map(mapPetAction);
    },

    async createAction(input: CreatePetActionInput) {
      const result = await prisma.petAction.create({
        data: {
          profile_key: input.profile_key ?? 'default',
          pet_state_id: input.pet_state_id ?? null,
          action: input.action,
          note: input.note ?? null,
          event_detail: input.event_detail,
          state_metadata: JSON.stringify(input.state_metadata ?? {}),
        },
      });
      return mapPetAction(result);
    },
  };
}
