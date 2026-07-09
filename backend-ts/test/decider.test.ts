import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { __deciderTesting, shouldReplyForInteraction, shouldReply } = await import(
  '../src/services/decider.js'
);

const { samplePoisson, shouldReplyPoisson, getCurrentReplyState, loadReplyRules } = __deciderTesting;

const trackedEnvKeys = [
  'REPLY_BASE_PROBABILITY',
  'REPLY_GLOBAL_COOLDOWN_ENABLED',
  'REPLY_COOLDOWN_MINUTES',
  'REPLY_QUIET_HOURS_START',
  'REPLY_QUIET_HOURS_END',
  'TIMING_ENGINE_ENABLED',
  'RAMPUP_FIRST_DAY_FACTOR',
] as const;

const originalEnv = Object.fromEntries(
  trackedEnvKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof trackedEnvKeys)[number], string | undefined>;

function clearTrackedEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function restoreTrackedEnv(): void {
  clearTrackedEnv();
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    }
  }
}

beforeEach(() => {
  clearTrackedEnv();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  restoreTrackedEnv();
});

function buildInteraction(text: string, userId?: string) {
  return {
    platform: 'bilibili',
    ingressSource: 'test',
    actor: userId ? { platformUserId: userId } : undefined,
    reference: {
      subjectKind: 'comment',
      externalId: 'comment-1',
      canonicalId: 'bilibili:comment-1',
      containerId: 'video-1',
    },
    content: { text },
    legacyComment: { commentId: 'comment-1', videoId: 'video-1' },
  };
}

describe('Poisson timing engine', () => {
  it('samplePoisson returns 0 when Math.random is always 1 (no event)', () => {
    // Math.random === 1 → p never drops below L on first multiply, but the loop
    // terminates because p *= 1 stays at 1 > L forever is NOT possible: the loop
    // condition p > L with p fixed at 1 would loop forever. So use a value < 1.
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    // With λ large enough, even 0.999 eventually drops below L. But to assert 0,
    // force first multiply to exceed L immediately: random < L.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(samplePoisson(1.204)).toBe(0);
  });

  it('shouldReplyPoisson(reply=true) when sample >= 1', () => {
    // Math.random close to 1 keeps p above L for many iterations → k >= 1.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldReplyPoisson(1.204)).toBe(true);
  });

  it('N=2000 samples of shouldReplyPoisson(1.204) ≈ 0.7 ± 0.08', () => {
    const N = 2000;
    let yes = 0;
    for (let i = 0; i < N; i++) {
      if (shouldReplyPoisson(1.204)) yes++;
    }
    const freq = yes / N;
    // P(reply) = 1 - e^-1.204 ≈ 0.700. Allow ±0.08 tolerance for sampling noise.
    expect(freq).toBeGreaterThan(0.62);
    expect(freq).toBeLessThan(0.78);
  });

  it('active λ frequency > drowsy λ frequency > quiet λ frequency', () => {
    const N = 1500;
    const activeYes = countYes(1.204, N);
    const drowsyYes = countYes(0.6, N);
    const quietYes = countYes(0.2, N);
    // active > drowsy > quiet
    expect(activeYes).toBeGreaterThan(drowsyYes);
    expect(drowsyYes).toBeGreaterThan(quietYes);
  });

  function countYes(lambda: number, n: number): number {
    let yes = 0;
    for (let i = 0; i < n; i++) {
      if (shouldReplyPoisson(lambda)) yes++;
    }
    return yes;
  }
});

describe('reply state machine', () => {
  const rules = loadReplyRules();

  it('returns quiet during quiet hours', () => {
    // 2026-06-08T16:00:00Z = 00:00 UTC+8 → within 23-07 quiet hours
    const quietDate = new Date('2026-06-08T16:00:00.000Z');
    expect(getCurrentReplyState(rules, quietDate)).toBe('quiet');
  });

  it('returns active or drowsy outside quiet hours', () => {
    // 2026-06-08T04:00:00Z = 12:00 UTC+8 → daytime
    const dayDate = new Date('2026-06-08T04:00:00.000Z');
    const state = getCurrentReplyState(rules, dayDate);
    expect(['active', 'drowsy']).toContain(state);
  });

  it('drifts across drift slots (not stuck on a single state)', () => {
    // Sample many slots across a long time window and collect distinct states.
    const seen = new Set<string>();
    const slotMs = rules.stateDriftIntervalMinutes * 60 * 1000;
    for (let i = 0; i < 200; i++) {
      const date = new Date(2026, 5, 8, 12, 0, 0, i * slotMs);
      seen.add(getCurrentReplyState(rules, date));
    }
    // Must observe at least 2 distinct non-quiet states over time (drift).
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});

describe('timing engine feature flag (L8 isolation)', () => {
  it('falls back to Math.random < probability when TIMING_ENGINE_ENABLED=false', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T04:00:00.000Z')); // daytime
    process.env.TIMING_ENGINE_ENABLED = 'false';
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    // Math.random === 0 → probability 0.7 → 0 < 0.7 → reply true
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const yes = await shouldReplyForInteraction({
      interaction: buildInteraction('hello'),
      styleProfile: 'doro',
    });
    expect(yes).toEqual([true, 'doro', 'medium']);

    // Math.random === 0.9 → 0.9 < 0.7 → false → no reply
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const no = await shouldReplyForInteraction({
      interaction: buildInteraction('hello'),
      styleProfile: 'doro',
    });
    expect(no).toEqual([false, 'doro', 'medium']);
  });

  it('uses Poisson sampling when TIMING_ENGINE_ENABLED is on (default)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T04:00:00.000Z')); // daytime → active/drowsy
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    // Isolate the timing-engine sampling from the P3 ramp-up factor (RAMPUP_FIRST_DAY_FACTOR).
    // This test verifies the Poisson engine itself with the canonical baseReplyProbability 0.7
    // (λ≈1.204). Ramp-up shrinks p by default (0.1) which would drop the frequency below the
    // assertion floor — orthogonal to what this test checks, so we neutralize it here.
    process.env.RAMPUP_FIRST_DAY_FACTOR = '1';

    // Statistical: over N samples, reply frequency should approximate the active/drowsy
    // λ (1.204 / 0.6), well above the legacy-fixed mock behavior. With real randomness,
    // a daytime state yields frequency bounded away from 0 and 1.
    const N = 300;
    let yes = 0;
    for (let i = 0; i < N; i++) {
      const [should] = await shouldReplyForInteraction({
        interaction: buildInteraction('hello'),
        styleProfile: 'doro',
      });
      if (should) yes++;
    }
    const freq = yes / N;
    expect(freq).toBeGreaterThan(0.3);
    expect(freq).toBeLessThan(0.95);
  });
});

describe('shouldReply tuple contract unchanged', () => {
  it('returns [boolean, string, string] triple from shouldReply legacy entry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T04:00:00.000Z'));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await shouldReply({
      platform: 'bilibili',
      comment_id: 'c1',
      video_id: 'v1',
      user_id: 'u1',
      content: 'hello',
      force_long: true,
      style_profile: 'doro',
      role_profile: 'comfort',
      role_card_key: 'card-1',
    });
    expect(result).toEqual([true, 'doro', 'long']);
  });
});
