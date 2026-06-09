import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearConfigCache,
  __promptConfigTesting,
  getPromptActionPool,
  getPromptBannedWords,
  getPromptDefaultLength,
  getPromptLengthDistribution,
  getPromptSkipKeywords,
} from '../src/services/prompt-config.js';

const originalProjectRoot = process.env.PROJECT_ROOT;
const originalCwd = process.cwd();

function writePromptConfig(root: string, text: string): void {
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'config', 'prompt_doro.yaml'), text, 'utf8');
}

describe('prompt config service', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prompt-config-'));
    process.env.PROJECT_ROOT = tempDir;
    clearConfigCache();
  });

  afterEach(() => {
    clearConfigCache();
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    if (originalProjectRoot === undefined) delete process.env.PROJECT_ROOT;
    else process.env.PROJECT_ROOT = originalProjectRoot;
  });

  it('returns hardcoded defaults when the yaml file is missing', () => {
    expect(getPromptActionPool().length).toBeGreaterThan(0);
    expect(getPromptSkipKeywords().length).toBeGreaterThan(0);
    expect(getPromptBannedWords().length).toBeGreaterThan(0);
    expect(getPromptDefaultLength()).toBe('medium');
    expect(getPromptLengthDistribution()).toMatchObject({
      short: 0,
      medium: 0.8,
      long: 0.15,
      extra_long: 0.05,
    });
  });

  it('loads lists, default length, and length distribution from yaml', () => {
    writePromptConfig(
      tempDir,
      `
action_pool:
  - "wave"
  - "nod"
skip_keywords:
  - "ad"
banned_words:
  - "ban"
default_length: long
length_distribution:
  short: 0.1
  medium: 0.2
  long: 0.3
  extra_long: -1
`,
    );

    expect(getPromptActionPool()).toEqual(['wave', 'nod']);
    expect(getPromptSkipKeywords()).toEqual(['ad']);
    expect(getPromptBannedWords()).toEqual(['ban']);
    expect(getPromptDefaultLength()).toBe('long');
    expect(getPromptLengthDistribution()).toEqual({
      short: 0.1,
      medium: 0.2,
      long: 0.3,
      extra_long: 0,
    });
  });

  it('deduplicates string lists, ignores blank entries, and parses string nested values', () => {
    writePromptConfig(
      tempDir,
      `
action_pool:
  - "wave"
  - "wave"
  -
  - " nod "
length_distribution:
  short: almost
`,
    );

    expect(getPromptActionPool()).toEqual(['wave', 'nod']);
    expect(getPromptLengthDistribution().short).toBe(0);
  });

  it('ignores nested map lines after scalar keys and falls back for empty normalized lists', () => {
    writePromptConfig(
      tempDir,
      `
action_pool:
  -
  -
length_distribution: scalar
  short: 0.9
`,
    );

    expect(getPromptActionPool().length).toBeGreaterThan(0);
    expect(getPromptActionPool()).not.toEqual(['']);
    expect(getPromptLengthDistribution()).toMatchObject({ short: 0, medium: 0.8 });
  });

  it('stringifies nullish list entries when supplied by parsed yaml content', () => {
    writePromptConfig(
      tempDir,
      `
action_pool:
  - null
`,
    );

    expect(getPromptActionPool()).toEqual(['null']);
  });

  it('normalizes direct list helper nullish, duplicate, and all-empty entries', () => {
    expect(__promptConfigTesting.readStrList({ values: [null, undefined, ' alpha ', 'alpha', '', ' beta '] }, 'values', [
      'fallback',
    ])).toEqual(['alpha', 'beta']);
    expect(__promptConfigTesting.readStrList({ values: [null, undefined, ''] }, 'values', ['fallback'])).toEqual([
      'fallback',
    ]);
    expect(__promptConfigTesting.readStrList({ values: 'not-list' }, 'values', ['fallback'])).toEqual(['fallback']);
  });

  it('discovers config from the current directory and parent directory when PROJECT_ROOT is unset', () => {
    delete process.env.PROJECT_ROOT;
    const childDir = join(tempDir, 'child');
    mkdirSync(childDir, { recursive: true });

    writePromptConfig(tempDir, 'action_pool:\n  - parent-action\n');
    process.chdir(childDir);

    expect(getPromptActionPool()).toEqual(['parent-action']);

    clearConfigCache();
    writePromptConfig(childDir, 'action_pool:\n  - child-action\n');
    expect(getPromptActionPool()).toEqual(['child-action']);
  });

  it('falls back to the current working directory when no config roots match', () => {
    delete process.env.PROJECT_ROOT;
    const emptyDir = join(tempDir, 'empty');
    mkdirSync(emptyDir, { recursive: true });
    process.chdir(emptyDir);

    expect(getPromptActionPool().length).toBeGreaterThan(0);
  });

  it('falls back to defaults when the config file cannot be read', () => {
    writePromptConfig(tempDir, 'action_pool:\n  - unreadable\n');
    rmSync(join(tempDir, 'config', 'prompt_doro.yaml'), { force: true });
    mkdirSync(join(tempDir, 'config', 'prompt_doro.yaml'));

    expect(getPromptActionPool().length).toBeGreaterThan(0);
    expect(getPromptActionPool()).not.toEqual(['unreadable']);
  });

  it('caches loaded config until the cache is cleared', () => {
    writePromptConfig(tempDir, 'action_pool:\n  - first\n');

    expect(getPromptActionPool()).toEqual(['first']);

    writePromptConfig(tempDir, 'action_pool:\n  - second\n');
    expect(getPromptActionPool()).toEqual(['first']);

    clearConfigCache();
    expect(getPromptActionPool()).toEqual(['second']);
  });

  it('falls back on malformed values and empty lists', () => {
    writePromptConfig(
      tempDir,
      `
action_pool:
default_length: invalid
length_distribution: bad
`,
    );

    expect(getPromptActionPool().length).toBeGreaterThan(0);
    expect(getPromptDefaultLength()).toBe('medium');
    expect(getPromptLengthDistribution()).toMatchObject({ medium: 0.8 });
  });
});
