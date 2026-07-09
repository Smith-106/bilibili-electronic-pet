/**
 * Worker entry point
 * Runs BullMQ worker to process comment-event jobs
 * + Bilibili polling scheduler (replaces Celery Beat)
 *
 * Usage: node dist/workers/worker-main.js
 */

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

import { disconnectPrisma } from '../lib/prisma.js';
import { resolvePlatformPollingRuntime } from '../platforms/registry.js';
import { buildWorkerServices } from '../services/index.js';
import { isEncryptionAvailable } from '../services/credential-crypto.js';
import { createCommentEventWorker } from './tasks/comment-event.task.js';

const QUEUE_NAME = 'comment-event';

// F3: worker healthcheck heartbeat window. /healthz is healthy when the worker is running
// AND a job completed within the last HEALTH_HEARTBEAT_MS ms (or no job has been processed
// yet but the worker is still running — covers idle-but-alive state).
const HEALTH_HEARTBEAT_MS = 30_000;
const HEALTH_PORT = 3100;

export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function parseInteger(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export async function main(): Promise<void> {
  // ── boot guard：凭据加密 key 缺失则拒启动（fail-closed） ──
  if (!isEncryptionAvailable()) {
    console.error('[boot] CREDENTIAL_ENCRYPTION_KEY not configured');
    process.exit(1);
  }

  // ── 全局错误防护：防止未捕获异常导致进程静默崩溃 ──
  process.on('unhandledRejection', (reason) => {
    console.error('[worker] Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('[worker] Uncaught exception:', error);
    // uncaughtException 后进程状态不可靠，安全退出
    process.exit(1);
  });

  console.log('[worker] Starting worker process...');

  const killSwitch = process.env.KILL_SWITCH === 'true';
  const roleProfileDefault = process.env.ROLE_PROFILE_DEFAULT || 'doro';

  const services = buildWorkerServices({
    killSwitch,
    roleProfileDefault,
  });

  // Start the comment-event worker (Redis config handled internally)
  const worker = createCommentEventWorker(QUEUE_NAME, services);
  console.log(`[worker] Comment-event worker started (queue: ${QUEUE_NAME})`);

  // L6/F3: functional healthcheck. Replaces the previous pgrep-based docker healthcheck
  // (which only verified the process existed, not that it was actually processing jobs).
  // /healthz returns 200 when worker.isRunning() AND lastCompletedAt is within
  // HEALTH_HEARTBEAT_MS (or no job has completed yet but worker is running — idle-alive).
  let lastCompletedAt: number | null = null;
  // Reuse task-queue.ts:101 worker event hooks — register additional listeners on the
  // same EventEmitter (BullMQ Worker) to refresh the heartbeat without displacing the
  // existing completed/failed logging handlers.
  worker.on('completed', () => {
    lastCompletedAt = Date.now();
  });
  worker.on('failed', () => {
    // A failed job still proves the worker loop is alive (it picked up and processed a job).
    lastCompletedAt = Date.now();
  });

  const healthServer = createServer((req, res) => {
    if (req.url !== '/healthz') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'not_found' }));
      return;
    }
    const running = typeof worker.isRunning === 'function' ? worker.isRunning() : false;
    const now = Date.now();
    const heartbeatFresh =
      lastCompletedAt === null
        ? running // idle-but-alive: no job yet, but worker loop is running
        : now - lastCompletedAt <= HEALTH_HEARTBEAT_MS;
    const healthy = running && heartbeatFresh;
    const body = {
      ok: healthy,
      worker_running: running,
      last_completed_at: lastCompletedAt,
      heartbeat_ms: HEALTH_HEARTBEAT_MS,
      heartbeat_fresh: heartbeatFresh,
    };
    res.writeHead(healthy ? 200 : 503, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  healthServer.on('error', (error) => {
    console.error('[worker] Health server error:', error);
  });
  console.log(`[worker] Health server listening on :${HEALTH_PORT}/healthz`);
  healthServer.listen(HEALTH_PORT);

  const closeHealthServer = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      healthServer.close(() => resolve());
    });
  };

  // ── Bilibili polling scheduler via platform adapter registry ──
  const bilibiliPollingRuntime = resolvePlatformPollingRuntime('bilibili', process.env);
  const pollEnabled = bilibiliPollingRuntime.enabled;
  const pollIntervalSeconds = bilibiliPollingRuntime.intervalSeconds;

  if (pollEnabled) {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let polling = false;

    const runPoll = async (): Promise<void> => {
      if (polling) {
        console.log('[worker] Bilibili poll already in progress, skipping');
        return;
      }
      polling = true;
      try {
        const { pollAllVideos } = await import('../services/bilibili-poller.js');
        const result = await pollAllVideos();
        console.log(
          `[worker] Bilibili poll completed: ${result.videos} videos, ${result.events_injected} events injected`,
        );
      } catch (error) {
        console.error('[worker] Bilibili poll failed:', error);
      } finally {
        polling = false;
      }
    };

    // Initial delay of 10s to let worker warm up
    const initialDelayMs = 10_000;
    console.log(
      `[worker] Bilibili polling scheduled every ${pollIntervalSeconds}s (initial delay: ${initialDelayMs / 1000}s)`,
    );

    setTimeout(() => {
      // Run first poll immediately after delay
      runPoll();

      // Schedule recurring polls
      pollTimer = setInterval(runPoll, pollIntervalSeconds * 1000);
    }, initialDelayMs);

    // Graceful shutdown
    const originalShutdown = async (signal: string): Promise<void> => {
      if (pollTimer) clearInterval(pollTimer);
      console.log(`[worker] Received ${signal}, shutting down gracefully...`);

      await closeHealthServer();

      try {
        await worker.close();
        console.log('[worker] Worker closed successfully');
      } catch (error) {
        console.error('[worker] Error closing worker:', error);
      }

      try {
        await disconnectPrisma();
        console.log('[worker] Prisma disconnected successfully');
      } catch (error) {
        console.error('[worker] Error disconnecting Prisma:', error);
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => originalShutdown('SIGTERM'));
    process.on('SIGINT', () => originalShutdown('SIGINT'));
  } else {
    console.log('[worker] Bilibili polling disabled (BILIBILI_POLL_ENABLED not set)');

    // Graceful shutdown without polling
    let shuttingDown = false;

    async function shutdown(signal: string): Promise<void> {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[worker] Received ${signal}, shutting down gracefully...`);

      await closeHealthServer();

      try {
        await worker.close();
        console.log('[worker] Worker closed successfully');
      } catch (error) {
        console.error('[worker] Error closing worker:', error);
      }

      try {
        await disconnectPrisma();
        console.log('[worker] Prisma disconnected successfully');
      } catch (error) {
        console.error('[worker] Error disconnecting Prisma:', error);
      }

      process.exit(0);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  // Keep process alive
  await new Promise<void>(() => {});
}

const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error('[worker] Fatal error:', error);
    process.exit(1);
  });
}
