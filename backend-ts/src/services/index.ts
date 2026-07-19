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
import { createMemoryService } from '../app/memory/memory-service.js';

// D3 (TASK-004 G4): shared memory-service instance for worker recall. repository 内部用 getPrisma()
// 单例, 这里建一次 service wrapper 复用 (避免每次 recall 重建 wrapper, 与 main.ts 每次 create 不同 —
// worker 高频路径, 单例更经济; 无状态, 线程安全).
const memoryService = createMemoryService();

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

    // D3 Memory recall (TASK-004 G4): recall(spaceId) returns top-K MemoryContext
    // (per-pet isolation via spaceId, C-009; C-003 全量召回 + top-K 截断 in memory-service).
    recallMemory: (spaceId: number) => memoryService.recall(spaceId),

    // Role cards
    getRoleCardByKey: dbQueries.getRoleCardByKey,
    getActiveRoleCard: dbQueries.getActiveRoleCard,

    // Observability
    ensureTraceId: observability.ensureTraceId,
    recordObservabilityEvent: observability.recordObservabilityEvent,
    buildLogContext: observability.buildLogContext,
    getObservabilityDropCount: observability.getObservabilityDropCount,

    // Settings
    killSwitch: config.killSwitch,
    roleProfileDefault: config.roleProfileDefault,
  };
}
