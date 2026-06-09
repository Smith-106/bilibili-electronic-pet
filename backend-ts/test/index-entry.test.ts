import { beforeEach, describe, expect, it, vi } from 'vitest';

const listenMock = vi.fn();
const createServerMock = vi.fn(() => ({
  listen: listenMock,
}));

vi.mock('../src/main.js', () => ({
  createServer: createServerMock,
}));

describe('backend entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    listenMock.mockReset();
    createServerMock.mockClear();
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
});
