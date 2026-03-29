/**
 * Knowledge services for context building
 * Migrated from Python: app/services/knowledge.py
 */

import type { KnowledgeEntry } from '../models/entities.js';
import type { SearchKnowledgeService, BuildKnowledgeContextService } from './interfaces.js';
import { searchKnowledge as dbSearchKnowledge } from './db-queries.js';

/**
 * Search knowledge base
 * Migrated from: app.services.knowledge.search_knowledge
 */
export const searchKnowledge: SearchKnowledgeService = async (query) => {
  try {
    const results = await dbSearchKnowledge(query);
    return results;
  } catch (error) {
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
