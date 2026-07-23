import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison (security fix for timing attacks on auth secrets).
 *
 * Node's crypto.timingSafeEqual requires equal-length Buffers (throws on length mismatch).
 * This helper equalizes by comparing the longer of the two after a length check — length
 * inequality short-circuits to false (length timing leakage is negligible vs byte-wise,
 * and secret lengths are typically non-sensitive). Equal-length inputs delegate to
 * timingSafeEqual for constant-time byte comparison.
 *
 * Used for x-api-key / Bearer token / comment-ingress-token auth checks.
 */
export function timingSafeStringCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
