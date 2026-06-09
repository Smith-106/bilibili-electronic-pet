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
    loopMode: 'Degraded backend snapshot',
    adapterLabel: 'Degraded backend snapshot',
    loopHint:
      'Backend companion state is unavailable. This labeled degraded snapshot keeps the surface explorable, but it is not live backend data.',
    recentSignals: [
      `Backend sync failed: ${normalizedReason}.`,
      'Retry after the companion backend recovers to restore live state.',
      ...(Array.isArray(fallbackState?.recentSignals) ? fallbackState.recentSignals : []),
    ],
    recentInteractions: [
      {
        kind: 'fallback',
        title: 'Degraded backend snapshot',
        detail: `The backend companion state could not be loaded from ${attemptedEndpoints.join(' -> ') || endpoint}. Showing a degraded backend snapshot instead.`,
        timestamp: new Date().toISOString(),
        source: 'Backend degraded',
      },
      ...(Array.isArray(fallbackState?.recentInteractions) ? fallbackState.recentInteractions : []).map((entry) => ({
        ...entry,
        source: `${entry?.source || 'Seed state adapter'} · degraded snapshot`,
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

function readStoredCredential(key) {
  try {
    return globalThis.sessionStorage?.getItem(key)?.trim() || '';
  } catch {
    return '';
  }
}

function resolveAdminSessionToken() {
  return String(globalThis.__ADMIN_SESSION_TOKEN__ || readStoredCredential('admin_session_token')).trim();
}

function resolveAdminApiKey() {
  return String(globalThis.__ADMIN_API_KEY__ || readStoredCredential('admin_api_key')).trim();
}

function buildActionHeaders() {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const sessionToken = resolveAdminSessionToken();
  const apiKey = resolveAdminApiKey();
  if (sessionToken) {
    headers['x-admin-session'] = sessionToken;
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
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
        headers: buildActionHeaders(),
        body: JSON.stringify({ action, note }),
      });

      if (!response.ok) {
        throw new Error(`companion_action_${response.status}`);
      }

      return response.json();
    },
  };
}
