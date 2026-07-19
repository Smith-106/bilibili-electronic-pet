/**
 * Comment event processor task
 *
 * Migrated from Python: app/workers/jobs.py::process_comment_event_task
 */

import { Job } from 'bullmq';
import { upsertCompanionFeedItem } from '../../app/memory/companion-feed.js';
import { BaseTaskPayload, createTaskQueue, createTaskWorker } from '../task-queue.js';
import { NonRetryableWorkerError, RetryableWorkerError } from '../errors.js';
import { checkPersonaRateLimit, resolvePersonaIdForRateLimit } from '../../services/persona-token-bucket.js';
import type { WorkerServices } from '../../services/interfaces.js';
import type { MemoryContext } from '../../app/memory/types.js';
import type { KnowledgeEntry, RoleCardValue } from '../../models/entities.js';
import type { InteractionEvent } from '../../domain/interaction/types.js';
import type { PublishIntent } from '../../domain/publish/types.js';

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
  interaction?: InteractionEvent;
  /** Active persona name (BilibiliCredential.name, TASK-002); attached by comment-ingest. */
  persona_id?: string;
  /**
   * D3 memory space id (TASK-004 G4). Optional — when present, comment-event.task recalls
   * top-K MemoryItem from this space and injects as memory_context into GenerateReplyService.
   * When absent, recall is skipped (byte-for-byte single-turn behavior, backward-compat).
   * Per-pet isolation (C-009): each pet maps to its own memory_space_id; caller resolves it.
   */
  memory_space_id?: number;
};

function buildInteractionEventFromPayload(payload: CommentEventPayload): InteractionEvent {
  if (payload.interaction) {
    return payload.interaction;
  }

  const platform = (payload.platform || 'bilibili').trim().toLowerCase() || 'bilibili';

  return {
    platform,
    ingressSource: payload.source,
    traceId: payload.trace_id,
    actor: payload.user_id ? { platformUserId: payload.user_id } : undefined,
    reference: {
      subjectKind: 'comment',
      externalId: payload.comment_id,
      canonicalId: `${platform}:${payload.comment_id}`,
      containerId: payload.video_id,
      parentExternalId: payload.parent_id,
    },
    content: {
      text: payload.content,
    },
    legacyComment: {
      commentId: payload.comment_id,
      videoId: payload.video_id,
      parentId: payload.parent_id,
    },
  };
}

function buildPublishIntent(input: {
  interaction: InteractionEvent;
  replyText: string;
  traceId: string;
  source?: string;
}): PublishIntent {
  const routeMetadata =
    input.interaction.platform === 'qq'
      ? {
          chat_type: input.interaction.reference.containerId ? 'group' : 'private',
          ...(input.interaction.actor?.platformUserId ? { user_id: input.interaction.actor.platformUserId } : {}),
        }
      : undefined;

  return {
    traceId: input.traceId,
    source: input.source ?? 'comment-event-worker',
    target: {
      platform: input.interaction.platform,
      targetKind: 'comment-reply',
      externalId: input.interaction.reference.externalId,
      canonicalId: input.interaction.reference.canonicalId,
      route: {
        containerId: input.interaction.reference.containerId,
        parentExternalId: input.interaction.reference.parentExternalId,
        metadata: routeMetadata,
      },
    },
    payload: {
      text: input.replyText,
    },
  };
}

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

      const recordCompanionSignal = async (
        itemKey: string,
        content: string,
        metadata: Record<string, unknown>,
      ): Promise<void> => {
        try {
          await upsertCompanionFeedItem({
            itemKey,
            content,
            source: 'worker',
            metadata: {
              trace_id: traceId,
              comment_id: job.data.comment_id,
              ...metadata,
            },
          });
        } catch (error) {
          console.warn(
            JSON.stringify({
              level: 'warn',
              message: 'worker_companion_signal_failed',
              trace_id: traceId,
              comment_id: job.data.comment_id,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
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

      const interaction = buildInteractionEventFromPayload(job.data);
      const platform = interaction.platform;
      const canonicalCommentId = interaction.reference.canonicalId;

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
      const [should, styleMode, lengthMode] = await services.shouldReplyForInteraction({
        interaction: {
          ...interaction,
          actor:
            comment.user_id && !interaction.actor?.platformUserId
              ? { platformUserId: comment.user_id }
              : interaction.actor,
          content: {
            text: comment.content || interaction.content.text,
          },
          legacyComment: {
            commentId: comment.comment_id,
            videoId: comment.video_id || undefined,
            parentId: comment.parent_id || undefined,
          },
        },
        forceLong: job.data.force_long,
        styleProfile: job.data.style_profile,
        roleProfile: job.data.role_profile,
        roleCardKey: job.data.role_card_key,
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

        await recordCompanionSignal(
          'signal:job-skipped',
          `Skipped reply generation for comment ${comment.comment_id} because shouldReply returned false.`,
          {
            job_id: jobId,
            status: 'skipped',
            platform,
          },
        );

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

      // D3 会话记忆召回 (TASK-004 G4): recall top-K MemoryItem from memory_space_id (per-pet isolation, C-009).
      // memory_space_id optional — absent → skip recall (single-turn backward-compat).
      // DB 故障 fail-open (返空 memory_context + log), 不静默吞 — 复用 knowledge/search 的 try-catch + error 记录 pattern.
      let memoryContext: MemoryContext | undefined;
      let memoryRecallError: string | null = null;
      if (typeof job.data.memory_space_id === 'number') {
        try {
          memoryContext = await services.recallMemory(job.data.memory_space_id);
        } catch (exc) {
          memoryContext = undefined;
          memoryRecallError = `${(exc as Error).constructor.name}: ${(exc as Error).message}`;
        }
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
        memory_context: memoryContext,
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
        memory_hit: (memoryContext?.items.length ?? 0) > 0,
        memory_recall_count: memoryContext?.items.length ?? 0,
        role_profile: generation.resolved_role_profile,
        role_card_key: generation.resolved_role_card_key,
      };
      if (knowledgeError) {
        generationFlags.knowledge_error = knowledgeError;
      }
      if (searchError) {
        generationFlags.search_error = searchError;
      }
      if (memoryRecallError) {
        generationFlags.memory_recall_error = memoryRecallError;
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

        await recordCompanionSignal(
          'signal:dedupe-latest',
          `Deduped reply for comment ${comment.comment_id}; recent phrase matched an existing user reply.`,
          {
            job_id: jobId,
            status: 'dedupe_skipped',
            platform,
          },
        );

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

        await recordCompanionSignal(
          `signal:${safetyAction}-latest`,
          `Moved comment ${comment.comment_id} into ${safetyAction} after safety review.`,
          {
            job_id: jobId,
            status: safetyAction,
            platform,
            decision: (riskFlags as Record<string, unknown>).decision,
          },
        );

        // L10 reject classification:
        //  - safetyAction === 'blocked' (keyword/PII violation, safety.ts:257 guard) → HARD REJECT.
        //    Returns {ok:false, status:'hard_reject'} WITHOUT throwing → BullMQ marks the job
        //    completed → NO retry. This is intentional: hard rejects must not stack BullMQ
        //    exponential backoff on top of content that will never pass safety review.
        //  - safetyAction === 'manual_queue' (medium-risk, human review) → soft path, no retry
        //    (kept as {ok:true, status:'manual_queue'} so the operator can curate the queue).
        if (safetyAction === 'blocked') {
          return {
            ok: false,
            status: 'hard_reject',
            risk_flags: riskFlags,
            trace_id: traceId,
          };
        }

        return {
          ok: true,
          status: safetyAction,
          risk_flags: riskFlags,
          trace_id: traceId,
        };
      }

      // C-layer per-persona rate limit (TASK-006, F2 token bucket capacity=20 / refill 20/min).
      // Stacks on top of the BullMQ global limiter (task-queue.ts:67 max=100/min) — the
      // per-persona bucket is STRICTER, so one persona cannot exhaust the global budget.
      // L10 retryable vs hard-reject distinction:
      //  - rate_limited → throw RetryableWorkerError('rate_limited_retryable') → BullMQ retries
      //    with exponential backoff (RETRYABLE path — transient throttle, safe to retry later).
      //  - hard_reject (safetyAction==='blocked' above) → returns without throwing → NO retry.
      // persona_id source: queuePayload.persona_id (TASK-002, set by comment-ingest:153) with
      // fail-safe fallback to getActivePersonaName() (resolvePersonaIdForRateLimit). A null
      // persona never rate-limits (fail-open, L7 tuple contract intact).
      const rateLimitPersonaId = await resolvePersonaIdForRateLimit(job.data.persona_id);
      const rateLimitDecision = checkPersonaRateLimit(rateLimitPersonaId);
      if (!rateLimitDecision.allowed) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: 'worker_persona_rate_limited',
            trace_id: traceId,
            comment_id: comment.comment_id,
            persona_id: rateLimitPersonaId,
            reason: rateLimitDecision.reason,
            status: 'rate_limited_retryable',
          }),
        );

        finishObservability('rate_limited_retryable', {
          metadata: {
            persona_id: rateLimitPersonaId,
            reason: rateLimitDecision.reason,
          },
        });

        throw new RetryableWorkerError('rate_limited_retryable');
      }

      // Publish reply
      const [published, publishReason, publishedAt, publishResult] = await services.publishIntentWithResult(
        buildPublishIntent({
          interaction,
          replyText,
          traceId,
        }),
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

      await recordCompanionSignal(
        published ? 'signal:publish-latest' : 'signal:manual-queue-latest',
        published
          ? `Published reply for comment ${comment.comment_id} with reason ${publishReason}.`
          : `Publish attempt for comment ${comment.comment_id} fell back to manual_queue with reason ${publishReason}.`,
        {
          job_id: jobId,
          status,
          platform,
          publish_reason: publishReason,
        },
      );

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
      killSwitch: false,
    },
  );
}
