import { createServer } from './main.js';
import { disconnectPrisma } from './lib/prisma.js';
import { isEncryptionAvailable } from './services/credential-crypto.js';
import { rebuildBackoffFromDb } from './services/backoff-decision.js';

// ── 全局错误防护：防止未捕获异常导致进程静默崩溃 ──
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught exception:', error);
  process.exit(1);
});

// ── 优雅关闭：释放 Prisma 连接 ──
let shuttingDown = false;
async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] Received ${signal}, shutting down gracefully...`);
  try {
    await disconnectPrisma();
    console.log('[server] Prisma disconnected successfully');
  } catch (error) {
    console.error('[server] Error disconnecting Prisma:', error);
  }
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start(): Promise<void> {
  if (!isEncryptionAvailable()) {
    console.error('[boot] CREDENTIAL_ENCRYPTION_KEY not configured');
    process.exit(1);
  }

  const app = createServer();
  const port = Number.parseInt(process.env.PORT ?? '8000', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  // A 层 backoff rebuild (TASK-004, F4): fire-and-forget so a slow/unavailable DB
  // does not block boot. The in-memory backoffMap starts empty and rebuilds
  // asynchronously; a brief window of no-backoff is acceptable because antirisk
  // signals will re-trigger applyBackoff at runtime (L1 risk mitigation).
  void rebuildBackoffFromDb().catch((error) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'backoff_rebuild_at_boot_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
  });

  await app.listen({ port, host });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
