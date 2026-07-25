import { createMemoryService } from '../../app/memory/index.js';
import { COMPANION_SYSTEM_SPACE_KEY, upsertCompanionFeedItem } from '../../app/memory/companion-feed.js';
import { createPetCoreService } from '../../app/pet-core/index.js';
import type { CompanionInteraction, CompanionState, CompanionStateV2 } from '../contracts.js';
import { buildCompanionInteraction, normalizeIsoTimestamp } from '../normalizers.js';
import type { PetActionName } from '../pet-contracts.js';

export function buildDegradedCompanionState(reason?: string): CompanionState {
  return {
    petName: 'Mochi',
    statusLine: 'Companion runtime is degraded and waiting for the next backend sync.',
    loopMode: 'Backend companion degraded',
    lastCheckIn: 'Pending',
    adapterLabel: 'Backend degraded runtime',
    loopHint: 'The backend companion endpoint is serving a degraded runtime view until persisted signals recover.',
    mood: {
      label: 'Curious',
      note: reason
        ? `Companion endpoint degraded gracefully: ${reason}.`
        : 'Waiting for the next backend companion update.',
    },
    memoryTitle: 'Short-term memory',
    memorySummary: 'Persisted companion memory is temporarily unavailable.',
    vitals: [
      { label: 'Spaces', value: '0' },
      { label: 'Grants', value: '0' },
      { label: 'Links', value: '0' },
      { label: 'Mode', value: 'Degraded' },
    ],
    recentSignals: ['Companion state is serving a degraded backend view.'],
    recentInteractions: [
      {
        kind: 'signal',
        title: 'Runtime degraded',
        detail: reason
          ? `Companion endpoint degraded gracefully: ${reason}.`
          : 'Companion state is serving a degraded backend view.',
        timestamp: 'Pending',
        source: 'Backend degraded',
      },
    ],
  };
}

async function defaultGetCompanionState(): Promise<CompanionState> {
  try {
    const petCoreService = createPetCoreService();
    const petCoreState = await petCoreService.getCompanionState();
    if (petCoreState) {
      return petCoreState;
    }
  } catch {
    // Fall through to the legacy memory-derived projection until pet-core persistence is available.
  }

  try {
    const service = createMemoryService();
    const [spaces, items, grants, links] = await Promise.all([
      service.listSpaces(),
      service.listItems(),
      service.listGrants(),
      service.listIdentityLinks(),
    ]);

    const latestTimestamp = [spaces, items, grants, links]
      .flat()
      .map((item) => item.updated_at)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const companionSpace = spaces.find((space) => space.space_key === COMPANION_SYSTEM_SPACE_KEY);
    const companionItems = companionSpace ? items.filter((item) => item.space_id === companionSpace.id) : [];
    const timelineSourceItems = companionItems.filter((item) => item.item_metadata?.entry_mode !== 'latest');
    const recentSpaceTitles = spaces
      .slice(0, 3)
      .map((space) => space.title)
      .filter(Boolean);
    // BUG-002 (security/data-leak): GET /companion/state is intentionally unauthenticated (it
    // feeds the frontend companion surface), so it MUST NOT surface user-identifying PII.
    // external_id (e.g. Bilibili mid) from identity links and raw memory-item content are
    // PII — replace them with aggregate counts only. Pet interaction narrative
    // (recentCompanionItems via buildCompanionInteraction) is curated content, not PII.
    const identityLinkCount = links.length;
    const recentItemCount = items.length;
    const recentCompanionItems = (timelineSourceItems.length > 0 ? timelineSourceItems : companionItems).slice(0, 4);
    const recentCompanionSummaries = recentCompanionItems.map((item) => {
      const interaction = buildCompanionInteraction(item);
      return `${interaction.title}: ${interaction.detail.slice(0, 48)}`;
    });
    const hasMemory = spaces.length > 0 || items.length > 0 || grants.length > 0 || links.length > 0;
    const recentInteractions: CompanionInteraction[] =
      recentCompanionItems.length > 0
        ? recentCompanionItems.map((item) => buildCompanionInteraction(item))
        : [
            {
              kind: 'signal',
              title: hasMemory ? 'Companion feed pending' : 'No companion interactions yet',
              detail: hasMemory
                ? 'Persisted memory exists, but no companion-specific feed items have been written yet.'
                : 'Trigger a companion action or write a feed signal to populate this timeline.',
              timestamp: latestTimestamp ? normalizeIsoTimestamp(latestTimestamp) : 'Pending',
              source: 'Memory',
            },
          ];

    return {
      petName: 'Mochi',
      statusLine: hasMemory
        ? `Tracking ${spaces.length} spaces, ${items.length} items, ${grants.length} grants, and ${links.length} linked identities.`
        : 'Waiting for the first persisted companion memory signal.',
      loopMode: 'Backend memory companion',
      lastCheckIn: latestTimestamp ? normalizeIsoTimestamp(latestTimestamp) : 'Pending',
      adapterLabel: 'Backend memory endpoint',
      loopHint: hasMemory
        ? 'This companion state is synthesized from the backend memory management surfaces.'
        : 'Create spaces, grants, or identity links in the admin memory page to enrich this view.',
      mood: {
        label: hasMemory ? 'Attentive' : 'Settling',
        note: hasMemory
          ? 'The companion is reading persisted management data and reflecting the latest memory signals.'
          : 'No persisted memory records exist yet, so the companion stays in a low-signal state.',
      },
      memoryTitle: hasMemory ? 'Persisted memory summary' : 'Memory bootstrap',
      memorySummary:
        recentCompanionSummaries.length > 0
          ? recentCompanionSummaries.join(' | ')
          : items.length > 0
            ? `${recentItemCount} persisted memory item${recentItemCount === 1 ? '' : 's'}.`
            : hasMemory
              ? `Known spaces: ${recentSpaceTitles.join(', ') || 'untitled'}.`
              : 'Persisted memory has not been populated yet.',
      vitals: [
        { label: 'Spaces', value: String(spaces.length) },
        { label: 'Items', value: String(items.length) },
        { label: 'Grants', value: String(grants.length) },
        { label: 'Links', value: String(links.length) },
        { label: 'Feed', value: companionItems.length > 0 ? `${companionItems.length} signals` : 'Quiet' },
        { label: 'Focus', value: items.length > 0 ? 'Active memory' : hasMemory ? 'Persisted' : 'Bootstrap' },
      ],
      recentSignals: [
        hasMemory
          ? 'Latest signal timestamps are sourced from persisted memory updates.'
          : 'No memory signals available yet.',
        recentCompanionSummaries.length > 0
          ? `Recent companion feed: ${recentCompanionSummaries.join(' | ')}`
          : 'No companion feed items yet.',
        recentItemCount > 0
          ? `${recentItemCount} persisted memory item${recentItemCount === 1 ? '' : 's'}.`
          : 'No recent items.',
        recentSpaceTitles.length > 0 ? `Recent spaces: ${recentSpaceTitles.join(', ')}` : 'No recent spaces.',
        identityLinkCount > 0
          ? `${identityLinkCount} linked identit${identityLinkCount === 1 ? 'y' : 'ies'}.`
          : 'No linked identities.',
      ],
      recentInteractions,
    };
  } catch (error) {
    return buildDegradedCompanionState(error instanceof Error ? error.message : 'unknown_backend_error');
  }
}

export function buildCompanionStateV2FromLegacy(companion: CompanionState): CompanionStateV2 {
  return {
    version: 'v2',
    snapshot: {
      profile: {
        petName: companion.petName,
      },
      relationship: {
        level: companion.mood.label,
        note: companion.mood.note,
      },
      progress: {
        stage: companion.loopMode,
        progressLabel: companion.statusLine,
        nextMilestone: null,
      },
      needs: companion.vitals.map((entry) => ({
        key: entry.label.trim().toLowerCase().replace(/\s+/g, '-'),
        label: entry.label,
        value: entry.value,
      })),
      proactiveSignals: companion.recentSignals.slice(0, 3).map((detail, index) => ({
        key: `legacy-signal-${index + 1}`,
        label: 'Legacy signal',
        detail,
        dueAt: null,
      })),
    },
    companion,
  };
}

async function defaultGetCompanionStateV2(): Promise<CompanionStateV2> {
  try {
    const petCoreService = createPetCoreService();
    const state = await petCoreService.getCompanionStateV2({ bootstrap: true });
    if (state) {
      return state;
    }
  } catch {
    // Fall back to the legacy companion response shape wrapped in a v2 envelope.
  }

  const companion = await defaultGetCompanionState();
  return buildCompanionStateV2FromLegacy(companion);
}

async function defaultRecordCompanionAction(input: {
  action: PetActionName;
  note?: string;
}): Promise<{ ok: boolean; action: string; item_key: string }> {
  const actionMessages: Record<PetActionName, string> = {
    pat: 'A gentle pat settled Mochi and raised the bond signal.',
    feed: 'A quick snack topped up Mochi and eased the hunger signal.',
    wake: 'A bright nudge woke Mochi up for the next interaction window.',
  };

  const actionAt = new Date();
  const latestItemKey = `action:${input.action}-latest`;
  const historyItemKey = `action:${input.action}:${actionAt.toISOString()}`;
  const content = input.note ? `${actionMessages[input.action]} Note: ${input.note}` : actionMessages[input.action];
  const metadata = {
    action: input.action,
    note: input.note ?? null,
    action_at: actionAt.toISOString(),
  };
  const service = createMemoryService();

  await Promise.all([
    upsertCompanionFeedItem(
      {
        itemKey: latestItemKey,
        content,
        source: 'companion_action',
        metadata: {
          ...metadata,
          entry_mode: 'latest',
        },
      },
      service,
    ),
    upsertCompanionFeedItem(
      {
        itemKey: historyItemKey,
        content,
        contentType: 'companion_event',
        source: 'companion_action',
        metadata: {
          ...metadata,
          entry_mode: 'history',
        },
      },
      service,
    ),
  ]);

  try {
    const petCoreService = createPetCoreService();
    await petCoreService.recordAction(input);
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'pet_core_action_persist_failed',
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return {
    ok: true,
    action: input.action,
    item_key: latestItemKey,
  };
}

export { defaultGetCompanionState, defaultGetCompanionStateV2, defaultRecordCompanionAction };
