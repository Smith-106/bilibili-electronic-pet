/**
 * Credential encryption/decryption service
 * Migrated from Python: app/services/platforms/bilibili.py (CredentialEncryption)
 *
 * Uses AES-256-GCM for encrypting sensitive Bilibili credentials before
 * database storage. Falls back to plaintext when no encryption key is configured.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const keyHex =
    process.env.CREDENTIAL_ENCRYPTION_KEY?.trim() || process.env.BILIBILI_COOKIE_ENCRYPTION_KEY?.trim();
  if (!keyHex) return null;
  try {
    const buf = Buffer.from(keyHex, 'hex');
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

export function isEncryptionAvailable(): boolean {
  return getEncryptionKey() !== null;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext; // Fallback: store plaintext when no key configured

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  if (!key) return ciphertext; // Fallback: return as-is when no key configured

  try {
    const raw = Buffer.from(ciphertext, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    // If decryption fails, assume it's plaintext (migration from unencrypted)
    return ciphertext;
  }
}
