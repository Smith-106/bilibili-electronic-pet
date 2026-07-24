/**
 * DuplicateKeyError — surfaced when a Prisma create violates a @unique constraint (P2002).
 *
 * admin create paths (memorySpace.space_key / roleCard.key / bilibiliVideo.bvid) must inform
 * the operator that a duplicate was submitted (409 conflict), distinct from the publisher's
 * catch-as-duplicate-success (idempotent publish). The default* wrappers in main.ts catch
 * P2002 and rethrow this typed error; admin route handlers map it to 409 { detail: 'duplicate' }.
 *
 * Pattern mirrors services/publisher.ts safeCreatePublishLog P2002 detection:
 *   const code = (error as { code?: unknown })?.code;
 *   if (code === 'P2002') { ... }
 */
export class DuplicateKeyError extends Error {
  constructor(message = 'duplicate_key') {
    super(message);
    this.name = 'DuplicateKeyError';
  }
}

/**
 * Detects a Prisma P2002 unique-constraint violation on an arbitrary thrown value.
 * Prisma's PrismaClientKnownRequestError exposes `code: 'P2002'`; plain Errors do not.
 */
export function isPrismaP2002(error: unknown): boolean {
  return (error as { code?: unknown })?.code === 'P2002';
}
