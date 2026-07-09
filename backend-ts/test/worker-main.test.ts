import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildWorkerServicesMock,
  createCommentEventWorkerMock,
  disconnectPrismaMock,
  isEncryptionAvailableMock,
  pollAllVideosMock,
  resolvePlatformPollingRuntimeMock,
  workerOnMock,
  workerIsRunningMock,
  healthListenMock,
  healthCloseMock,
  createServerMock,
} = vi.hoisted(() => ({
  buildWorkerServicesMock: vi.fn(),
  createCommentEventWorkerMock: vi.fn(),
  disconnectPrismaMock: vi.fn(async () => undefined),
  isEncryptionAvailableMock: vi.fn(() => true),
  pollAllVideosMock: vi.fn(),
  resolvePlatformPollingRuntimeMock: vi.fn(),
  workerOnMock: vi.fn(),
  workerIsRunningMock: vi.fn(() => true),
  healthListenMock: vi.fn(),
  healthCloseMock: vi.fn(async () => undefined),
  createServerMock: vi.fn(),
}));

vi.mock('node:http', () => ({
  createServer: (...args: unknown[]) => createServerMock(...args),
}));

vi.mock('../src/platforms/registry.js', () => ({
  resolvePlatformPollingRuntime: resolvePlatformPollingRuntimeMock,
}));

vi.mock('../src/services/index.js', () => ({
  buildWorkerServices: buildWorkerServicesMock,
}));

vi.mock('../src/services/credential-crypto.js', () => ({
  isEncryptionAvailable: () => isEncryptionAvailableMock(),
}));

vi.mock('../src/workers/tasks/comment-event.task.js', () => ({
  createCommentEventWorker: createCommentEventWorkerMock,
}));

vi.mock('../src/services/bilibili-poller.js', () => ({
  pollAllVideos: pollAllVideosMock,
}));

vi.mock('../src/lib/prisma.js', () => ({
  disconnectPrisma: disconnectPrismaMock,
}));

import { main, parseBoolean, parseInteger } from '../src/workers/worker-main.js';

type EventCallback = (...args: unknown[]) => void;

describe('worker main runtime', () => {
  const originalEnv = {
    KILL_SWITCH: process.env.KILL_SWITCH,
    ROLE_PROFILE_DEFAULT: process.env.ROLE_PROFILE_DEFAULT,
  };
  const originalArgv1 = process.argv[1];
  let callbacks: Record<string, EventCallback>;
  let workerCloseMock: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processOnSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    callbacks = {};
    workerCloseMock = vi.fn(async () => undefined);
    workerOnMock.mockReset();
    workerIsRunningMock.mockReset();
    workerIsRunningMock.mockReturnValue(true);
    healthListenMock.mockReset();
    healthCloseMock.mockReset();
    healthCloseMock.mockImplementation((cb?: () => void) => {
      if (typeof cb === 'function') cb();
      return undefined;
    });
    createServerMock.mockClear();
    createServerMock.mockImplementation(() => ({
      listen: healthListenMock,
      close: healthCloseMock,
      on: vi.fn(),
    }));
    buildWorkerServicesMock.mockReturnValue({ services: true });
    createCommentEventWorkerMock.mockReturnValue({
      close: workerCloseMock,
      on: workerOnMock,
      isRunning: workerIsRunningMock,
    });
    resolvePlatformPollingRuntimeMock.mockReturnValue({ enabled: false, intervalSeconds: 60 });
    pollAllVideosMock.mockResolvedValue({ videos: 2, events_injected: 3 });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    processOnSpy = vi.spyOn(process, 'on').mockImplementation((event, listener) => {
      callbacks[event] = listener as EventCallback;
      return process;
    });
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);
    process.env.KILL_SWITCH = 'true';
    process.env.ROLE_PROFILE_DEFAULT = 'moe';
  });

  afterEach(() => {
    if (originalEnv.KILL_SWITCH === undefined) {
      delete process.env.KILL_SWITCH;
    } else {
      process.env.KILL_SWITCH = originalEnv.KILL_SWITCH;
    }
    if (originalEnv.ROLE_PROFILE_DEFAULT === undefined) {
      delete process.env.ROLE_PROFILE_DEFAULT;
    } else {
      process.env.ROLE_PROFILE_DEFAULT = originalEnv.ROLE_PROFILE_DEFAULT;
    }
    process.argv[1] = originalArgv1;
    vi.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processOnSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('parses worker main primitive environment values', () => {
    expect(parseBoolean(undefined, true)).toBe(true);
    expect(parseBoolean(' YES ', false)).toBe(true);
    expect(parseBoolean('off', true)).toBe(false);
    expect(parseInteger(undefined, 7)).toBe(7);
    expect(parseInteger('42', 7)).toBe(42);
    expect(parseInteger('0', 7)).toBe(7);
    expect(parseInteger('invalid', 7)).toBe(7);
  });

  it('starts the worker with env-derived services and disabled polling shutdown', async () => {
    main();

    expect(buildWorkerServicesMock).toHaveBeenCalledWith({
      killSwitch: true,
      roleProfileDefault: 'moe',
    });
    expect(createCommentEventWorkerMock).toHaveBeenCalledWith('comment-event', { services: true });
    expect(resolvePlatformPollingRuntimeMock).toHaveBeenCalledWith('bilibili', process.env);
    expect(consoleLogSpy).toHaveBeenCalledWith('[worker] Bilibili polling disabled (BILIBILI_POLL_ENABLED not set)');
    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    await expect(callbacks.SIGTERM?.()).rejects.toThrow('process.exit:0');
    expect(workerCloseMock).toHaveBeenCalledOnce();
    expect(disconnectPrismaMock).toHaveBeenCalledOnce();
    expect(consoleLogSpy).toHaveBeenCalledWith('[worker] Prisma disconnected successfully');
    await expect(callbacks.SIGTERM?.()).resolves.toBeUndefined();
    expect(workerCloseMock).toHaveBeenCalledOnce();
    expect(disconnectPrismaMock).toHaveBeenCalledOnce();
  });

  it('logs close errors before exiting during disabled polling shutdown', async () => {
    workerCloseMock.mockRejectedValueOnce(new Error('close failed'));
    main();

    await expect(callbacks.SIGINT?.()).rejects.toThrow('process.exit:0');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Error closing worker:', expect.any(Error));
    expect(disconnectPrismaMock).toHaveBeenCalledOnce();
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('runs scheduled polling, skips overlapping polls, and clears timer on shutdown', async () => {
    vi.useFakeTimers();
    process.env.KILL_SWITCH = 'false';
    delete process.env.ROLE_PROFILE_DEFAULT;
    resolvePlatformPollingRuntimeMock.mockReturnValue({ enabled: true, intervalSeconds: 5 });
    let resolvePoll: (value: { videos: number; events_injected: number }) => void = () => undefined;
    pollAllVideosMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePoll = resolve;
      }),
    );

    main();

    expect(buildWorkerServicesMock).toHaveBeenCalledWith({
      killSwitch: false,
      roleProfileDefault: 'doro',
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('[worker] Bilibili polling scheduled every 5s (initial delay: 10s)');

    await vi.advanceTimersByTimeAsync(10_000);
    expect(pollAllVideosMock).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(pollAllVideosMock).toHaveBeenCalledOnce();
    expect(consoleLogSpy).toHaveBeenCalledWith('[worker] Bilibili poll already in progress, skipping');

    resolvePoll({ videos: 4, events_injected: 7 });
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    expect(consoleLogSpy).toHaveBeenCalledWith('[worker] Bilibili poll completed: 4 videos, 7 events injected');

    await expect(callbacks.SIGINT?.()).rejects.toThrow('process.exit:0');
    expect(workerCloseMock).toHaveBeenCalledOnce();
    expect(disconnectPrismaMock).toHaveBeenCalledOnce();
  });

  it('logs polling failures and closes worker from polling shutdown path', async () => {
    vi.useFakeTimers();
    resolvePlatformPollingRuntimeMock.mockReturnValue({ enabled: true, intervalSeconds: 30 });
    pollAllVideosMock.mockRejectedValueOnce(new Error('poll failed'));
    workerCloseMock.mockRejectedValueOnce(new Error('close failed'));

    main();

    await vi.advanceTimersByTimeAsync(10_000);
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Bilibili poll failed:', expect.any(Error));
    await expect(callbacks.SIGTERM?.()).rejects.toThrow('process.exit:0');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Error closing worker:', expect.any(Error));
    expect(disconnectPrismaMock).toHaveBeenCalledOnce();
  });

  it('shuts down polling mode before the interval has been created', async () => {
    vi.useFakeTimers();
    resolvePlatformPollingRuntimeMock.mockReturnValue({ enabled: true, intervalSeconds: 30 });

    main();

    await expect(callbacks.SIGTERM?.()).rejects.toThrow('process.exit:0');
    expect(workerCloseMock).toHaveBeenCalledOnce();
  });

  it('logs unhandled rejections', () => {
    main();
    callbacks['unhandledRejection'](new Error('test rejection'));
    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Unhandled rejection:', expect.any(Error));
  });

  it('logs uncaught exceptions and exits with code 1', () => {
    main();
    expect(() => callbacks['uncaughtException'](new Error('fatal crash'))).toThrow('process.exit:1');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Uncaught exception:', expect.any(Error));
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('handles Prisma disconnection errors gracefully during non-polling shutdown', async () => {
    disconnectPrismaMock.mockRejectedValueOnce(new Error('disconnect failed'));
    main();
    await expect(callbacks['SIGTERM']?.()).rejects.toThrow('process.exit:0');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Error disconnecting Prisma:', expect.any(Error));
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('handles Prisma disconnection errors gracefully during polling shutdown', async () => {
    vi.useFakeTimers();
    resolvePlatformPollingRuntimeMock.mockReturnValue({ enabled: true, intervalSeconds: 30 });
    disconnectPrismaMock.mockRejectedValueOnce(new Error('disconnect failed'));
    main();
    await expect(callbacks['SIGTERM']?.()).rejects.toThrow('process.exit:0');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Error disconnecting Prisma:', expect.any(Error));
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('logs fatal startup errors when executed directly', async () => {
    vi.resetModules();
    process.argv[1] = resolve('src/workers/worker-main.ts');
    buildWorkerServicesMock.mockImplementationOnce(() => {
      throw new Error('boot failed');
    });
    processExitSpy.mockImplementationOnce((() => undefined) as never);

    await import('../src/workers/worker-main.js');
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[worker] Fatal error:', expect.any(Error));
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('starts /healthz HTTP listener on port 3100 and hooks worker completed/failed events', () => {
    main();

    // L6/F3: functional healthcheck replaces pgrep — worker event hooks feed heartbeat.
    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(healthListenMock).toHaveBeenCalledWith(3100);
    expect(consoleLogSpy).toHaveBeenCalledWith('[worker] Health server listening on :3100/healthz');
    // Reuses task-queue.ts:101 worker event hooks (additional listeners, same EventEmitter).
    const completedCall = workerOnMock.mock.calls.find((args) => args[0] === 'completed');
    const failedCall = workerOnMock.mock.calls.find((args) => args[0] === 'failed');
    expect(completedCall).toBeTruthy();
    expect(failedCall).toBeTruthy();
  });

  it('/healthz returns 200 with fresh heartbeat when worker running and a job completed', () => {
    main();

    // The handler passed to createServer is the first argument of the first call.
    const reqHandler = createServerMock.mock.calls[0][0] as (
      req: { url: string },
      res: { writeHead: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> },
    ) => void;
    // Simulate a completed job refreshing the heartbeat.
    const completedListener = workerOnMock.mock.calls.find((args) => args[0] === 'completed')?.[1] as
      | (() => void)
      | undefined;
    completedListener?.();

    const res = { writeHead: vi.fn(), end: vi.fn() };
    reqHandler({ url: '/healthz' }, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.ok).toBe(true);
    expect(body.worker_running).toBe(true);
    expect(body.heartbeat_fresh).toBe(true);
    expect(body.last_completed_at).not.toBeNull();
  });

  it('/healthz returns 503 when worker is not running', () => {
    workerIsRunningMock.mockReturnValue(false);
    main();

    const reqHandler = createServerMock.mock.calls[0][0] as (
      req: { url: string },
      res: { writeHead: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> },
    ) => void;
    const res = { writeHead: vi.fn(), end: vi.fn() };
    reqHandler({ url: '/healthz' }, res);

    expect(res.writeHead).toHaveBeenCalledWith(503, expect.any(Object));
    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.ok).toBe(false);
    expect(body.worker_running).toBe(false);
  });

  it('/healthz returns 404 for unknown paths', () => {
    main();

    const reqHandler = createServerMock.mock.calls[0][0] as (
      req: { url: string },
      res: { writeHead: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> },
    ) => void;
    const res = { writeHead: vi.fn(), end: vi.fn() };
    reqHandler({ url: '/unknown' }, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
  });

  it('closes health server during graceful shutdown', async () => {
    main();
    await expect(callbacks.SIGTERM?.()).rejects.toThrow('process.exit:0');
    expect(healthCloseMock).toHaveBeenCalledOnce();
  });
});
