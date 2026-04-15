export const PET_ACTION_NAMES = ['pat', 'feed', 'wake'] as const;

export type PetActionName = (typeof PET_ACTION_NAMES)[number];
export type CompanionInteractionKind = PetActionName | 'signal' | 'fallback';

export type CompanionInteraction = {
  kind: CompanionInteractionKind;
  title: string;
  detail: string;
  timestamp: string;
  source: string;
};

export type PetNeedSnapshot = {
  key: string;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'steady';
};

export type PetRelationshipState = {
  level: string;
  note: string;
};

export type PetProgressState = {
  stage: string;
  progressLabel: string;
  nextMilestone?: string | null;
};

export type PetProfile = {
  petName: string;
  species?: string | null;
  archetype?: string | null;
};

export type PetProactiveSignal = {
  key: string;
  label: string;
  detail: string;
  dueAt?: string | null;
};

export type PetCoreStateSnapshot = {
  profile: PetProfile;
  relationship: PetRelationshipState;
  progress: PetProgressState;
  needs: PetNeedSnapshot[];
  proactiveSignals: PetProactiveSignal[];
};

export type CompanionState = {
  petName: string;
  statusLine: string;
  loopMode: string;
  lastCheckIn: string;
  adapterLabel: string;
  loopHint: string;
  mood: {
    label: string;
    note: string;
  };
  memoryTitle: string;
  memorySummary: string;
  vitals: Array<{ label: string; value: string }>;
  recentSignals: string[];
  recentInteractions: CompanionInteraction[];
};

export type CompanionStateV2 = {
  version: 'v2';
  snapshot: PetCoreStateSnapshot;
  companion: CompanionState;
};

export type CompanionActionEnvelope = {
  action: PetActionName;
  note?: string;
  source?: string;
};

export function isPetActionName(value: string): value is PetActionName {
  return PET_ACTION_NAMES.includes(value as PetActionName);
}
