/**
 * Worker entry point
 * Runs BullMQ worker to process comment-event jobs
 * + Bilibili polling scheduler (replaces Celery Beat)
 *
 * Usage: node dist/workers/worker-main.js
 */

import { pathToFileURL } from 'node:url';

import { disconnectPrisma } from '../lib/prisma.js';
import { resolvePlatformPollingRuntime } from '../platforms/registry.js';
import { buildWorkerServices } from '../services/index.js';
import { isEncryptionAvailable } from '../services/credential-crypto.js';
import { createCommentEventWorker } from './tasks/comment-event.task.js';

const QUEUE_NAME = 'comment-event';

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
