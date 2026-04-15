import type { CompanionInteraction, CompanionState, CompanionStateV2, PetActionName } from '../../server/contracts.js';
import { createPetCoreRepository } from '../../infra/db/repositories/pet-core-repository.js';
import type {
  PetActionRecord,
  PetCoreRepository,
  PetCoreService,
  PetStateRecord,
  StoredPetNeed,
  StoredPetSignal,
  UpsertPetStateInput,
} from './types.js';

const DEFAULT_PROFILE_KEY = 'default';

const DEFAULT_NEEDS: StoredPetNeed[] = [
  { key: 'energy', label: 'Energy', score: 76, trend: 'steady' },
  { key: 'satiety', label: 'Satiety', score: 61, trend: 'steady' },
  { key: 'bond', label: 'Bond', score: 34, trend: 'steady' },
  { key: 'focus', label: 'Focus', score: 58, trend: 'steady' },
];

function cloneNeeds(needs: StoredPetNeed[]): StoredPetNeed[] {
  return needs.map((entry) => ({ ...entry }));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function findNeed(needs: StoredPetNeed[], key: string): StoredPetNeed {
  const existing = needs.find((entry) => entry.key === key);
  if (existing) return existing;
  const created = { key, label: key, score: 50, trend: 'steady' as const };
  needs.push(created);
  return created;
}

function describeRelationship(score: number): { level: string; note: string } {
  if (score >= 75) {
    return { level: 'Bonded', note: 'The companion trusts the routine and responds quickly to care.' };
  }
  if (score >= 45) {
    return { level: 'Growing', note: 'The relationship is strengthening through repeated care loops.' };
  }
  return { level: 'Settling', note: 'The companion still needs more regular interaction to feel stable.' };
}

function describeProgress(actionCount: number, bondScore: number): { stage: string; label: string; nextMilestone: string | null } {
  if (actionCount >= 12 || bondScore >= 80) {
    return { stage: 'bonded', label: 'Bonded loop', nextMilestone: 'Cross-platform social scenes' };
  }
  if (actionCount >= 5 || bondScore >= 50) {
    return { stage: 'settling', label: 'Settling loop', nextMilestone: 'Proactive daily rituals' };
  }
  return { stage: 'starter', label: 'Starter loop', nextMilestone: 'Stable care rhythm' };
}

function buildSignals(needs: StoredPetNeed[]): StoredPetSignal[] {
  const signals: StoredPetSignal[] = [];

  const energy = findNeed(needs, 'energy').score;
  const satiety = findNeed(needs, 'satiety').score;
  const bond = findNeed(needs, 'bond').score;
  const focus = findNeed(needs, 'focus').score;

  if (energy < 45) {
    signals.push({
      key: 'energy-recharge',
      label: 'Recharge window',
      detail: 'Energy is dipping. The next interaction should favor a lighter pace or a wake cycle.',
      dueAt: null,
    });
  }
  if (satiety < 45) {
    signals.push({
      key: 'snack-reminder',
      label: 'Snack reminder',
      detail: 'Satiety is low. A feed action should restore the companion loop.',
      dueAt: null,
    });
  }
  if (bond < 45) {
    signals.push({
      key: 'bond-prompt',
      label: 'Bond prompt',
      detail: 'The companion still benefits from short reassurance actions and follow-up notes.',
      dueAt: null,
    });
  }
  if (focus < 45) {
    signals.push({
      key: 'focus-reset',
      label: 'Focus reset',
      detail: 'Attention is drifting. A wake interaction can reset the next response window.',
      dueAt: null,
    });
  }

  if (!signals.length) {
    signals.push({
      key: 'steady-loop',
      label: 'Steady loop',
      detail: 'Core needs are stable. The next proactive nudge can stay lightweight and companion-first.',
      dueAt: null,
    });
  }

  return signals;
}

function defaultStateInput(): UpsertPetStateInput {
  const relationship = describeRelationship(findNeed(cloneNeeds(DEFAULT_NEEDS), 'bond').score);
  const progress = describeProgress(0, findNeed(cloneNeeds(DEFAULT_NEEDS), 'bond').score);

  return {
    profile_key: DEFAULT_PROFILE_KEY,
    pet_name: 'Mochi',
    species: 'browser-companion',
    archetype: 'gentle-helper',
    mood_label: 'Curious',
    mood_note: 'Settling into the next interaction loop.',
    relationship_level: relationship.level,
    relationship_note: relationship.note,
    progress_stage: progress.stage,
    progress_label: progress.label,
    next_milestone: progress.nextMilestone,
    last_check_in_at: null,
    needs: cloneNeeds(DEFAULT_NEEDS),
    proactive_signals: buildSignals(cloneNeeds(DEFAULT_NEEDS)),
    state_metadata: {
      bootstrap_source: 'pet-core-default',
    },
  };
}

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function buildInteraction(record: PetActionRecord): CompanionInteraction {
  return {
    kind: record.action,
    title: `${titleCase(record.action)} interaction`,
    detail: record.event_detail,
    timestamp: record.created_at.toISOString(),
    source: 'Pet Core',
  };
}

function toCompanionState(state: PetStateRecord, actions: PetActionRecord[]): CompanionState {
  const needs = state.needs.length ? state.needs : cloneNeeds(DEFAULT_NEEDS);
  const signals = state.proactive_signals.length ? state.proactive_signals : buildSignals(cloneNeeds(needs));
  const latestAction = actions[0];

  return {
    petName: state.pet_name,
    statusLine: latestAction
      ? `${state.pet_name} is carrying forward the ${state.progress_label.toLowerCase()} after the latest ${latestAction.action} action.`
      : `${state.pet_name} is waiting for the first pet-core interaction to shape the loop.`,
    loopMode: 'Pet core companion',
    lastCheckIn: (state.last_check_in_at ?? latestAction?.created_at)?.toISOString?.() ?? 'Pending',
    adapterLabel: 'Pet core endpoint',
    loopHint: 'This companion state is backed by dedicated pet-core persistence and action history.',
    mood: {
      label: state.mood_label,
      note: state.mood_note,
    },
    memoryTitle: `${state.progress_label} summary`,
    memorySummary: `${state.relationship_note}${state.next_milestone ? ` Next milestone: ${state.next_milestone}.` : ''}`,
    vitals: [
      ...needs.map((entry) => ({ label: entry.label, value: `${entry.score}%` })),
      { label: 'Stage', value: state.progress_label },
    ],
    recentSignals: signals.map((entry) => entry.detail),
    recentInteractions: actions.length
      ? actions.map((entry) => buildInteraction(entry))
      : [
          {
            kind: 'signal',
            title: 'Pet core bootstrap',
            detail: 'Pet-core persistence is ready, but no interaction has been recorded yet.',
            timestamp: 'Pending',
            source: 'Pet Core',
          },
        ],
  };
}

function toCompanionStateV2(state: PetStateRecord, actions: PetActionRecord[]): CompanionStateV2 {
  return {
    version: 'v2',
    snapshot: {
      profile: {
        petName: state.pet_name,
        species: state.species,
        archetype: state.archetype,
      },
      relationship: {
        level: state.relationship_level,
        note: state.relationship_note,
      },
      progress: {
        stage: state.progress_stage,
        progressLabel: state.progress_label,
        nextMilestone: state.next_milestone,
      },
      needs: state.needs.map((entry) => ({
        key: entry.key,
        label: entry.label,
        value: `${entry.score}%`,
        trend: entry.trend,
      })),
      proactiveSignals: state.proactive_signals.map((entry) => ({
        key: entry.key,
        label: entry.label,
        detail: entry.detail,
        dueAt: entry.dueAt ?? null,
      })),
    },
    companion: toCompanionState(state, actions),
  };
}

function applyAction(state: PetStateRecord, action: PetActionName, note?: string | null): { nextState: UpsertPetStateInput; detail: string } {
  const needs = cloneNeeds(state.needs.length ? state.needs : DEFAULT_NEEDS);

  const energy = findNeed(needs, 'energy');
  const satiety = findNeed(needs, 'satiety');
  const bond = findNeed(needs, 'bond');
  const focus = findNeed(needs, 'focus');

  if (action === 'pat') {
    bond.score = clampScore(bond.score + 8);
    focus.score = clampScore(focus.score + 3);
    bond.trend = 'up';
    focus.trend = 'up';
  } else if (action === 'feed') {
    satiety.score = clampScore(satiety.score + 16);
    energy.score = clampScore(energy.score + 5);
    satiety.trend = 'up';
    energy.trend = 'up';
  } else if (action === 'wake') {
    focus.score = clampScore(focus.score + 12);
    energy.score = clampScore(energy.score + 7);
    focus.trend = 'up';
    energy.trend = 'up';
  }

  const relationship = describeRelationship(bond.score);
  const progress = describeProgress(Number(state.state_metadata.action_count ?? 0) + 1, bond.score);
  const moodLabel = action === 'feed' ? 'Brightened' : action === 'wake' ? 'Alert' : 'Comforted';
  const moodNote = note
    ? `${titleCase(action)} recorded with note: ${note}`
    : `${titleCase(action)} strengthened the ${progress.label.toLowerCase()}.`;
  const proactiveSignals = buildSignals(needs);
  const detail = note
    ? `${titleCase(action)} interaction recorded. ${note}`
    : `${titleCase(action)} interaction recorded and pet-core state advanced.`;

  return {
    nextState: {
      profile_key: state.profile_key,
      pet_name: state.pet_name,
      species: state.species,
      archetype: state.archetype,
      mood_label: moodLabel,
      mood_note: moodNote,
      relationship_level: relationship.level,
      relationship_note: relationship.note,
      progress_stage: progress.stage,
      progress_label: progress.label,
      next_milestone: progress.nextMilestone,
      last_check_in_at: new Date(),
      needs,
      proactive_signals: proactiveSignals,
      state_metadata: {
        ...state.state_metadata,
        action_count: Number(state.state_metadata.action_count ?? 0) + 1,
        last_action: action,
      },
    },
    detail,
  };
}

export function createPetCoreService(repository: PetCoreRepository = createPetCoreRepository()): PetCoreService {
  return {
    async getCompanionState() {
      const state = await repository.getState(DEFAULT_PROFILE_KEY);
      if (!state) return null;
      const actions = await repository.listRecentActions(DEFAULT_PROFILE_KEY, 6);
      return toCompanionState(state, actions);
    },

    async getCompanionStateV2(options = {}) {
      let state = await repository.getState(DEFAULT_PROFILE_KEY);
      if (!state && options.bootstrap) {
        state = await repository.upsertState(defaultStateInput());
      }
      if (!state) return null;
      const actions = await repository.listRecentActions(DEFAULT_PROFILE_KEY, 6);
      return toCompanionStateV2(state, actions);
    },

    async recordAction(input) {
      const current = (await repository.getState(DEFAULT_PROFILE_KEY)) ?? (await repository.upsertState(defaultStateInput()));
      const { nextState, detail } = applyAction(current, input.action, input.note ?? null);
      const persisted = await repository.upsertState(nextState);
      const action = await repository.createAction({
        profile_key: persisted.profile_key,
        pet_state_id: persisted.id,
        action: input.action,
        note: input.note ?? null,
        event_detail: detail,
        state_metadata: {
          progress_stage: persisted.progress_stage,
          relationship_level: persisted.relationship_level,
        },
      });
      const actions = await repository.listRecentActions(DEFAULT_PROFILE_KEY, 6);
      return {
        state: toCompanionStateV2(persisted, actions.length ? actions : [action]),
        action,
      };
    },
  };
}
