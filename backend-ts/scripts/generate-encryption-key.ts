#!/usr/bin/env tsx
/**
 * Generate a 32-byte (256-bit) AES key as hex for CREDENTIAL_ENCRYPTION_KEY.
 *
 * Usage:
 *   npx tsx scripts/generate-encryption-key.ts
 *
 * Then set the output as the CREDENTIAL_ENCRYPTION_KEY environment variable
 * for both api and worker services (see docker-compose.yml / .env).
 */

import { randomBytes } from 'node:crypto';

const key = randomBytes(32).toString('hex');
console.log(key);
