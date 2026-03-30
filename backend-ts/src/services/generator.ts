/**
 * Reply generation service
 * Migrated from Python: app/services/generator.py
 *
 * Enhanced: Full prompt_config + Doro mock replies + LLM integration
 Reads runtime config from prompt-config.ts
 */

import type { GenerateReplyService } from './interfaces.js';
import { generateWithLLM } from './llm-client.js';
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
  const m = (mode || '').trim().toLowerCase();
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
    body = '[Doro_Doro] ' + roleHint + ' ' + pickAction(0) +
      ' 我看到你说"' + quote + '"，心里也跟着酸酸的。你不是一个人扛着，先慢一点喘口气没关系。' +
      '如果你愿意，把今天最难受的那一刻告诉我，我，我们一起把揉小一点。';
  } else if (styleMode === 'meme') {
    body = '[Doro_Doro] ' + roleHint + ' ' + pickAction(1) +
      ' "' + quote + '"——这句话太有画面感啦！Doro 已经在地上打滚三圈了。' +
      '今天这条评论先记作一颗快乐碎片，好好收藏起来~';
  } else {
    body = '[Doro_Doro] ' + roleHint + ' ' + pickAction(2) +
      ' 我看到"' + quote + '"，谢谢你认真留言，这种被看见的连接很珍贵。' +
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

function buildMessages(
  systemPrompt: string,
  userComment: string,
  lengthMode: string,
  roleProfile: string,
): Array<{ role: string; content: string }> {
  const lengthInstruction = buildLengthHint(lengthMode);
  const bannedWordsHint = buildBannedWordsHint();

  let system = systemPrompt +
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
      role: 'user',
      content: '评论内容: ' + userComment + '\n风格: ' + (roleProfile || 'auto') + '\n请生成一条可以直接发布的评论回复。',
    },
  ];
}

// ── Public API ──────────────────────────────────────────────

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
    // Skip by keywords from config
    if (shouldSkipByKeywords(content)) {
      return {
        reply_text: '',
        provider: 'skip',
        used_fallback: true,
        resolved_role_profile: role_profile,
        resolved_role_card_key: role_card?.key as string | undefined,
      };
    }

    const messages = buildMessages(
      '',
      content,
      length_mode || 'medium',
      role_profile || 'auto',
    );

    const result = await generateWithLLM({
      systemPrompt: messages[0].content,
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
