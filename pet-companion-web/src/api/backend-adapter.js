import { createLocalPetAdapter } from './local-adapter.js';

async function getFallbackState(fallback) {
  try {
    return await fallback.getCompanionState();
  } catch {
    return createLocalPetAdapter().getCompanionState();
  }
}

function buildDegradedState(fallbackState, { reason, endpoint, legacyEndpoint }) {
  const normalizedReason = String(reason || 'backend_unavailable').trim() || 'backend_unavailable';
  const attemptedEndpoints = [endpoint, legacyEndpoint].filter(Boolean);

  return {
    ...fallbackState,
    loopMode: 'Degraded local fallback',
    adapterLabel: 'Local fallback (backend unavailable)',
    loopHint:
      'Backend companion state is unavailable. This labeled fallback keeps the surface explorable, but it is not live backend data.',
    recentSignals: [
      `Backend sync failed: ${normalizedReason}.`,
      'Retry after the companion backend recovers to restore live state.',
      ...(Array.isArray(fallbackState?.recentSignals) ? fallbackState.recentSignals : []),
    ],
    recentInteractions: [
      {
        kind: 'fallback',
        title: 'Fallback mode active',
        detail: `The backend companion state could not be loaded from ${attemptedEndpoints.join(' -> ') || endpoint}. Showing local fallback data instead.`,
        timestamp: new Date().toISOString(),
        source: 'Backend degraded',
      },
      ...(Array.isArray(fallbackState?.recentInteractions) ? fallbackState.recentInteractions : []).map((entry) => ({
        ...entry,
        source: `${entry?.source || 'Local Stub'} · local fallback`,
      })),
    ],
    degraded: true,
    dataSource: 'local-fallback',
    backendStatus: {
      degraded: true,
      source: 'backend',
      reason: normalizedReason,
      endpoint,
      legacyEndpoint: legacyEndpoint || null,
      retryable: true,
    },
  };
}

export function createBackendPetAdapter({
  endpoint = '/companion/state-v2',
  legacyEndpoint = '/companion/state',
  actionEndpoint = '/companion/actions',
  fetchImpl = globalThis.fetch?.bind(globalThis),
  fallback = createLocalPetAdapter(),
} = {}) {
  return {
    async getCompanionState() {
      if (typeof fetchImpl !== 'function') {
        return fallback.getCompanionState();
      }

      let attemptedLegacyEndpoint = false;

      try {
        const response = await fetchImpl(endpoint, {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!response.ok && legacyEndpoint) {
          attemptedLegacyEndpoint = true;
          const legacyResponse = await fetchImpl(legacyEndpoint, {
            headers: {
              Accept: 'application/json',
            },
          });
          if (!legacyResponse.ok) {
            throw new Error(`companion_state_${legacyResponse.status}`);
          }
          const legacyData = await legacyResponse.json();
          if (!legacyData || typeof legacyData !== 'object') {
            throw new Error('companion_state_invalid');
          }
          return legacyData;
        }
        if (!response.ok) {
          throw new Error(`companion_state_${response.status}`);
        }
        const data = await response.json();
        if (!data || typeof data !== 'object') {
          throw new Error('companion_state_invalid');
        }
        return data;
      } catch (error) {
        const fallbackState = await getFallbackState(fallback);
        return buildDegradedState(fallbackState, {
          reason: error instanceof Error ? error.message : 'backend_unavailable',
          endpoint,
          legacyEndpoint: attemptedLegacyEndpoint ? legacyEndpoint : null,
        });
      }
    },

    async performAction(action, note) {
      if (typeof fetchImpl !== 'function') {
        return { ok: false, fallback: true };
      }

      const response = await fetchImpl(actionEndpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, note }),
      });

      if (!response.ok) {
        throw new Error(`companion_action_${response.status}`);
      }

      return response.json();
    },
  };
}
