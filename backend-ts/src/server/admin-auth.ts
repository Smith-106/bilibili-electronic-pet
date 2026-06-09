import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { RuntimeSettings } from './contracts.js';

const ADMIN_SESSION_VERSION = 'admin-session-v1';
const DEFAULT_ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const MAX_ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type AdminSessionPayload = {
  v: string;
  scope: 'admin';
  iat: number;
  exp: number;
  nonce: string;
};

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string | null {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function buildSignature(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload, 'utf8').digest();
}

function normalizeTtlSeconds(settings: RuntimeSettings): number {
  const raw = settings.adminSessionTtlSeconds;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_ADMIN_SESSION_TTL_SECONDS;
  }
  return Math.min(Math.max(60, Math.trunc(raw)), MAX_ADMIN_SESSION_TTL_SECONDS);
}

export function resolveAdminSessionSecret(settings: RuntimeSettings): string | null {
  const explicitSecret = String(settings.adminSessionSecret ?? '').trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  const apiKey = String(settings.apiKey ?? '').trim();
  return apiKey || null;
}

export function issueAdminSession(settings: RuntimeSettings, now = Date.now()): { token: string; expiresAt: string } | null {
  const secret = resolveAdminSessionSecret(settings);
  if (!secret) {
    return null;
  }

  const ttlSeconds = normalizeTtlSeconds(settings);
  const payload: AdminSessionPayload = {
    v: ADMIN_SESSION_VERSION,
    scope: 'admin',
    iat: now,
    exp: now + ttlSeconds * 1000,
    nonce: randomUUID(),
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const encodedSignature = buildSignature(encodedPayload, secret).toString('base64url');

  return {
    token: `${encodedPayload}.${encodedSignature}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export function verifyAdminSessionToken(token: string, settings: RuntimeSettings, now = Date.now()): boolean {
  const secret = resolveAdminSessionSecret(settings);
  if (!secret) {
    return false;
  }

  const normalizedToken = String(token ?? '').trim();
  if (!normalizedToken) {
    return false;
  }

  const separatorIndex = normalizedToken.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex === normalizedToken.length - 1) {
    return false;
  }

  const encodedPayload = normalizedToken.slice(0, separatorIndex);
  const encodedSignature = normalizedToken.slice(separatorIndex + 1);
  const decodedPayload = decodeBase64Url(encodedPayload);
  if (!decodedPayload) {
    return false;
  }

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(decodedPayload) as AdminSessionPayload;
  } catch {
    return false;
  }

  if (
    payload.v !== ADMIN_SESSION_VERSION
    || payload.scope !== 'admin'
    || typeof payload.exp !== 'number'
    || !Number.isFinite(payload.exp)
    || payload.exp <= now
  ) {
    return false;
  }

  const expectedSignature = buildSignature(encodedPayload, secret);
  const actualSignature = Buffer.from(encodedSignature, 'base64url');

  if (expectedSignature.length !== actualSignature.length) {
    return false;
  }

  return timingSafeEqual(expectedSignature, actualSignature);
}
