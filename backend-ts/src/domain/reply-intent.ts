/**
 * D2 LLM-led 意图代理 (TASK-007 G7).
 *
 * ReplyIntent — LLM 对用户评论的"回复意图性质"分类, 替代 generator.ts 旧的
 * shouldSkipByKeywords 硬规则概率决策 (D2 深度研究结论: 当前 decider 用
 * Math.random 概率式决策非 intent). 用 LLM 判 ReplyIntent, 走 flag 实验
 * LLM_REVIEW_GATE_ENABLED (默认 false, byte-for-byte 现有 shouldSkipByKeywords 行为).
 *
 * ── OQ-1 命名裁决 (terminology.md:6 词根碰撞) ──
 * PublishIntent (domain/publish/types.ts:21) 管"发什么内容" (target + payload),
 * ReplyIntent (本文件) 管"回什么性质" (soothe/meme/verify/reject/skip).
 * 词根碰撞可接受因语义正交: 两者在生成管道不同层 (publish 管出口 payload,
 * reply 管生成决策性质), 不共享字段也不互相替换. 注释明确边界避免混淆.
 *
 * ── C-005 规则优先 (locked, 不可越) ──
 * 硬规则 (shouldSkipByKeywords) 先跑, LLM 只能加严:
 *   - 规则说 skip → 必跳 (LLM 无权覆盖)
 *   - 规则说回 + LLM 说 skip → 跳 (LLM 加严)
 *   - 规则说回 + LLM 说 回性质 → 回
 * LLM MUST NOT 放行 (松绑) 规则拒绝的内容.
 */
export type ReplyIntent = 'soothe' | 'meme' | 'verify' | 'reject' | 'skip';

/**
 * D2 LLM 意图分类: 调 callLLM 判 ReplyIntent.
 *
 * 这是 sibling (新调用), 不改 generator.ts buildMessages 主路径 (TASK-007 范围:
 * D2 是意图决策层非 message 组装层; buildMessages 注入是 TASK-005 三层角色的事).
 *
 * Fail-open: LLM 调用失败时返回 null (规则决策生效, 不阻断 — 意图是加严非安全门,
 * 复用 knowledge/search try-catch pattern, 非 fail-closed).
 */
export function buildReplyIntentSystemPrompt(): string {
  return [
    '你是B站评论区意图分类器. 阅读用户评论, 判定 Doro_Doro 应以何种意图回复.',
    '只输出一个意图标签, 不要解释:',
    '- soothe: 安抚/陪伴 (用户低落/倾诉)',
    '- meme: 轻松玩梗 (用户调侃/搞笑)',
    '- verify: 查证/回应事实 (用户提问/求证)',
    '- reject: 拒绝回复 (敏感/引战/违规内容, 不回应)',
    '- skip: 暂不回复 (无关/无意义/刷屏, 当前不生成)',
    '输出格式: 仅标签单词 (soothe|meme|verify|reject|skip).',
  ].join('\n');
}

export function parseReplyIntent(raw: string): ReplyIntent | null {
  const trimmed = raw.trim().toLowerCase();
  // 取首 token (LLM 偶尔带标点或解释, 只认第一个词).
  const first = trimmed.split(/\s+/)[0] ?? '';
  const cleaned = first.replace(/[^a-z]/g, '');
  if (cleaned === 'soothe') return 'soothe';
  if (cleaned === 'meme') return 'meme';
  if (cleaned === 'verify') return 'verify';
  if (cleaned === 'reject') return 'reject';
  if (cleaned === 'skip') return 'skip';
  return null;
}

export const __replyIntentTesting = {
  buildReplyIntentSystemPrompt,
  parseReplyIntent,
};
