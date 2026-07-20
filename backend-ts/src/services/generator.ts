/**
 * Reply generation service
 * Migrated from Python: app/services/generator.py
 *
 * Enhanced: Full prompt_config + Doro mock replies + LLM integration
 Reads runtime config from prompt-config.ts
 */

import type { GenerateReplyService } from './interfaces.js';
import type { MemoryContext } from '../app/memory/types.js';
import { generateWithLLM } from './llm-client.js';
import { classifyReplyIntent, shouldSkipByRuleAndIntent } from './intent-agent.js';
import {
  parseThreeLayerPersona,
  renderThreeLayerPersonaSegment,
  type ThreeLayerPersona,
} from './three-layer-persona.js';
import {
  getPromptActionPool,
  getPromptBannedWords,
  getPromptLengthDistribution,
  getPromptSkipKeywords,
  type PromptLengthMode,
} from './prompt-config.js';

// ── Prompt Configuration (loaded from YAML) ───────────────────────────

type LengthMode = PromptLengthMode;

function pickAction(index: number): string {
  const actionPool = getPromptActionPool();
  return actionPool[index % actionPool.length] ?? '';
}

function normalizeLengthMode(mode: string): LengthMode {
  const m = mode.trim().toLowerCase();
  if (m === 'short' || m === 'medium' || m === 'long' || m === 'extra_long') return m as LengthMode;
  return 'medium';
}
function buildLengthHint(lengthMode: string): string {
  const mode = normalizeLengthMode(lengthMode);
  if (mode === 'short') return '回复长度偏短（1-2句），保持温柔和在场感。';
  if (mode === 'long') return '回复长度偏长（3-5句），允许更完整的安抚与陪伴表达。';
  return '回复长度中等（2-3句），简洁且有温度。';
}
function buildBannedWordsHint(): string {
  const bannedWords = getPromptBannedWords();
  if (bannedWords.length === 0) return '';
  return '禁用词: ' + bannedWords.join(', ') + '。';
}
function shouldExpandLongReply(lengthMode: string): boolean {
  if (normalizeLengthMode(lengthMode) !== 'long') return false;
  const dist = getPromptLengthDistribution();
  const longP = Math.max(0, dist.long ?? 0);
  const extraLongP = Math.max(0, dist.extra_long ?? 0);
  const threshold = Math.min(1, longP + extraLongP);
  return Math.random() < threshold;
}
// ── Skip keyword check (from prompt config) ──────────────────────────

function shouldSkipByKeywords(content: string): boolean {
  const keywords = getPromptSkipKeywords();
  const lower = content.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return true;
  }
  return false;
}

// ── Doro-style mock reply ──────────────────────────────────

function mockReply(
  content: string,
  styleMode: string,
  lengthMode: string,
  roleProfile: string,
  roleCardKey?: string,
): string {
  const quote = content.substring(0, 16);
  const roleHints: Record<string, string> = {
    auto: '',
    default: '',
    comfort: '(更关注安抚情绪，避免夸张段子)',
    playful: '(更活泼，允许轻松玩梗但不冒犯)',
  };
  let roleHint = roleHints[roleProfile] ?? '';

  if (roleCardKey) {
    roleHint = '(角色卡: ' + roleCardKey + ')';
  }

  let body: string;
  if (styleMode === 'empathy') {
    body =
      '[Doro_Doro] ' +
      roleHint +
      ' ' +
      pickAction(0) +
      ' 我看到你说"' +
      quote +
      '"，心里也跟着酸酸的。你不是一个人扛着，先慢一点喘口气没关系。' +
      '如果你愿意，把今天最难受的那一刻告诉我，我，我们一起把揉小一点。';
  } else if (styleMode === 'meme') {
    body =
      '[Doro_Doro] ' +
      roleHint +
      ' ' +
      pickAction(1) +
      ' "' +
      quote +
      '"——这句话太有画面感啦！Doro 已经在地上打滚三圈了。' +
      '今天这条评论先记作一颗快乐碎片，好好收藏起来~';
  } else {
    body =
      '[Doro_Doro] ' +
      roleHint +
      ' ' +
      pickAction(2) +
      ' 我看到"' +
      quote +
      '"，谢谢你认真留言，这种被看见的连接很珍贵。' +
      '要是一下子聊不完也没关系，我一直在评论区，慢慢聊。';
  }

  if (!roleCardKey) {
    if (roleProfile === 'comfort') {
      body += ' 先照顾好自己最重要，我会用更温柔的方式陪你。';
    } else if (roleProfile === 'playful') {
      body += ' 今天继续营业开心小剧场，给你加一颗星✨';
    }
  }

  if (shouldExpandLongReply(lengthMode)) {
    body += '\n\n有时候一句话背后，可能好多天没说出口的情绪。能写下来，本身就很勇敢了。';
  }
  return body;
}

// ── Build LLM messages ─────────────────────────────────────

/**
 * 合并三层角色: explicit card 优先, 缺失层回退 active card.
 * (TASK-005 G5): role_card 三层 key 缺失时 fallback active_role_card 对应层, 逐层合并.
 */
function mergeThreeLayerPersona(explicit: ThreeLayerPersona, active: ThreeLayerPersona): ThreeLayerPersona {
  const merged: ThreeLayerPersona = {};
  const core = explicit.core_traits ?? active.core_traits;
  if (core) merged.core_traits = core;
  const style = explicit.speaking_style ?? active.speaking_style;
  if (style) merged.speaking_style = style;
  const dyn = explicit.dynamic_state ?? active.dynamic_state;
  if (dyn) merged.dynamic_state = dyn;
  return merged;
}

function buildMessages(
  systemPrompt: string,
  userComment: string,
  lengthMode: string,
  roleProfile: string,
): Array<{ role: string; content: string }> {
  const lengthInstruction = buildLengthHint(lengthMode);
  const bannedWordsHint = buildBannedWordsHint();

  let system =
    systemPrompt +
    '你在B站评论区扮演 Doro_Doro。回复要温柔、有在场感，默认中等长度，偶尔长文。' +
    '必须引用用户评论中的短句。禁止辱骂、引战、暴露隐私。输出只包含最终回复文本。' +
    lengthInstruction;

  if (bannedWordsHint) {
    system += '\n' + bannedWordsHint;
  }

  if (roleProfile === 'comfort') {
    system += '\n当前角色: comfort，优先安抚与陪伴，避免过于跳脱的段子。';
  } else if (roleProfile === 'playful') {
    system += '\n当前角色: playful，保持友善且更活泼，可以轻松玩梗但不冒犯。';
  } else if (roleProfile === 'default') {
    system += '\n当前角色: default，平衡温柔与日常互动语气。';
  }

  return [
    {
      role: 'system',
      content: system,
    },
    {
      role: 'user',
      content: '评论内容: ' + userComment + '\n风格: ' + roleProfile + '\n请生成一条可以直接发布的评论回复。',
    },
  ];
}

// ── Public API ──────────────────────────────────────────────

export const generateReplyWithMeta: GenerateReplyService = async (params) => {
  const { content, style_mode, length_mode, role_profile, role_card, knowledge_context, search_context, memory_context } = params;

  try {
    // Skip by keywords from config (硬规则先跑, C-005 规则优先).
    const ruleSkip = shouldSkipByKeywords(content);

    // D2 LLM-led 意图代理 (TASK-007 G7): LLM_REVIEW_GATE_ENABLED=true 时调 callLLM
    // 判 ReplyIntent. C-005: 规则 skip → 必跳 (LLM 无权覆盖); 规则回 + LLM skip/reject
    // → 跳 (LLM 加严); 规则回 + LLM 回性质/null → 回. gate=false 时 classifyReplyIntent
    // 短路 null, shouldSkipByRuleAndIntent 退化为 ruleSkip (byte-for-byte 现有行为).
    const llmIntent = await classifyReplyIntent(content);
    if (shouldSkipByRuleAndIntent(ruleSkip, llmIntent)) {
      return {
        reply_text: '',
        provider: 'skip',
        used_fallback: true,
        resolved_role_profile: role_profile,
        resolved_role_card_key: role_card?.key as string | undefined,
      };
    }

    const messages = buildMessages('', content, length_mode || 'medium', role_profile || 'auto');

    // D4 三层角色 (TASK-005 G5, terminology.md ThreeLayerPersona):
    // 从 role_card.tone 解析三层 (CoreTraits/SpeakingStyle/DynamicState). 缺失层 fallback undefined.
    // 若 role_card 无三层 key → 回退 active_role_card.tone (active card 的三层). 两卡都无 → segment '' (单层 fallback).
    // C-007: tone 是已存在 String 列, 三层内嵌不触发 migration. backward-compat: 无三层时 segment='' 不追加.
    // G2 (TASK-M3-002): 传 content 作 query, 若 speaking_style.style_hints 存在 → BM25 检索 top-K;
    //                   无 query/无 style_hints → byte-for-byte 单条. query optional, 不破坏现有调用.
    const personaFromExplicit = role_card ? parseThreeLayerPersona(role_card.tone) : {};
    const personaFromActive = params.active_role_card ? parseThreeLayerPersona(params.active_role_card.tone) : {};
    const mergedPersona = mergeThreeLayerPersona(personaFromExplicit, personaFromActive);
    const threeLayerSegment = renderThreeLayerPersonaSegment(mergedPersona, content);

    const result = await generateWithLLM({
      systemPrompt: messages[0].content,
      userComment: content,
      knowledgeContext: knowledge_context || '',
      searchContext: search_context || '',
      memoryContext: memory_context,
      roleProfile: role_profile,
      roleCardPrompt: role_card?.system_prompt ?? undefined,
      lengthMode: length_mode,
      threeLayerSegment,
    });

    if (!result.used_fallback) {
      return {
        reply_text: result.reply_text,
        provider: result.provider,
        used_fallback: false,
        resolved_role_profile: role_profile,
        resolved_role_card_key: role_card?.key as string | undefined,
      };
    }
  } catch (error) {
    console.warn('[generator] LLM failed, using Doro mock fallback:', error);
  }

  // Fallback: Doro-style mock reply
  return {
    reply_text: mockReply(
      content,
      style_mode || 'normal',
      length_mode || 'medium',
      role_profile || 'auto',
      role_card?.key as string | undefined,
    ),
    provider: 'mock',
    used_fallback: true,
    resolved_role_profile: role_profile,
    resolved_role_card_key: role_card?.key as string | undefined,
  };
};
