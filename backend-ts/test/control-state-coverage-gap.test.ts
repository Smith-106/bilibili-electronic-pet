import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

type ControlStateModule = typeof import('../src/platforms/control-state.js');

async function importFreshControlState(filePath: string): Promise<ControlStateModule> {
  process.env.PLATFORM_CONTROL_STATE_FILE = filePath;
  vi.resetModules();
  return import('../src/platforms/control-state.js');
}

function createTempStatePath(): { dir: string; filePath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'platform-control-state-'));
  return { dir, filePath: join(dir, 'state.json') };
}

afterEach(() => {
  vi.useRealTimers();
  delete process.env.PLATFORM_CONTROL_STATE_FILE;
});

describe('platform control state coverage gaps', () => {
  it('hydrates persisted overrides, normalizes stage and updatedAt, and reset removes the file', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T01:00:00.000Z'));
    const { dir, filePath } = createTempStatePath();
    writeFileSync(
      filePath,
      JSON.stringify({
        qq: { enabled: false, stage: 'trial', updatedAt: '' },
        douyin: { enabled: true, stage: 'paused', updatedAt: '2026-06-08T00:00:00.000Z' },
        ignored: null,
      }),
      'utf8',
    );

    try {
      const controlState = await importFreshControlState(filePath);

      expect(controlState.getPlatformControlState('qq')).toEqual({
        enabled: false,
        stage: 'paused',
        updatedAt: '2026-06-09T01:00:00.000Z',
      });
      expect(controlState.resolvePlatformEffectiveEnabled(true, 'qq')).toBe(false);
      expect(controlState.resolvePlatformEffectiveEnabled(false, 'douyin')).toBe(false);
      expect(controlState.resolvePlatformEffectiveEnabled(true, 'douyin')).toBe(true);

      controlState.resetPlatformControlState('qq');
      expect(controlState.getPlatformControlState('qq')).toBeNull();
      expect(readFileSync(filePath, 'utf8')).toContain('"douyin"');

      controlState.resetPlatformControlState();
      expect(existsSync(filePath)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('treats missing, empty, and invalid persisted files as empty state', async () => {
    const { dir, filePath } = createTempStatePath();

    try {
      let controlState = await importFreshControlState(filePath);
      expect(controlState.getPlatformControlState('bilibili')).toBeNull();

      writeFileSync(filePath, '   ', 'utf8');
      controlState = await importFreshControlState(filePath);
      expect(controlState.getPlatformControlState('bilibili')).toBeNull();

      writeFileSync(filePath, '{invalid json', 'utf8');
      controlState = await importFreshControlState(filePath);
      expect(controlState.resolvePlatformEffectiveEnabled(true, 'bilibili')).toBe(true);

      const updated = controlState.setPlatformControlState('bilibili', {
        enabled: true,
        updatedAt: '2026-06-09T02:00:00.000Z',
      });
      expect(updated).toEqual({
        enabled: true,
        stage: 'trial',
        updatedAt: '2026-06-09T02:00:00.000Z',
      });
      expect(readFileSync(filePath, 'utf8')).toContain('"bilibili"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sorts multiple persisted overrides by platform key', async () => {
    const { dir, filePath } = createTempStatePath();

    try {
      const controlState = await importFreshControlState(filePath);

      controlState.setPlatformControlState('kuaishou', {
        enabled: true,
        updatedAt: '2026-06-09T03:00:00.000Z',
      });
      controlState.setPlatformControlState('bilibili', {
        enabled: true,
        updatedAt: '2026-06-09T03:01:00.000Z',
      });

      const raw = readFileSync(filePath, 'utf8');
      expect(raw.indexOf('"bilibili"')).toBeLessThan(raw.indexOf('"kuaishou"'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
