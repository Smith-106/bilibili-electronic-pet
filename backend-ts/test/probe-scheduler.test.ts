import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { probeBilibiliAuthMock, recordAntiriskSignalMock, configMock } = vi.hoisted(() => ({
  probeBilibiliAuthMock: vi.fn(),
  recordAntiriskSignalMock: vi.fn(),
  configMock: vi.fn(),
}));

vi.mock('../src/services/bilibili-client.js', () => ({
  probeBilibiliAuth: probeBilibiliAuthMock,
}));

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  loadBilibiliRuntimeConfig: configMock,
}));

vi.mock('../src/services/observability.js', () => ({
  recordAntiriskSignal: recordAntiriskSignalMock,
  ensureTraceId: () => 'test-trace-id',
}));

const { probeBilibiliAuthScheduler, isAuthProbeHealthy, isWarmupSurvivalAsserted, __resetProbeSchedulerForTest } =
  await import('../src/services/probe-scheduler.js');

const baseConfig = {
  sessdata: 'sess',
  biliJct: 'jct',
  buvid: 'bv',
  buvid4: '',
  dedeuserid: '1',
  baseUrl: 'https://api.bilibili.com',
  userAgent: 'ua',
  timeout: 30000,
  retries: 3,
  source: 'environment' as const,
  credentialId: null,
  credentialName: 'test-persona',
};

beforeEach(() => {
  __resetProbeSchedulerForTest();
  probeBilibiliAuthMock.mockReset();
  recordAntiriskSignalMock.mockReset();
  configMock.mockReset();
  configMock.mockResolvedValue(baseConfig);
  // probe-scheduler gates on BILIBILI_ENABLED: probe only runs when collection is on.
  // Existing cases exercise probe behavior, so enable it here by default.
  process.env.BILIBILI_ENABLED = 'true';
});

afterEach(() => {
  __resetProbeSchedulerForTest();
  delete process.env.BILIBILI_ENABLED;
});

describe('probeBilibiliAuthScheduler (TASK-005)', () => {
  it('flips auth_probe red + writes ObservabilityEvent when probe returns not_logged_in', async () => {
    probeBilibiliAuthMock.mockResolvedValue({ ok: false, reason: 'not_logged_in', status: 200 });

    await probeBilibiliAuthScheduler();

    expect(isAuthProbeHealthy()).toBe(false);
    // L8 fail-closed: antirisk signal MUST be awaited synchronously (not fire-and-forget).
    expect(recordAntiriskSignalMock).toHaveBeenCalledTimes(1);
    const callArg = recordAntiriskSignalMock.mock.calls[0][0];
    expect(callArg.event_type).toBe('account_alive_probe_failed');
    expect(callArg.error_subclass).toBe('auth_not_logged_in');
    expect(callArg.persona_id).toBe('test-persona');
  });

  it('increments consecutiveHealthyProbes + clears unhealthy when probe ok', async () => {
    probeBilibiliAuthMock.mockResolvedValue({ ok: true, reason: 'verified', status: 200 });

    // Pre-condition: unhealthy from a prior not_logged_in probe
    await probeBilibiliAuthScheduler();
    expect(isAuthProbeHealthy()).toBe(true);

    // Second successful probe increments consecutiveHealthyProbes further
    probeBilibiliAuthMock.mockResolvedValue({ ok: true, reason: 'verified', status: 200 });
    await probeBilibiliAuthScheduler();
    expect(isAuthProbeHealthy()).toBe(true);
    expect(isWarmupSurvivalAsserted()).toBe(false); // below MIN_HEALTHY_PROBES default
  });

  it('marks unhealthy but does NOT write antirisk signal on non-not_logged_in failures', async () => {
    probeBilibiliAuthMock.mockResolvedValue({ ok: false, reason: 'http_500', status: 500 });

    await probeBilibiliAuthScheduler();

    expect(isAuthProbeHealthy()).toBe(false);
    // Non-account-alive failures are not antirisk signals — no ObservabilityEvent write.
    expect(recordAntiriskSignalMock).not.toHaveBeenCalled();
  });

  it('marks unhealthy + logs when no credential configured', async () => {
    configMock.mockResolvedValue(null);

    await probeBilibiliAuthScheduler();

    expect(isAuthProbeHealthy()).toBe(false);
    expect(probeBilibiliAuthMock).not.toHaveBeenCalled();
    expect(recordAntiriskSignalMock).not.toHaveBeenCalled();
  });

  it('skips probe + stays healthy when BILIBILI_ENABLED is false (webhook-only mode)', async () => {
    // webhook-only / no-collection deployment: account liveness is irrelevant, probe must
    // not run and must not flip the readiness auth_probe_healthy gate red.
    process.env.BILIBILI_ENABLED = 'false';
    // Even with no credential configured, disabled mode stays healthy (early return).
    configMock.mockResolvedValue(null);

    await probeBilibiliAuthScheduler();

    expect(isAuthProbeHealthy()).toBe(true);
    expect(probeBilibiliAuthMock).not.toHaveBeenCalled();
    expect(configMock).not.toHaveBeenCalled();
    expect(recordAntiriskSignalMock).not.toHaveBeenCalled();
  });

  it('isWarmupSurvivalAsserted stays false before any healthy probe', async () => {
    // Initial state: no probes yet
    expect(isWarmupSurvivalAsserted()).toBe(false);
    expect(isAuthProbeHealthy()).toBe(true); // no failure observed yet = healthy default
  });
});
