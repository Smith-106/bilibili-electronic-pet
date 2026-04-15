import type { CompanionState, CompanionStateV2, PetActionName } from '../../server/contracts.js';

export type StoredPetNeed = {
  key: string;
  label: string;
  score: number;
  trend?: 'up' | 'down' | 'steady';
};

export type StoredPetSignal = {
  key: string;
  label: string;
  detail: string;
  dueAt?: string | null;
};

export type PetStateRecord = {
  id: number;
  profile_key: string;
  pet_name: string;
  species: string | null;
  archetype: string | null;
  mood_label: string;
  mood_note: string;
  relationship_level: string;
  relationship_note: string;
  progress_stage: string;
  progress_label: string;
  next_milestone: string | null;
  last_check_in_at: Date | null;
  needs: StoredPetNeed[];
  proactive_signals: StoredPetSignal[];
  state_metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type PetActionRecord = {
  id: number;
  profile_key: string;
  action: PetActionName;
  note: string | null;
  event_detail: string;
  state_metadata: Record<string, unknown>;
  created_at: Date;
  pet_state_id: number | null;
};

export type UpsertPetStateInput = Omit<PetStateRecord, 'id' | 'created_at' | 'updated_at'>;

export type CreatePetActionInput = {
  profile_key?: string;
  pet_state_id?: number | null;
  action: PetActionName;
  note?: string | null;
  event_detail: string;
  state_metadata?: Record<string, unknown>;
};

export type PetCoreRepository = {
  getState(profileKey?: string): Promise<PetStateRecord | null>;
  upsertState(input: UpsertPetStateInput): Promise<PetStateRecord>;
  listRecentActions(profileKey?: string, limit?: number): Promise<PetActionRecord[]>;
  createAction(input: CreatePetActionInput): Promise<PetActionRecord>;
};

export type PetCoreService = {
  getCompanionState(): Promise<CompanionState | null>;
  getCompanionStateV2(options?: { bootstrap?: boolean }): Promise<CompanionStateV2 | null>;
  recordAction(input: { action: PetActionName; note?: string | null }): Promise<{
    state: CompanionStateV2;
    action: PetActionRecord;
  }>;
};
