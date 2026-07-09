import { createServer } from './main.js';
import { disconnectPrisma } from './lib/prisma.js';
import { isEncryptionAvailable } from './services/credential-crypto.js';

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

  await app.listen({ port, host });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
