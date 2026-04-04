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

function buildCommonConfig(): Omit<BilibiliRuntimeConfig, 'sessdata' | 'biliJct' | 'buvid' | 'buvid4' | 'source' | 'credentialId' | 'credentialName'> {
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
  const config: BilibiliRuntimeConfig = {
    ...buildCommonConfig(),
    sessdata: decrypt(String(credential.sessdata ?? '')).trim(),
    biliJct: decrypt(String(credential.bili_jct ?? '')).trim(),
    buvid: String(credential.buvid3 ?? '').trim(),
    buvid4: String(credential.buvid4 ?? '').trim(),
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
