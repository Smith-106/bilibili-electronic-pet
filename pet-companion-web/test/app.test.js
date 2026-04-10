import { describe, expect, it, vi } from 'vitest';

import { renderPetCompanion } from '../src/app.js';
import { createPageContainer, flushPromises } from './utils/dom.js';

function createState(overrides = {}) {
  return {
    petName: 'Mochi',
    statusLine: 'Idle on the browser ledge, listening for the next check-in.',
    loopMode: 'Local placeholder loop',
    lastCheckIn: '2026-04-10 03:30',
    adapterLabel: 'Loop stub',
    loopHint: 'Local adapter only.',
    mood: {
      label: 'Curious',
      note: 'Waiting for the next nudge.',
    },
    memoryTitle: 'Memory summary',
    memorySummary: 'Tracks the last milestone so the pet can keep a light sense of continuity.',
    vitals: [
      { label: 'Energy', value: '76%' },
      { label: 'Hunger', value: 'Snack soon' },
      { label: 'Bond', value: 'Growing' },
    ],
    recentSignals: ['Last pat 2 minutes ago.'],
    ...overrides,
  };
}

describe('pet companion surface', () => {
  it('renders an isolated pet surface with mood, state widgets, and memory summary', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };

    await renderPetCompanion(container, { adapter });

    expect(container.querySelector('[data-surface="pet-companion"]')).not.toBeNull();
    expect(container.textContent).toContain('Browser buddy without the admin shell');
    expect(container.textContent).toContain('Curious');
    expect(container.textContent).toContain('Energy');
    expect(container.textContent).toContain('Memory summary');
    expect(container.querySelector('#nav-list')).toBeNull();
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(1);
  });

  it('refreshes the mood widget when the local adapter returns new state', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce(createState())
        .mockResolvedValueOnce(
          createState({
            adapterLabel: 'Loop stub',
            mood: {
              label: 'Playful',
              note: 'Ready to bounce into a short interaction.',
            },
            recentSignals: ['A fresh status ping just landed.'],
          }),
        ),
    };

    await renderPetCompanion(container, { adapter });

    container.querySelector('[data-action="refresh"]').click();
    await flushPromises();

    expect(container.textContent).toContain('Playful');
    expect(container.textContent).toContain('A fresh status ping just landed.');
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(2);
  });

  it('shows a degraded panel when the local adapter fails', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockRejectedValue(new Error('local loop offline')),
    };

    await renderPetCompanion(container, { adapter });

    expect(container.textContent).toContain('Companion unavailable');
    expect(container.textContent).toContain('local loop offline');
    expect(container.textContent).toContain('surface stays bootable');
  });
});
