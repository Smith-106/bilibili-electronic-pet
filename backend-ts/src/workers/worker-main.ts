/**
 * Worker entry point
 * Runs BullMQ worker to process comment-event jobs
 *
 * Usage: node dist/workers/worker-main.js
 */

import { buildWorkerServices } from '../services/index.js';
import { createCommentEventWorker } from './tasks/comment-event.task.js';

const QUEUE_NAME = 'comment-event';

async function main(): Promise<void> {
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

  // Graceful shutdown
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

    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive
  await new Promise<void>(() => {});
}

main().catch((error) => {
  console.error('[worker] Fatal error:', error);
  process.exit(1);
});
