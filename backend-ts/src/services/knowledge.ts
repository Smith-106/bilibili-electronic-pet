/**
 * Knowledge services for context building
 * Migrated from Python: app/services/knowledge.py
 */

import type { SearchKnowledgeService, BuildKnowledgeContextService } from './interfaces.js';
import { searchKnowledge as dbSearchKnowledge } from './db-queries.js';
import { recordObservabilityEvent, ensureTraceId } from './observability.js';

/**
 * Search knowledge base
 * Migrated from: app.services.knowledge.search_knowledge
 */
export const searchKnowledge: SearchKnowledgeService = async (query) => {
  try {
    const results = await dbSearchKnowledge(query);
    return results;
  } catch (error) {
    // OBS-005: KB 不可用 fail-open 返回 [] (非 task 路径无 durable 捕获), 原仅 console.
    // 补 fire-and-forget event 使 KB 降级可追踪 (task 路径已捕获 knowledge_error, 此处补流级信号).
    void recordObservabilityEvent({
      event_type: 'knowledge_search_failed',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: { query, error: error instanceof Error ? error.message : String(error) },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'knowledge_search_failed_event_record_failed',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    console.error('Error searching knowledge:', error);
    return [];
  }
};

/**
 * Build knowledge context from entries
 * Migrated from: app.services.knowledge.build_knowledge_context
 */
export const buildKnowledgeContext: BuildKnowledgeContextService = (entries) => {
  if (!entries || entries.length === 0) {
    return '';
  }

  // Build context string from knowledge entries
  const contextParts: string[] = [];

  for (const entry of entries) {
    const question = 'question' in entry ? entry.question : null;
    const answer = 'answer' in entry ? entry.answer : null;

    if (question && answer) {
      contextParts.push(`Q: ${question}\nA: ${answer}`);
    } else if (answer && typeof answer === 'string') {
      contextParts.push(answer);
    } else if ('category' in entry && entry.category) {
      contextParts.push(`Category: ${entry.category}`);
    }
  }

  if (contextParts.length === 0) {
    return '';
  }

  return `Knowledge Context:\n${contextParts.join('\n\n')}\n`;
};
