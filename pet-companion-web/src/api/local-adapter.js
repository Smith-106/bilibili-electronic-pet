const DEFAULT_STATE = Object.freeze({
  petName: 'Mochi',
  statusLine: 'Idle on the browser ledge, listening for the next check-in.',
  loopMode: 'Local placeholder loop',
  lastCheckIn: '2026-04-10 03:30',
  adapterLabel: 'Local stub',
  loopHint: 'Swap this adapter with a real pet core endpoint when the contract is ready.',
  mood: {
    label: 'Curious',
    note: 'Ready to nudge the next companion interaction with a light status ping.',
  },
  memoryTitle: 'Short-term memory',
  memorySummary:
    'Remembers that the current milestone is a pet-first prototype, so it prefers short updates and visible state changes.',
  vitals: [
    { label: 'Energy', value: '76%' },
    { label: 'Hunger', value: 'Snack soon' },
    { label: 'Bond', value: 'Growing' },
    { label: 'Focus', value: 'Watching queue' },
  ],
  recentSignals: [
    'Last pat received 2 minutes ago.',
    'Quiet window open for another 18 minutes.',
    'Next nudge stays local until the real API is wired in.',
  ],
  recentInteractions: [
    {
      kind: 'pat',
      title: 'Pat interaction',
      detail: 'A calm pat kept Mochi settled on the browser ledge.',
      timestamp: '2026-04-10T03:28:00.000Z',
      source: 'Local Stub',
    },
    {
      kind: 'signal',
      title: 'Status pulse',
      detail: 'The local adapter emitted a lightweight keep-alive signal.',
      timestamp: '2026-04-10T03:30:00.000Z',
      source: 'Local Stub',
    },
  ],
});

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function createLocalPetAdapter(seedState = DEFAULT_STATE) {
  return {
    async getCompanionState() {
      await Promise.resolve();
      return cloneState(seedState);
    },
  };
}

export { DEFAULT_STATE as DEFAULT_LOCAL_PET_STATE };
