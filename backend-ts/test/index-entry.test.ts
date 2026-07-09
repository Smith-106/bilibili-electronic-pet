import { beforeEach, describe, expect, it, vi } from 'vitest';

const listenMock = vi.fn();
const createServerMock = vi.fn(() => ({
  listen: listenMock,
}));
const disconnectPrismaMock = vi.fn(async () => undefined);
const isEncryptionAvailableMock = vi.fn(() => true);

vi.mock('../src/main.js', () => ({
  createServer: createServerMock,
}));

vi.mock('../src/lib/prisma.js', () => ({
  disconnectPrisma: () => disconnectPrismaMock(),
}));

vi.mock('../src/services/credential-crypto.js', () => ({
  isEncryptionAvailable: () => isEncryptionAvailableMock(),
}));

vi.mock('../src/services/backoff-decision.js', () => ({
  // Fire-and-forget at boot; the test only asserts createServer + listen ran.
  // The rebuild itself is exercised in backoff-decision.test.ts.
  rebuildBackoffFromDb: () => Promise.resolve(),
}));

describe('backend entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    listenMock.mockReset();
    createServerMock.mockClear();
    disconnectPrismaMock.mockReset();
    isEncryptionAvailableMock.mockReset();
    isEncryptionAvailableMock.mockReturnValue(true);
  });

  it('starts the server with env port and host', async () => {
    const previousPort = process.env.PORT;
    const previousHost = process.env.HOST;
    const previousExit = process.exit;
    const previousError = console.error;
    const exitMock = vi.fn();
    const errorMock = vi.fn();

    process.env.PORT = '8123';
    process.env.HOST = '127.0.0.1';
    process.exit = exitMock as unknown as typeof process.exit;
    console.error = errorMock;

    try {
      await import('../src/index.js');
      await Promise.resolve();
      await Promise.resolve();

      expect(createServerMock).toHaveBeenCalledTimes(1);
      expect(listenMock).toHaveBeenCalledWith({ port: 8123, host: '127.0.0.1' });
      expect(exitMock).not.toHaveBeenCalled();
      expect(errorMock).not.toHaveBeenCalled();
    } finally {
      if (previousPort === undefined) delete process.env.PORT;
      else process.env.PORT = previousPort;
      if (previousHost === undefined) delete process.env.HOST;
      else process.env.HOST = previousHost;
      process.exit = previousExit;
      console.error = previousError;
    }
  });

  it('exits with code 1 when CREDENTIAL_ENCRYPTION_KEY is missing (boot guard fail-closed)', async () => {
    const previousExit = process.exit;
    const previousError = console.error;
    const exitMock = vi.fn((() => {
      throw new Error('process.exit:1');
    }) as never);
    const errorMock = vi.fn();
    isEncryptionAvailableMock.mockReturnValue(false);

    process.exit = exitMock as unknown as typeof process.exit;
    console.error = errorMock;

    try {
      await import('../src/index.js');
      await Promise.resolve();
      await Promise.resolve();

      expect(errorMock).toHaveBeenCalledWith('[boot] CREDENTIAL_ENCRYPTION_KEY not configured');
      expect(exitMock).toHaveBeenCalledWith(1);
      expect(createServerMock).not.toHaveBeenCalled();
    } finally {
      process.exit = previousExit;
      console.error = previousError;
    }
  });

  it('exits with code 1 when startup fails', async () => {
    const previousExit = process.exit;
    const previousError = console.error;
    const exitMock = vi.fn();
    const errorMock = vi.fn();
    listenMock.mockRejectedValueOnce(new Error('listen_failed'));

    process.exit = exitMock as unknown as typeof process.exit;
    console.error = errorMock;

    try {
      await import('../src/index.js');
      await Promise.resolve();
      await Promise.resolve();

      expect(errorMock).toHaveBeenCalledWith(expect.any(Error));
      expect(exitMock).toHaveBeenCalledWith(1);
    } finally {
      process.exit = previousExit;
      console.error = previousError;
    }
  });

  it('logs unhandled rejections', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await import('../src/index.js');

    process.emit('unhandledRejection', new Error('test rejection'));
    expect(errorSpy).toHaveBeenCalledWith('[server] Unhandled rejection:', expect.any(Error));

    errorSpy.mockRestore();
  });

  it('exits with code 1 on uncaught exception', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitMock = vi.fn();
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    await import('../src/index.js');

    process.emit('uncaughtException', new Error('fatal crash'));
    expect(errorSpy).toHaveBeenCalledWith('[server] Uncaught exception:', expect.any(Error));
    expect(exitMock).toHaveBeenCalledWith(1);

    process.exit = originalExit;
    errorSpy.mockRestore();
  });

  it('disconnects Prisma on SIGTERM and exits', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitMock = vi.fn();
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    await import('../src/index.js');

    process.emit('SIGTERM');
    // Allow async gracefulShutdown to run
    await Promise.resolve();
    await Promise.resolve();

    expect(disconnectPrismaMock).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[server] Received SIGTERM, shutting down gracefully...');
    expect(logSpy).toHaveBeenCalledWith('[server] Prisma disconnected successfully');
    expect(exitMock).toHaveBeenCalledWith(0);

    process.exit = originalExit;
    logSpy.mockRestore();
  });

  it('disconnects Prisma on SIGINT and exits', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitMock = vi.fn();
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    await import('../src/index.js');

    process.emit('SIGINT');
    await Promise.resolve();
    await Promise.resolve();

    expect(disconnectPrismaMock).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(0);

    process.exit = originalExit;
    logSpy.mockRestore();
  });

  it('handles Prisma disconnection errors gracefully during shutdown', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitMock = vi.fn();
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;
    disconnectPrismaMock.mockRejectedValueOnce(new Error('disconnect failed'));

    await import('../src/index.js');

    process.emit('SIGTERM');
    await Promise.resolve();
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith('[server] Error disconnecting Prisma:', expect.any(Error));
    expect(exitMock).toHaveBeenCalledWith(0);

    process.exit = originalExit;
    errorSpy.mockRestore();
  });

  it('ignores duplicate SIGTERM signals (shuttingDown guard)', async () => {
    const exitMock = vi.fn();
    const originalExit = process.exit;
    process.exit = exitMock as unknown as typeof process.exit;

    await import('../src/index.js');

    process.emit('SIGTERM');
    await Promise.resolve();
    await Promise.resolve();

    const callCount = disconnectPrismaMock.mock.calls.length;
    process.emit('SIGTERM');
    await Promise.resolve();
    await Promise.resolve();

    // Second SIGTERM should be ignored (shuttingDown guard)
    expect(disconnectPrismaMock.mock.calls.length).toBe(callCount);

    process.exit = originalExit;
  });
});
