/**
 * Comment event processor task — worker wiring.
 *
 * Migrated from Python: app/workers/jobs.py::process_comment_event_task
 *
 * Module layout (extracted for single-responsibility, no behavior change):
 * - comment-event-task-helpers.ts: CommentEventPayload + interaction/publish-intent builders
 *   + createCommentEventQueue factory
 * - comment-event-processor.ts:    processCommentEventJob (the worker's processJob body)
 * This file owns createCommentEventWorker and re-exports the public symbols.
 */

import { Job } from 'bullmq';
import { createTaskWorker } from '../task-queue.js';
import type { WorkerServices } from '../../services/interfaces.js';
import { processCommentEventJob } from './comment-event-processor.js';
import {
  createCommentEventQueue,
  type CommentEventPayload,
} from './comment-event-task-helpers.js';

// ── Public re-exports (backward compatibility) ─────────────
export { createCommentEventQueue, type CommentEventPayload };
export { buildInteractionEventFromPayload, buildPublishIntent } from './comment-event-task-helpers.js';
export { processCommentEventJob } from './comment-event-processor.js';

/**
 * Create comment event worker with full processing logic
 */
export function createCommentEventWorker(queueName: string, services: WorkerServices) {
  return createTaskWorker<CommentEventPayload>(
    queueName,
    async (job: Job<CommentEventPayload>) => processCommentEventJob(job, services),
    {
      maxRetries: 3,
      retryBackoff: 2,
      retryJitter: true,
      killSwitch: false,
    },
  );
}
