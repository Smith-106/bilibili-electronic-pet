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
  it('throws when encrypt is called without an encryption key (fail-closed)', () => {
    expect(isEncryptionAvailable()).toBe(false);
    expect(() => encrypt('plain-cookie')).toThrowError(/CREDENTIAL_ENCRYPTION_KEY not configured/);
  });

  it('throws when decrypt is called without an encryption key (fail-closed)', () => {
    expect(isEncryptionAvailable()).toBe(false);
    expect(() => decrypt('plain-cookie')).toThrowError(/CREDENTIAL_ENCRYPTION_KEY not configured/);
  });

  it('rejects invalid key lengths and stays fail-closed', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'abcd';

    expect(isEncryptionAvailable()).toBe(false);
    expect(() => encrypt('token')).toThrowError(/CREDENTIAL_ENCRYPTION_KEY not configured/);
    expect(() => decrypt('token')).toThrowError(/CREDENTIAL_ENCRYPTION_KEY not configured/);
  });

  it('treats key decoding errors as encryption unavailable', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const fromSpy = vi.spyOn(Buffer, 'from').mockImplementation(() => {
      throw new Error('decode failed');
    });

    expect(isEncryptionAvailable()).toBe(false);
    expect(fromSpy).toHaveBeenCalled();
    expect(() => encrypt('token')).toThrowError(/CREDENTIAL_ENCRYPTION_KEY not configured/);

    fromSpy.mockRestore();
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

  it('throws when decryption fails (tampered or invalid ciphertext) instead of returning null', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    expect(() => decrypt('not-valid-base64')).toThrowError();
  });
});
