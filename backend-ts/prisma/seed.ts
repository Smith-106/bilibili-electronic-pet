/**
 * Prisma seed script
 * Run: npx prisma db seed
 *
 * Seeds default settings needed for first-time deployment.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('[seed] Starting database seed...');

  // Seed default BilibiliVideo entries are managed by admin API
  // Seed default BilibiliCredential entries are managed by admin API
  // No static seed data required — all configuration is API-driven

  // Verify schema is reachable
  const commentCount = await prisma.comment.count();
  console.log(`[seed] Schema verified. Current comments: ${commentCount}`);
  console.log('[seed] Seed complete. No static data required.');
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
