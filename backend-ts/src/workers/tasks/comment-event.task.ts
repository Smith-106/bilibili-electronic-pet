/**
 * Comment event processor task
 *
 * Migrated from Python: app/workers/jobs.py::process_comment_event_task
 */

import { Job } from 'bullmq';
import { BaseTaskPayload, createTaskQueue, createTaskWorker } from '../task-queue.js';
import { NonRetryableWorkerError } from '../errors.js';
import type { WorkerServices } from '../../services/interfaces.js';
import type { KnowledgeEntry, RoleCardValue } from '../../models/entities.js';

/**
 * Comment event payload structure
 */
export type CommentEventPayload = BaseTaskPayload & {
  comment_id: string;
  video_id?: string;
  user_id?: string;
  content?: string;
  parent_id?: string;
  platform?: string;
  source: string;
  force_long?: boolean;
  style_profile?: string;
  role_profile?: string;
  role_card_key?: string;
};

/**
 * Create comment event queue
 */
export function createCommentEventQueue(queueName = 'comment-event') {
  return createTaskQueue<CommentEventPayload>(queueName);
}

/**
 * Create comment event worker with full processing logic
 */
export function createCommentEventWorker(queueName: string, services: WorkerServices) {
  return createTaskWorker<CommentEventPayload>(
    queueName,
    async (job: Job<CommentEventPayload>) => {
      const startedAt = Date.now();
      const traceId = services.ensureTraceId(job.data.trace_id);

      const finishObservability = (
        status: string,
        options?: { jobId?: number; metadata?: Record<string, unknown> },
      ) => {
        const durationMs = Math.max(0, Date.now() - startedAt);
        services.recordObservabilityEvent({
          event_type: 'job_finished',
          trace_id: traceId,
          comment_id: job.data.comment_id,
          job_id: options?.jobId,
          status,
          duration_ms: durationMs,
          metadata: options?.metadata,
        });
      };

      // Kill-switch check
      if (services.killSwitch) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: 'worker_kill_switch_enabled',
            trace_id: traceId,
            comment_id: job.data.comment_id,
            status: 'kill_switch_enabled',
          }),
        );
        finishObservability('kill_switch_enabled');
        return { ok: false, reason: 'kill_switch_enabled', trace_id: traceId };
      }

      // Validate payload
      if (!job.data.comment_id) {
        throw new NonRetryableWorkerError('comment_id_missing');
      }

      const platform = (job.data.platform || 'bilibili').toLowerCase() || 'bilibili';
      const canonicalCommentId = `${platform}:${job.data.comment_id}`;

      // Query comment
      const comment = await services.getCommentByCanonicalId(canonicalCommentId);
      if (!comment) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: 'worker_comment_not_found',
            trace_id: traceId,
            comment_id: job.data.comment_id,
            status: 'comment_not_found',
          }),
        );
        finishObservability('comment_not_found');
        return { ok: false, reason: 'comment_not_found', trace_id: traceId };
      }

      console.info(
        JSON.stringify({
          level: 'info',
          message: 'worker_process_started',
          trace_id: traceId,
          comment_id: comment.comment_id,
          status: 'processing',
        }),
      );

      services.recordObservabilityEvent({
        event_type: 'job_started',
        trace_id: traceId,
        comment_id: comment.comment_id,
        status: 'processing',
        metadata: { force_long: job.data.force_long || false },
      });

      // Should reply decision
      const [should, styleMode, lengthMode] = await services.shouldReply({
        comment_id: comment.comment_id,
        video_id: comment.video_id,
        user_id: comment.user_id,
        content: comment.content || undefined,
        parent_id: comment.parent_id || undefined,
        platform,
        trace_id: traceId,
        force_long: job.data.force_long,
        style_profile: job.data.style_profile,
        role_profile: job.data.role_profile,
        role_card_key: job.data.role_card_key,
      });

      if (!should) {
        const jobId = await services.createReplyJob({
          comment_id: comment.comment_id,
          canonical_comment_id: comment.canonical_comment_id,
          status: 'skipped',
          style_mode: styleMode,
          length_mode: lengthMode,
          reply_text: null,
          risk_flags: {},
          attempts: 0,
          published_at: null,
        });

        console.info(
          JSON.stringify({
            level: 'info',
            message: 'worker_job_finished',
            trace_id: traceId,
            comment_id: comment.comment_id,
            job_id: jobId,
            status: 'skipped',
            style_mode: styleMode,
            length_mode: lengthMode,
          }),
        );

        finishObservability('skipped', {
          jobId,
          metadata: { style_mode: styleMode, length_mode: lengthMode },
        });

        return { ok: true, status: 'skipped', trace_id: traceId };
      }

      // Knowledge search
      let knowledgeEntries: Array<Partial<KnowledgeEntry>> = [];
      let knowledgeContext = '';
      let knowledgeError: string | null = null;
      try {
        knowledgeEntries = await services.searchKnowledge(comment.content || '');
        knowledgeContext = services.buildKnowledgeContext(knowledgeEntries);
      } catch (exc) {
        knowledgeEntries = [];
        knowledgeContext = '';
        knowledgeError = `${(exc as Error).constructor.name}: ${(exc as Error).message}`;
      }

      // Web search
      let searchItems: Array<{ source: string }> = [];
      let searchContext = '';
      let searchError: string | null = null;
      try {
        const searchResult = await services.searchWeb(comment.content || '');
        searchItems = searchResult.items;
        searchContext = services.buildSearchContext(searchItems);
        if (searchResult.error_type) {
          searchError = `${searchResult.error_type}: ${searchResult.error_message || ''}`.trim();
        }
      } catch (exc) {
        searchItems = [];
        searchContext = '';
        searchError = `${(exc as Error).constructor.name}: ${(exc as Error).message}`;
      }

      // Role card resolution
      let explicitRoleCard:
        | {
            key: string;
            enabled: boolean;
            system_prompt: string;
            tone: RoleCardValue;
            constraints: RoleCardValue;
          }
        | undefined;
      if (job.data.role_card_key) {
        const card = await services.getRoleCardByKey(job.data.role_card_key);
        if (card && card.enabled) {
          explicitRoleCard = {
            key: card.key,
            enabled: card.enabled,
            system_prompt: card.system_prompt,
            tone: card.tone,
            constraints: card.constraints,
          };
        }
      }

      let activeRoleCard:
        | {
            key: string;
            enabled: boolean;
            system_prompt: string;
            tone: RoleCardValue;
            constraints: RoleCardValue;
          }
        | undefined;
      const active = await services.getActiveRoleCard();
      if (active && active.enabled) {
        activeRoleCard = {
          key: active.key,
          enabled: active.enabled,
          system_prompt: active.system_prompt,
          tone: active.tone,
          constraints: active.constraints,
        };
      }

      // Generate reply
      const generation = await services.generateReplyWithMeta({
        content: comment.content || '',
        style_mode: styleMode,
        length_mode: lengthMode,
        knowledge_context: knowledgeContext,
        search_context: searchContext,
        role_profile:
          job.data.role_profile && job.data.role_profile !== 'auto'
            ? job.data.role_profile
            : services.roleProfileDefault,
        role_card: explicitRoleCard,
        active_role_card: activeRoleCard,
      });

      const replyText = generation.reply_text;
      const generationFlags: Record<string, unknown> = {
        llm_provider: generation.provider,
        llm_fallback: generation.used_fallback,
        knowledge_hit: knowledgeEntries.length > 0,
        knowledge_categories: knowledgeEntries.map((e) => e.category),
        search_hit: searchItems.length > 0,
        search_sources: searchItems.map((i) => i.source),
        role_profile: generation.resolved_role_profile,
        role_card_key: generation.resolved_role_card_key,
      };
      if (knowledgeError) {
        generationFlags.knowledge_error = knowledgeError;
      }
      if (searchError) {
        generationFlags.search_error = searchError;
      }
      if (generation.error_type) {
        generationFlags.llm_error_type = generation.error_type;
      }
      if (generation.error_message) {
        generationFlags.llm_error_message = generation.error_message;
      }

      // Deduplication check
      if (comment.user_id && (await services.isRecentDuplicate(comment.user_id, replyText))) {
        const jobId = await services.createReplyJob({
          comment_id: comment.comment_id,
          canonical_comment_id: comment.canonical_comment_id,
          status: 'dedupe_skipped',
          style_mode: styleMode,
          length_mode: lengthMode,
          reply_text: replyText,
          risk_flags: { ...generationFlags, reason: 'recent_phrase_duplicate' },
          attempts: 1,
          published_at: null,
        });

        console.info(
          JSON.stringify({
            level: 'info',
            message: 'worker_job_finished',
            trace_id: traceId,
            comment_id: comment.comment_id,
            job_id: jobId,
            status: 'dedupe_skipped',
            style_mode: styleMode,
            length_mode: lengthMode,
          }),
        );

        finishObservability('dedupe_skipped', {
          jobId,
          metadata: {
            style_mode: styleMode,
            length_mode: lengthMode,
            reason: 'recent_phrase_duplicate',
          },
        });

        return { ok: true, status: 'dedupe_skipped', trace_id: traceId };
      }

      // Safety check
      const [safe, riskFlags] = await services.safetyCheck(replyText);
      const safetyAction = services.decideSafetyAction(safe, riskFlags);

      if (safetyAction === 'blocked' || safetyAction === 'manual_queue') {
        const jobId = await services.createReplyJob({
          comment_id: comment.comment_id,
          canonical_comment_id: comment.canonical_comment_id,
          status: safetyAction,
          style_mode: styleMode,
          length_mode: lengthMode,
          reply_text: replyText,
          risk_flags: { ...generationFlags, ...riskFlags },
          attempts: 1,
          published_at: null,
        });

        console.info(
          JSON.stringify({
            level: 'info',
            message: 'worker_job_finished',
            trace_id: traceId,
            comment_id: comment.comment_id,
            job_id: jobId,
            status: safetyAction,
            style_mode: styleMode,
            length_mode: lengthMode,
          }),
        );

        finishObservability(safetyAction, {
          jobId,
          metadata: {
            style_mode: styleMode,
            length_mode: lengthMode,
            decision: (riskFlags as Record<string, unknown>).decision,
          },
        });

        return {
          ok: true,
          status: safetyAction,
          risk_flags: riskFlags,
          trace_id: traceId,
        };
      }

      // Publish reply
      const [published, publishReason, publishedAt, publishResult] = await services.publishReplyWithResult(
        comment.comment_id,
        replyText,
        traceId,
      );

      const publishMetadata: Record<string, unknown> = { reason: publishReason };
      let newRpidValue: string | number | null = null;
      if (publishResult && typeof publishResult === 'object') {
        const newRpidCandidate = (publishResult as Record<string, unknown>).new_rpid;
        if (publishReason !== 'idempotent_replay') {
          newRpidValue = newRpidCandidate as string | number | null;
        }
      }
      if (newRpidValue !== null && newRpidValue !== undefined) {
        publishMetadata.new_rpid = newRpidValue;
      }

      services.recordObservabilityEvent({
        event_type: 'publish_result',
        trace_id: traceId,
        comment_id: comment.comment_id,
        status: published ? 'published' : 'failed',
        metadata: publishMetadata,
      });

      const status = published ? 'published' : 'manual_queue';
      const jobRiskFlags: Record<string, unknown> = {
        ...generationFlags,
        publish_reason: publishReason,
        gateway_reason: publishReason,
        gateway_duplicate: publishReason === 'idempotent_replay',
      };
      if (newRpidValue !== null && newRpidValue !== undefined) {
        jobRiskFlags.new_rpid = newRpidValue;
      }

      const jobId = await services.createReplyJob({
        comment_id: comment.comment_id,
        canonical_comment_id: comment.canonical_comment_id,
        status,
        style_mode: styleMode,
        length_mode: lengthMode,
        reply_text: replyText,
        risk_flags: jobRiskFlags,
        attempts: 1,
        published_at: publishedAt,
      });

      console.info(
        JSON.stringify({
          level: 'info',
          message: 'worker_job_finished',
          trace_id: traceId,
          comment_id: comment.comment_id,
          job_id: jobId,
          status,
          style_mode: styleMode,
          length_mode: lengthMode,
          publish_reason: publishReason,
        }),
      );

      finishObservability(status, {
        jobId,
        metadata: { style_mode: styleMode, length_mode: lengthMode, publish_reason: publishReason },
      });

      // Remember phrase if published
      if (published && comment.user_id) {
        await services.rememberReplyPhrase(comment.user_id, replyText);
      }

      return {
        ok: true,
        status,
        published_at: publishedAt?.toISOString() || null,
        trace_id: traceId,
      };
    },
    {
      maxRetries: 3,
      retryBackoff: 2,
      retryJitter: true,
      enabled: false,
    },
  );
}
