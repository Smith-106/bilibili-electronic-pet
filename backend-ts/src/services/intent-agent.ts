/**
 * D2 LLM-led 意图代理 (TASK-007 G7, sibling to shouldSkipByKeywords).
 *
 * 调 callLLM 判 ReplyIntent (soothe/meme/verify/reject/skip).
 * LLM_REVIEW_GATE_ENABLED flag (默认 false, backward-compat):
 *   - false: classifyReplyIntent 短路返回 null (generator 走原 shouldSkipByKeywords)
 *   - true: 调 callLLM, LLM 说 skip/reject 时加严跳过 (规则已跳的 LLM 无权覆盖)
 *
 * C-005 规则优先: 本函数只判定 LLM 意图, 与规则的 AND 由 generator 调用方合成
 * (规则 skip → 必跳; 规则回 + LLM skip/reject → 跳; 规则回 + LLM 回性质 → 回).
 *
 * Fail-open: LLM 调用失败返回 null (规则决策生效, 不阻断).
 */
import {
  buildReplyIntentSystemPrompt,
  parseReplyIntent,
  type ReplyIntent,
} from '../domain/reply-intent.js';
import { __llmClientTesting } from './llm-client.js';

export function isLlmReviewGateEnabled(): boolean {
  return process.env.LLM_REVIEW_GATE_ENABLED === 'true';
}

/**
 * LLM 意图分类. gate 关闭时返回 null. 调用失败返回 null (fail-open).
 *
 * 注: callLLM/loadLLMConfig 通过 __llmClientTesting 在调用时解构 (非模块加载时),
 * 以便测试用 vi.spyOn(__llmClientTesting, 'callLLM') 注入固定 intent.
 */
export async function classifyReplyIntent(userComment: string): Promise<ReplyIntent | null> {
  if (!isLlmReviewGateEnabled()) return null;

  try {
    const { callLLM, loadLLMConfig } = __llmClientTesting;
    const config = loadLLMConfig();
    const messages = [
      { role: 'system' as const, content: buildReplyIntentSystemPrompt() },
      { role: 'user' as const, content: userComment },
    ];
    const response = await callLLM(messages, config);
    return parseReplyIntent(response.content);
  } catch (error) {
    // fail-open: LLM 失败不阻断, 规则决策生效 (意图是加严非安全门).
    console.warn('[intent-agent] LLM intent classification failed, fail-open to rule:', error);
    return null;
  }
}

/**
 * C-005 规则优先合成: 硬规则结果 + LLM 意图 → 最终是否跳过.
 *
 * - 规则 skip → 必跳 (LLM 无权覆盖)
 * - 规则回 + LLM skip/reject → 跳 (LLM 加严)
 * - 规则回 + LLM 回性质 / null → 不跳
 */
export function shouldSkipByRuleAndIntent(ruleSkip: boolean, llmIntent: ReplyIntent | null): boolean {
  if (ruleSkip) return true; // C-005: 规则拒绝, LLM 无权放行
  if (llmIntent === 'skip' || llmIntent === 'reject') return true; // LLM 加严
  return false;
}

export const __intentAgentTesting = {
  isLlmReviewGateEnabled,
  shouldSkipByRuleAndIntent,
};
