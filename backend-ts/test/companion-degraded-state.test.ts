import { describe, expect, it } from 'vitest';

import { buildDegradedCompanionState } from '../src/main.js';

describe('companion degraded runtime state', () => {
  it('uses degraded runtime wording instead of prototype or fallback delivery wording', () => {
    const state = buildDegradedCompanionState('sqlite_busy');

    expect(state.statusLine).toBe('Companion runtime is degraded and waiting for the next backend sync.');
    expect(state.loopMode).toBe('Backend companion degraded');
    expect(state.adapterLabel).toBe('Backend degraded runtime');
    expect(state.loopHint).toBe(
      'The backend companion endpoint is serving a degraded runtime view until persisted signals recover.',
    );
    expect(state.memorySummary).toBe('Persisted companion memory is temporarily unavailable.');
    expect(state.vitals).toContainEqual({ label: 'Mode', value: 'Degraded' });
    expect(state.recentSignals).toEqual(['Companion state is serving a degraded backend view.']);
    expect(state.recentInteractions).toEqual([
      {
        kind: 'signal',
        title: 'Runtime degraded',
        detail: 'Companion endpoint degraded gracefully: sqlite_busy.',
        timestamp: 'Pending',
        source: 'Backend degraded',
      },
    ]);

    expect(JSON.stringify(state).toLowerCase()).not.toContain('prototype');
    expect(JSON.stringify(state).toLowerCase()).not.toContain('fallback');
  });
});
