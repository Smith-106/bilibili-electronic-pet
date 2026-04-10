import { createLocalPetAdapter } from './local-adapter.js';

export function createBackendPetAdapter({
  endpoint = '/companion/state',
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
  };
}
