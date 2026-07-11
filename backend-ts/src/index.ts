import { createServer } from './main.js';
import { disconnectPrisma } from './lib/prisma.js';
import { isEncryptionAvailable } from './services/credential-crypto.js';
import { rebuildBackoffFromDb } from './services/backoff-decision.js';
import { probeBilibiliAuthScheduler } from './services/probe-scheduler.js';

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

  // BUG-001 (readiness contract): the API server process serves /readiness, but
  // isAuthProbeHealthy() reads in-process module state (authProbeUnhealthy in
  // probe-scheduler.ts). Without scheduling the probe here, the API server's copy of that
  // state stays at its default (false → healthy) forever, so the auth_probe_healthy
  // readiness gate is permanently green on port 8000 even when the account is logged out.
  // Schedule probeBilibiliAuthScheduler in the API server too (mirrors worker-main.ts) so
  // each process maintains its own probe state. unref() keeps the timer from holding the
  // event loop open on its own.
  const probeIntervalRaw = Number.parseInt(process.env.PROBE_AUTH_INTERVAL_SECONDS || '3600', 10);
  const probeIntervalSeconds = Number.isFinite(probeIntervalRaw) && probeIntervalRaw > 0 ? probeIntervalRaw : 3600;
  const probeTimer = setInterval(() => {
    void probeBilibiliAuthScheduler().catch((error) => {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'probe_scheduler_failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }),
      );
    });
  }, probeIntervalSeconds * 1000);
  probeTimer.unref();

  await app.listen({ port, host });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
