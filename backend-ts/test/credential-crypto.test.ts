import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { decrypt, encrypt, isEncryptionAvailable } from '../src/services/credential-crypto.js';

const trackedEnvKeys = ['CREDENTIAL_ENCRYPTION_KEY', 'BILIBILI_COOKIE_ENCRYPTION_KEY'] as const;
const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function clearCryptoEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function restoreCryptoEnv(): void {
  clearCryptoEnv();
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    }
  }
}

beforeEach(() => {
  clearCryptoEnv();
});

afterAll(() => {
  restoreCryptoEnv();
});

describe('credential crypto service', () => {
  it('falls back to plaintext when no encryption key is configured', () => {
    expect(isEncryptionAvailable()).toBe(false);
    expect(encrypt('plain-cookie')).toBe('plain-cookie');
    expect(decrypt('plain-cookie')).toBe('plain-cookie');
  });

  it('rejects invalid key lengths and keeps plaintext compatibility', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'abcd';

    expect(isEncryptionAvailable()).toBe(false);
    expect(encrypt('token')).toBe('token');
    expect(decrypt('token')).toBe('token');
  });

  it('treats key decoding errors as encryption unavailable', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const fromSpy = vi.spyOn(Buffer, 'from').mockImplementationOnce(() => {
      throw new Error('decode failed');
    });

    expect(isEncryptionAvailable()).toBe(false);
    expect(fromSpy).toHaveBeenCalled();
  });

  it('encrypts and decrypts with the primary configured key', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const ciphertext = encrypt('sensitive-cookie');

    expect(isEncryptionAvailable()).toBe(true);
    expect(ciphertext).not.toBe('sensitive-cookie');
    expect(Buffer.from(ciphertext, 'base64').length).toBeGreaterThan(28);
    expect(decrypt(ciphertext)).toBe('sensitive-cookie');
  });

  it('uses the legacy fallback environment key when the primary key is absent', () => {
    process.env.BILIBILI_COOKIE_ENCRYPTION_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

    const ciphertext = encrypt('legacy-cookie');

    expect(isEncryptionAvailable()).toBe(true);
    expect(decrypt(ciphertext)).toBe('legacy-cookie');
  });

  it('returns the original ciphertext when decryption fails', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    expect(decrypt('not-valid-base64')).toBe('not-valid-base64');
  });
});
