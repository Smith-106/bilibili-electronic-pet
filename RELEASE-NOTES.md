# Release Notes

## Breaking Change — Credential Encryption Fail-Closed (2026-07-09)

### Summary

Bilibili credential encryption (`credential-crypto.ts`) switched from
fail-open (plaintext fallback) to **fail-closed**. The backend now refuses
to boot when `CREDENTIAL_ENCRYPTION_KEY` is not configured, and `buvid3` /
`buvid4` are now encrypted at rest alongside `sessdata` / `bili_jct`.

This is a **breaking change** (破坏性变更). Existing deployments that rely
on the plaintext fallback will fail to start until a key is provided.

### Why

Storing Bilibili cookies (sessdata / bili_jct / buvid3 / buvid4) in plaintext
is an operator-safety short board. The fail-open fallback silently degraded
to plaintext when the key was missing, which is the opposite of fail-closed
discipline. This change closes that gap and aligns with the antirisk baseline
(grill C-006 / L7).

### Migration Steps (明文迁移路径)

1. **Generate a 32-byte hex key**:
   ```bash
   cd backend-ts
   npx tsx scripts/generate-encryption-key.ts
   ```
   Output is a 64-character hex string.

2. **Set the environment variable** for both `api` and `worker` services:
   ```bash
   export CREDENTIAL_ENCRYPTION_KEY=<the-generated-key>
   ```
   Or add it to your `.env` / `docker-compose.yml` env source. The updated
   `docker-compose.yml` uses `${CREDENTIAL_ENCRYPTION_KEY:?...}` required
   syntax — Compose will refuse to start if the variable is unset.

3. **Restart the backend**. The boot guard calls `isEncryptionAvailable()`;
   if the key is missing or invalid the process exits with code 1 and logs
   `[boot] CREDENTIAL_ENCRYPTION_KEY not configured`.

4. **Re-enter existing plaintext credentials**. Any Bilibili credential rows
   stored as plaintext (pre-migration) must be re-saved via the admin
   credential endpoint so they are encrypted with the new key. Decryption of
   a plaintext row will throw under fail-closed; the runtime falls back to
   environment variables in that case, but re-entering is required for the
   database credential to be usable.

### What Changed

- `backend-ts/src/services/credential-crypto.ts`: `encrypt` / `decrypt`
  throw `Error('CREDENTIAL_ENCRYPTION_KEY not configured ...')` when no key
  is configured. `decrypt` signature changed from `string | null` to
  `string` (throws on auth-failure instead of returning null).
- `backend-ts/src/index.ts` + `backend-ts/src/workers/worker-main.ts`: boot
  guard `if (!isEncryptionAvailable()) { console.error(...);
  process.exit(1); }` at the start of the entry function.
- `backend-ts/src/routes/bilibili-admin.ts`: `buvid3` / `buvid4` are now
  passed through `encrypt()` on create.
- `backend-ts/src/services/bilibili-runtime-config.ts`: `buvid3` / `buvid4`
  read paths now call `decrypt()` to match the encrypted write path.
- `docker-compose.yml`: `CREDENTIAL_ENCRYPTION_KEY` uses `:?` required
  syntax (no more `:-` empty default).
- `backend-ts/scripts/generate-encryption-key.ts`: new key generation
  script.
