import type { PrismaClient } from '@prisma/client';

import { getPrisma } from '../lib/prisma.js';
import { decrypt } from './credential-crypto.js';

export interface BilibiliRuntimeConfig {
  sessdata: string;
  biliJct: string;
  buvid: string;
  buvid4: string;
  dedeuserid: string;
  baseUrl: string;
  userAgent: string;
  timeout: number;
  retries: number;
  source: 'database' | 'environment';
  credentialId: number | null;
  credentialName: string | null;
}

type BilibiliCredentialReader = Pick<PrismaClient, 'bilibiliCredential'>;

type ActiveBilibiliCredential = {
  id: number;
  name: string;
  sessdata: string;
  bili_jct: string;
  buvid3: string;
  buvid4: string | null;
};

function readIntegerEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildCommonConfig(): Omit<
  BilibiliRuntimeConfig,
  'sessdata' | 'biliJct' | 'buvid' | 'buvid4' | 'source' | 'credentialId' | 'credentialName'
> {
  return {
    dedeuserid: process.env.BILIBILI_DEDEUSERID || '',
    baseUrl: process.env.BILIBILI_BASE_URL || 'https://api.bilibili.com',
    userAgent:
      process.env.BILIBILI_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0',
    timeout: readIntegerEnv('BILIBILI_TIMEOUT', 30000),
    retries: readIntegerEnv('BILIBILI_RETRIES', 3),
  };
}

function hasRequiredCredentialFields(config: Pick<BilibiliRuntimeConfig, 'sessdata' | 'biliJct' | 'buvid'>): boolean {
  return Boolean(config.sessdata && config.biliJct && config.buvid);
}

function buildEnvironmentConfig(): BilibiliRuntimeConfig | null {
  const config: BilibiliRuntimeConfig = {
    ...buildCommonConfig(),
    sessdata: process.env.BILIBILI_SESSDATA || '',
    biliJct: process.env.BILIBILI_BILI_JCT || '',
    buvid: process.env.BILIBILI_BUVID3 || '',
    buvid4: process.env.BILIBILI_BUVID4 || '',
    source: 'environment',
    credentialId: null,
    credentialName: null,
  };

  return hasRequiredCredentialFields(config) ? config : null;
}

function buildDatabaseConfig(credential: ActiveBilibiliCredential): BilibiliRuntimeConfig | null {
  const decryptedSessdata = decrypt(String(credential.sessdata ?? ''));
  const decryptedBiliJct = decrypt(String(credential.bili_jct ?? ''));
  const decryptedBuvid3 = decrypt(String(credential.buvid3 ?? ''));
  const decryptedBuvid4 = credential.buvid4 ? decrypt(String(credential.buvid4)) : '';

  const config: BilibiliRuntimeConfig = {
    ...buildCommonConfig(),
    sessdata: decryptedSessdata.trim(),
    biliJct: decryptedBiliJct.trim(),
    buvid: decryptedBuvid3.trim(),
    buvid4: decryptedBuvid4.trim(),
    source: 'database',
    credentialId: credential.id,
    credentialName: credential.name,
  };

  return hasRequiredCredentialFields(config) ? config : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function loadBilibiliRuntimeConfig(
  prisma: BilibiliCredentialReader = getPrisma(),
): Promise<BilibiliRuntimeConfig | null> {
  try {
    const credential = await prisma.bilibiliCredential.findFirst({
      where: { is_active: true },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });

    if (credential) {
      const config = buildDatabaseConfig(credential as ActiveBilibiliCredential);
      if (config) {
        return config;
      }

      console.warn(
        `[bilibili] Active credential ${credential.id} is incomplete; falling back to environment variables`,
      );
    }
  } catch (error) {
    console.warn(
      `[bilibili] Failed to load active credential from database; falling back to environment variables: ${getErrorMessage(error)}`,
    );
  }

  return buildEnvironmentConfig();
}

/**
 * Resolve the active persona identifier for antirisk signal attribution (TASK-002).
 *
 * Persona source: the `name` field of the active BilibiliCredential (is_active=true,
 * latest updated_at). A-layer per-persona backoff + C-layer @self detection share this
 * attribution key, so it MUST match the credential.name the @self gate matches against.
 *
 * Reuses the same query as loadBilibiliRuntimeConfig but selects only `name` (lighter row).
 * Returns null when no active credential exists OR the lookup throws — the caller
 * (publisher.ts publishIntentWithResult) treats null as a non-fatal persona attribution
 * gap (logs warn, persists the antirisk signal with persona_id=null) so the tuple-return
 * contract is never broken (L7). This is a foundational accessor, always runs (L8 — the
 * A/C layers consume persona_id downstream; the accessor itself is not feature-flag-gated).
 */
export async function getActivePersonaName(prisma: BilibiliCredentialReader = getPrisma()): Promise<string | null> {
  try {
    const credential = await prisma.bilibiliCredential.findFirst({
      where: { is_active: true },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      select: { name: true },
    });
    return credential?.name ?? null;
  } catch (error) {
    console.warn(
      `[bilibili] getActivePersonaName failed; persona_id will be null for antirisk attribution: ${getErrorMessage(error)}`,
    );
    return null;
  }
}
