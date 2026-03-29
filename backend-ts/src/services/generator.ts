/**
 * Reply generation service
 * Migrated from Python: app/services/generator.py
 *
 * Enhanced: Phase 2 - LLM integration via llm-client
 */

import type { GenerateReplyService } from './interfaces.js';
import { generateWithLLM } from './llm-client.js';

/**
 * Generate reply with metadata
 * Migrated from: app.services.generator.generate_reply_with_meta
 *
 * Enhancement: LLM-powered generation with:
 * - Real LLM API calls (OpenAI/Claude/Ollama)
 * - Role prompt system
 * - Knowledge & search context injection
 * - Fallback to simple responses
 */
export const generateReplyWithMeta: GenerateReplyService = async (params) => {
  const {
    content,
    style_mode,
    length_mode,
    role_profile,
    role_card,
    knowledge_context,
    search_context,
  } = params;

  try {
    // Try LLM generation
    const result = await generateWithLLM({
      systemPrompt: '',
      userComment: content,
      knowledgeContext: knowledge_context || '',
      searchContext: search_context || '',
      roleProfile: role_profile,
      roleCardPrompt: role_card?.system_prompt ?? undefined,
      lengthMode: length_mode,
    });

    if (!result.used_fallback) {
      return {
        reply_text: result.reply_text,
        provider: result.provider,
        used_fallback: false,
        resolved_role_profile: role_profile,
        resolved_role_card_key: role_card?.key as string | undefined
      };
    }
  } catch (error) {
    console.warn('[generator] LLM failed, using fallback:', error);
  }

  // Fallback: simple template response
  const templates = [
    '收到你的评论了!谢谢支持~',
    '你好呀，感谢关注~',
    '哈哈, 有意思~',
  ];
  return {
    reply_text: templates[Math.floor(Math.random() * templates.length)],
    provider: 'fallback_template',
    used_fallback: true,
    resolved_role_profile: role_profile,
    resolved_role_card_key: role_card?.key as string | undefined
  };
};
