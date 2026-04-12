import { createLocalPetAdapter } from './local-adapter.js';

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

      try {
        const response = await fetchImpl(endpoint, {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!response.ok && legacyEndpoint) {
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
      } catch {
        return fallback.getCompanionState();
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
