/**
 * State normalization for the pet companion surface.
 * Extracted from app.js (pure extraction, no behavior change).
 */

import {
  ACTION_INTERACTION_KINDS,
  FALLBACK_INTERACTIONS,
  getInteractionKindLabel,
  inferInteractionKind,
  normalizeInteractionKind,
} from './interaction.js';

export const FALLBACK_VITALS = [
  { label: 'Energy', value: 'Unknown' },
  { label: 'Hunger', value: 'Unknown' },
  { label: 'Bond', value: 'Unknown' },
];

export const FALLBACK_SIGNALS = ['Local companion loop has not reported any recent signals yet.'];

export function normalizeBackendStatus(rootState, safeState) {
  const rootStatus =
    rootState.backendStatus && typeof rootState.backendStatus === 'object' ? rootState.backendStatus : {};
  const stateStatus =
    safeState.backendStatus && typeof safeState.backendStatus === 'object' ? safeState.backendStatus : {};

  return {
    degraded: Boolean(rootStatus.degraded || stateStatus.degraded || rootState.degraded || safeState.degraded),
    reason: rootStatus.reason || stateStatus.reason || '',
    endpoint: rootStatus.endpoint || stateStatus.endpoint || '',
    legacyEndpoint: rootStatus.legacyEndpoint || stateStatus.legacyEndpoint || '',
    retryable: rootStatus.retryable ?? stateStatus.retryable ?? true,
  };
}

export function normalizeState(state) {
  const rootState = state && typeof state === 'object' ? state : {};
  const safeSnapshot =
    rootState.snapshot && typeof rootState.snapshot === 'object' ? rootState.snapshot : {};
  const safeState =
    rootState.version === 'v2' && rootState.companion && typeof rootState.companion === 'object'
      ? rootState.companion
      : rootState;
  const mood = safeState.mood && typeof safeState.mood === 'object' ? safeState.mood : {};
  const vitals = Array.isArray(safeState.vitals) && safeState.vitals.length ? safeState.vitals : FALLBACK_VITALS;
  const recentSignals =
    Array.isArray(safeState.recentSignals) && safeState.recentSignals.length
      ? safeState.recentSignals
      : FALLBACK_SIGNALS;
  const recentInteractions =
    Array.isArray(safeState.recentInteractions) && safeState.recentInteractions.length
      ? safeState.recentInteractions.map((entry) => ({
          kind: normalizeInteractionKind(entry?.kind || inferInteractionKind(entry)),
          title: entry?.title || 'Companion signal',
          detail: entry?.detail || 'No detail published yet.',
          timestamp: entry?.timestamp || 'Pending',
          source: entry?.source || 'Memory',
        }))
      : FALLBACK_INTERACTIONS;
  const safeProfile =
    safeSnapshot.profile && typeof safeSnapshot.profile === 'object'
      ? safeSnapshot.profile
      : rootState.profile && typeof rootState.profile === 'object'
        ? rootState.profile
        : {};
  const backendStatus = normalizeBackendStatus(rootState, safeState);
  const dataSource =
    (typeof rootState.dataSource === 'string' && rootState.dataSource.trim()) ||
    (typeof safeState.dataSource === 'string' && safeState.dataSource.trim()) ||
    (backendStatus.degraded ? 'local-fallback' : rootState.version === 'v2' ? 'backend-v2' : 'backend');
  const safeRelationship =
    safeSnapshot.relationship && typeof safeSnapshot.relationship === 'object'
      ? safeSnapshot.relationship
      : rootState.relationship && typeof rootState.relationship === 'object'
        ? rootState.relationship
        : {};
  const safeProgress =
    safeSnapshot.progress && typeof safeSnapshot.progress === 'object'
      ? safeSnapshot.progress
      : rootState.progress && typeof rootState.progress === 'object'
        ? rootState.progress
        : {};
  const proactiveSignals =
    Array.isArray(safeSnapshot.proactiveSignals) && safeSnapshot.proactiveSignals.length
      ? safeSnapshot.proactiveSignals.map((entry) => ({
          key: entry?.key || 'signal',
          label: entry?.label || 'Signal',
          detail: entry?.detail || 'No proactive detail published yet.',
          dueAt: entry?.dueAt || null,
        }))
      : Array.isArray(rootState.proactiveSignals) && rootState.proactiveSignals.length
        ? rootState.proactiveSignals.map((entry) => ({
            key: entry?.key || 'signal',
            label: entry?.label || 'Signal',
            detail: entry?.detail || 'No proactive detail published yet.',
            dueAt: entry?.dueAt || null,
          }))
      : [];
  const onboarding =
    safeProgress.stage === 'starter'
      ? {
          title: 'Starter ritual',
          detail:
            'The companion is still in its first pet-core loop. Feed, Pat, and Wake actions now build persistent relationship and progression state.',
        }
      : {
          title: 'Stable ritual',
          detail: 'The companion loop is carrying forward pet-core state instead of relying on temporary seed placeholders.',
        };
  const interactionCount = recentInteractions.length;
  const dominantInteraction =
    recentInteractions.find((entry) => ACTION_INTERACTION_KINDS.includes(entry.kind))?.kind ||
    recentInteractions[0].kind;
  const dominantInteractionLabel = getInteractionKindLabel(dominantInteraction);
  const highlightCards = [
    {
      label: 'Connection',
      value: backendStatus.degraded ? 'Degraded' : 'Live link',
      detail: backendStatus.degraded
        ? 'Running with a labeled degraded backend snapshot.'
        : `Reading ${rootState.version === 'v2' ? 'v2 companion' : 'runtime'} state from the active surface.`,
      tone: backendStatus.degraded ? 'warning' : 'cool',
    },
    {
      label: 'Bond arc',
      value: safeRelationship.level || mood.label || 'Settling',
      detail: safeRelationship.note || mood.note || 'Relationship state has not been published yet.',
      tone: 'warm',
    },
    {
      label: 'Next ritual',
      value: safeProgress.nextMilestone || onboarding.title,
      detail: onboarding.detail,
      tone: 'neutral',
    },
    {
      label: 'Timeline',
      value: `${interactionCount} ${interactionCount === 1 ? 'entry' : 'entries'}`,
      detail: `${dominantInteractionLabel} is the most visible recent interaction lane.`,
      tone: 'cool',
    },
  ];

  return {
    version: rootState.version || 'legacy',
    petName: safeState.petName || 'Companion',
    statusLine: safeState.statusLine || 'Waiting for the first local update.',
    loopMode: safeState.loopMode || 'Companion seed state',
    lastCheckIn: safeState.lastCheckIn || 'Pending',
    adapterLabel: safeState.adapterLabel || 'Seed state adapter',
    loopHint: safeState.loopHint || 'The browser companion can stay expressive while the runtime surface evolves.',
    mood: {
      label: mood.label || 'Settling',
      note: mood.note || 'No mood note has been published yet.',
    },
    memoryTitle: safeState.memoryTitle || 'Memory summary',
    memorySummary:
      safeState.memorySummary || 'No memory summary is available yet. The surface still keeps a readable ritual rhythm.',
    relationship: {
      level: safeRelationship.level || 'Unknown',
      note: safeRelationship.note || 'Relationship state has not been published yet.',
    },
    progress: {
      stage: safeProgress.stage || 'legacy',
      progressLabel: safeProgress.progressLabel || 'Legacy loop',
      nextMilestone: safeProgress.nextMilestone || null,
    },
    profile: {
      species: safeProfile.species || null,
      archetype: safeProfile.archetype || null,
    },
    degraded: backendStatus.degraded,
    dataSource,
    dataSourceLabel: dataSource === 'local-fallback' ? 'Degraded backend snapshot' : dataSource,
    backendStatus,
    retryGuidance: 'Use Refresh mood after the backend companion endpoint recovers.',
    proactiveSignals,
    onboarding,
    vitals,
    recentSignals,
    recentInteractions,
    highlightCards,
  };
}
