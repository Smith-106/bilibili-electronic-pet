const DEFAULT_STATE = Object.freeze({
  petName: 'Mochi',
  statusLine: 'Resting near the browser edge, ready for the next ritual check-in.',
  loopMode: 'Companion seed state',
  lastCheckIn: '2026-04-10 03:30',
  adapterLabel: 'Seed state adapter',
  loopHint: 'A shipped seed state is active until the live companion endpoint publishes richer state.',
  mood: {
    label: 'Curious',
    note: 'Ready to nudge the next companion interaction with a calm status pulse.',
  },
  memoryTitle: 'Short-term memory',
  memorySummary:
    'Keeps the latest ritual cues nearby so the companion can feel consistent while running on a shipped seed state.',
  vitals: [
    { label: 'Energy', value: '76%' },
    { label: 'Hunger', value: 'Snack soon' },
    { label: 'Bond', value: 'Growing' },
    { label: 'Focus', value: 'Watching queue' },
  ],
  recentSignals: [
    'Last pat received 2 minutes ago.',
    'Quiet window open for another 18 minutes.',
    'Next nudge stays on the seed state until the live endpoint is available.',
  ],
  recentInteractions: [
    {
      kind: 'pat',
      title: 'Pat interaction',
      detail: 'A calm pat kept Mochi settled on the browser ledge.',
      timestamp: '2026-04-10T03:28:00.000Z',
      source: 'Seed state adapter',
    },
    {
      kind: 'signal',
      title: 'Status pulse',
      detail: 'The local adapter emitted a lightweight keep-alive signal.',
      timestamp: '2026-04-10T03:30:00.000Z',
      source: 'Seed state adapter',
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
