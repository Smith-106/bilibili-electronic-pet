/**
 * Worker services factory
 * Aggregates all services needed for worker task processors
 */

import type { WorkerServices } from './interfaces.js';
import * as observability from './observability.js';
import * as decider from './decider.js';
import * as safety from './safety.js';
import * as knowledge from './knowledge.js';
import * as search from './search.js';
import * as dedupe from './dedupe.js';
import * as generator from './generator.js';
import * as publisher from './publisher.js';
import * as dbQueries from './db-queries.js';

/**
 * Build worker services with configuration
 */
export function buildWorkerServices(config: { killSwitch: boolean; roleProfileDefault: string }): WorkerServices {
  return {
    // Database
    getCommentByCanonicalId: dbQueries.getCommentByCanonicalId,
    createReplyJob: dbQueries.createReplyJob,

    // Decision
    shouldReply: decider.shouldReply,
    shouldReplyForInteraction: decider.shouldReplyForInteraction,
    decideSafetyAction: decider.decideSafetyAction,

    // Safety
    safetyCheck: safety.safetyCheck,

    // Generation
    generateReplyWithMeta: generator.generateReplyWithMeta,

    // Deduplication
    isRecentDuplicate: dedupe.isRecentDuplicate,
    rememberReplyPhrase: dedupe.rememberReplyPhrase,

    // Publishing
    publishIntentWithResult: publisher.publishIntentWithResult,
    publishReplyWithResult: publisher.publishReplyWithResult,

    // Knowledge
    searchKnowledge: knowledge.searchKnowledge,
    buildKnowledgeContext: knowledge.buildKnowledgeContext,

    // Search
    searchWeb: search.searchWeb,
    buildSearchContext: search.buildSearchContext,

    // Role cards
    getRoleCardByKey: dbQueries.getRoleCardByKey,
    getActiveRoleCard: dbQueries.getActiveRoleCard,

    // Observability
    ensureTraceId: observability.ensureTraceId,
    recordObservabilityEvent: observability.recordObservabilityEvent,
    buildLogContext: observability.buildLogContext,

    // Settings
    killSwitch: config.killSwitch,
    roleProfileDefault: config.roleProfileDefault,
  };
}
