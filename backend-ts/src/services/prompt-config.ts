/**
 * YAML prompt configuration loader
 * Migrated from Python: app/services/prompt_config.py
 *
 * Reads config/prompt_doro.yaml at runtime for configurable prompt settings.
 * Falls back to hardcoded defaults when file is missing or malformed.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Defaults (matching Python) ────────────────────────────

const DEFAULT_ACTION_POOL = ['(轻轻靠近)', '(小声嘟囔)', '(抬头认真看)'];
const DEFAULT_SKIP_KEYWORDS = ['广告', 'vx', '加群', '私聊', '兼职', '刷单'];
const DEFAULT_BANNED_WORDS = ['仇恨', '去死', '手机号', '身份证'];

export type PromptLengthMode = 'short' | 'medium' | 'long' | 'extra_long';

const DEFAULT_LENGTH_MODE: PromptLengthMode = 'medium';

const DEFAULT_LENGTH_DISTRIBUTION: Record<PromptLengthMode, number> = {
  short: 0.0,
  medium: 0.8,
  long: 0.15,
  extra_long: 0.05,
};

// ── YAML parser (lightweight, no dependency) ──────────────

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let currentList: string[] | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // List item
    const listMatch = line.match(/^\s*-\s+"?(.+?)"?\s*$/);
    if (listMatch && currentKey) {
      if (!currentList) {
        currentList = [];
        result[currentKey] = currentList;
      }
      (result[currentKey] as string[]).push(listMatch[1].trim());
      continue;
    }

    // Key: value
    const kvMatch = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      currentList = null;

      if (!value) {
        // Will be a list or nested map on next lines
        continue;
      }

      // Try number
      const num = Number(value);
      if (value !== '' && !isNaN(num)) {
        result[currentKey] = num;
      } else {
        // Strip quotes
        result[currentKey] = value.replace(/^["']|["']$/g, '');
      }
      continue;
    }

    // Nested key under a map (e.g. length_distribution > medium: 0.8)
    const nestedMatch = line.match(/^\s+(\w[\w_]*):\s*(.*)/);
    if (nestedMatch && currentKey) {
      const nestedKey = nestedMatch[1];
      const nestedValue = nestedMatch[2].trim();
      const num = Number(nestedValue);

      if (!Array.isArray(result[currentKey]) && typeof result[currentKey] !== 'string') {
        if (!result[currentKey] || typeof result[currentKey] === 'string' || typeof result[currentKey] === 'number') {
          result[currentKey] = {};
        }
        (result[currentKey] as Record<string, unknown>)[nestedKey] =
          nestedValue !== '' && !isNaN(num) ? num : nestedValue.replace(/^["']|["']$/g, '');
      }
    }
  }

  return result;
}

// ── Config loading with cache ─────────────────────────────

let cachedConfig: Record<string, unknown> | null = null;

function findProjectRoot(): string {
  // Try env var first
  const envRoot = process.env.PROJECT_ROOT;
  if (envRoot) return envRoot;

  // Try relative to dist/ or src/
  const cwd = process.cwd();
  if (existsSync(resolve(cwd, 'config/prompt_doro.yaml'))) return cwd;
  if (existsSync(resolve(cwd, '../config/prompt_doro.yaml'))) return resolve(cwd, '..');
  return cwd;
}

function loadPromptConfig(): Record<string, unknown> {
  if (cachedConfig) return cachedConfig;

  const root = findProjectRoot();
  const configPath = resolve(root, 'config', 'prompt_doro.yaml');

  try {
    if (!existsSync(configPath)) return {};
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = parseSimpleYaml(raw);
    cachedConfig = parsed;
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Clear cached config (for testing or hot-reload)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

// ── Helpers ───────────────────────────────────────────────

function readStrList(config: Record<string, unknown>, key: string, defaults: string[]): string[] {
  const values = config[key];
  if (!Array.isArray(values)) return [...defaults];

  const normalized: string[] = [];
  for (const item of values) {
    const value = String(item ?? '').trim();
    if (value && !normalized.includes(value)) {
      normalized.push(value);
    }
  }
  return normalized.length > 0 ? normalized : [...defaults];
}

// ── Public API ────────────────────────────────────────────

export function getPromptActionPool(): string[] {
  return readStrList(loadPromptConfig(), 'action_pool', DEFAULT_ACTION_POOL);
}

export function getPromptSkipKeywords(): string[] {
  return readStrList(loadPromptConfig(), 'skip_keywords', DEFAULT_SKIP_KEYWORDS);
}

export function getPromptBannedWords(): string[] {
  return readStrList(loadPromptConfig(), 'banned_words', DEFAULT_BANNED_WORDS);
}

export function getPromptDefaultLength(): PromptLengthMode {
  const raw = String(loadPromptConfig().default_length ?? '')
    .trim()
    .toLowerCase();
  if (raw in DEFAULT_LENGTH_DISTRIBUTION) return raw as PromptLengthMode;
  return DEFAULT_LENGTH_MODE;
}

export function getPromptLengthDistribution(): Record<PromptLengthMode, number> {
  const raw = loadPromptConfig().length_distribution;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_LENGTH_DISTRIBUTION };
  }

  const distribution = { ...DEFAULT_LENGTH_DISTRIBUTION };
  for (const key of Object.keys(distribution) as PromptLengthMode[]) {
    const val = (raw as Record<string, unknown>)[key];
    if (val != null) {
      const num = Number(val);
      if (!isNaN(num)) distribution[key] = Math.max(0, num);
    }
  }
  return distribution;
}

export const __promptConfigTesting = {
  readStrList,
};
