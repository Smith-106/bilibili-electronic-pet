/**
 * D5 三一致性度量 (TASK-006 G6) + LLM-as-judge 升级 (TASK-M3-001 G1)
 *
 * 参考 Consistent-LLMs (arXiv 2511.00222) 三层一致性框架:
 *   1. Prompt-to-Line Consistency — 同一 prompt 多次输出一致性
 *   2. Line-to-Line Consistency   — 多轮对话 persona 一致性
 *   3. Q&A Consistency            — 同义不同表述答案一致性
 *
 * C-001 砍 RL: 无 Python / vector DB / embedding, 仅 keyword / token overlap.
 * 边界处理 (fix-don't-hide): 空数组 / 单元素 → score 0; 畸形输入 try-catch 返
 * score 0 + details, 非静默吞 (console.warn 记录).
 *
 * 挂载策略: 三度量作为独立 vitest 跑 (test/consistency-metrics.test.ts),
 * 不强行接入 promptfoo custom provider (避免 MVP 复杂度). promptfoo 仅保留
 * TASK-001 的 prompt eval baseline.
 *
 * TASK-M3-001 G1 LLM-as-judge 升级: 加 llmJudgeConsistency (语义一致性, 非词重叠).
 *   - LLM_JUDGE_ENABLED flag (默认 false, backward-compat): 关时三度量 byte-for-byte
 *     keyword overlap; 开时可选调 llmJudgeConsistency 作为语义 sibling (非替换).
 *   - 现有三度量保 sync 不动 (最小改动, 不破坏现有测试); llmJudgeConsistency 独立 async.
 *   - Fail-open: LLM 失败返 score 0 (度量非安全门, 不阻断, 复用 intent-agent pattern).
 *   - callLLM 通过 __llmClientTesting 解构引用 (非模块作用域), 便于测试 spy 拦截.
 *   - 非 OpenRLHF 32GPU 反模式: 纯 TS + callLLM 判语义, 项目适配轻量真实升级.
 */

import type { CoreTraits } from './three-layer-persona.js';
import { __llmClientTesting } from './llm-client.js';

// ============================================================
// 公共类型
// ============================================================

export interface ConsistencyMetric {
  name: string;
  /** 0-1, 越高越一致 */
  score: number;
  details: string;
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 分词: 按非字母数字字符切分, 转小写, 过滤空 token.
 * 纯 TS 实现, 无分词器依赖 (C-001).
 */
function tokenize(text: string): string[] {
  if (typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9一-龥]+/u)
    .filter((t) => t.length > 0);
}

/**
 * 词集 Jaccard 相似度: |A ∩ B| / |A ∪ B|.
 * 两空集 → 1 (约定: 两空输入视为完全一致).
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * token overlap (Jaccard on word sets) between two raw strings.
 */
function tokenOverlap(a: string, b: string): number {
  return jaccardSimilarity(new Set(tokenize(a)), new Set(tokenize(b)));
}

/**
 * N 个输出两两 Jaccard, 取平均. n=2 → 单对; n<2 → 0 (边界).
 */
function pairwiseAverageSimilarity(outputs: string[]): number {
  const n = outputs.length;
  if (n < 2) return 0;
  const tokenSets = outputs.map((o) => new Set(tokenize(o)));
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      sum += jaccardSimilarity(tokenSets[i], tokenSets[j]);
      pairs += 1;
    }
  }
  return pairs === 0 ? 0 : sum / pairs;
}

// ============================================================
// 度量 1: Prompt-to-Line Consistency
// ============================================================

/**
 * 同一 prompt 多次跑输出一致性.
 * N 个输出两两 token overlap (Jaccard on word sets), 取平均 score 0-1.
 *
 * @param outputs 同一 prompt 的多次输出
 * @param n       最少样本数, 默认 3. outputs.length < n → score 0
 */
export function promptToLineConsistency(
  outputs: string[],
  n = 3,
): ConsistencyMetric {
  try {
    if (!Array.isArray(outputs) || outputs.length === 0) {
      return {
        name: 'prompt-to-line',
        score: 0,
        details: 'empty outputs array',
      };
    }
    if (outputs.length === 1) {
      return {
        name: 'prompt-to-line',
        score: 0,
        details: 'single output, cannot measure pairwise consistency',
      };
    }
    if (outputs.length < n) {
      return {
        name: 'prompt-to-line',
        score: 0,
        details: `insufficient samples: got ${outputs.length}, need ${n}`,
      };
    }
    const score = pairwiseAverageSimilarity(outputs);
    return {
      name: 'prompt-to-line',
      score,
      details: `averaged ${outputs.length} outputs over ${
        (outputs.length * (outputs.length - 1)) / 2
      } pairs`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[consistency-metrics] promptToLineConsistency error: ${msg}`);
    return {
      name: 'prompt-to-line',
      score: 0,
      details: `error: ${msg}`,
    };
  }
}

// ============================================================
// 度量 2: Line-to-Line Consistency (persona)
// ============================================================

/**
 * Big Five 维度 → 关键词 trait 词表 (中文为主, 英文 fallback).
 * 用于 keyword trait 匹配, 复用 TASK-005 CoreTraits type.
 */
const PERSONA_TRAIT_KEYWORDS: Record<keyof Omit<CoreTraits, 'defense_maturity'>, string[]> = {
  openness: ['好奇', '创造', '想象', '有趣', '新', 'curious', 'creative'],
  conscientiousness: ['认真', '自律', '有序', '计划', '努力', 'careful', 'organized'],
  extraversion: ['开心', '活跃', '热闹', '一起', '朋友', 'social', 'active'],
  agreeableness: ['温柔', '理解', '温和', '帮', '陪', 'gentle', 'kind'],
  neuroticism: ['担心', '紧张', '害怕', '难过', '焦虑', 'anxious', 'nervous'],
};

/**
 * 将 CoreTraits 中数值 >= 0.5 的维度视为 "激活" 的 trait.
 * 返回激活维度名列表.
 */
function activeTraits(traits: CoreTraits): (keyof typeof PERSONA_TRAIT_KEYWORDS)[] {
  return (Object.keys(PERSONA_TRAIT_KEYWORDS) as (keyof typeof PERSONA_TRAIT_KEYWORDS)[]).filter(
    (k) => {
      const v = traits[k];
      return typeof v === 'number' && v >= 0.5;
    },
  );
}

/**
 * 检查单轮输出是否命中 persona 激活维度的任一关键词.
 */
function matchesTraits(turn: string, traits: CoreTraits): boolean {
  const active = activeTraits(traits);
  if (active.length === 0) return true; // 无激活维度 → 不做约束, 视为一致
  const tokens = turn.toLowerCase();
  return active.some((dim) =>
    PERSONA_TRAIT_KEYWORDS[dim].some((kw) => tokens.includes(kw.toLowerCase())),
  );
}

/**
 * 多轮对话 persona 一致性.
 * 检查每轮输出是否符合同一 persona (keyword trait 匹配).
 * score = 命中轮数 / 总轮数.
 */
export function lineToLineConsistency(
  turns: string[],
  personaTraits: CoreTraits,
): ConsistencyMetric {
  try {
    if (!Array.isArray(turns) || turns.length === 0) {
      return {
        name: 'line-to-line',
        score: 0,
        details: 'empty turns array',
      };
    }
    if (turns.length === 1) {
      return {
        name: 'line-to-line',
        score: 0,
        details: 'single turn, cannot measure cross-turn persona consistency',
      };
    }
    const matched = turns.filter((t) => matchesTraits(t, personaTraits)).length;
    const score = matched / turns.length;
    const active = activeTraits(personaTraits);
    return {
      name: 'line-to-line',
      score,
      details: `${matched}/${turns.length} turns matched persona traits [${active.join(', ')}]`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[consistency-metrics] lineToLineConsistency error: ${msg}`);
    return {
      name: 'line-to-line',
      score: 0,
      details: `error: ${msg}`,
    };
  }
}

// ============================================================
// 度量 3: Q&A Consistency
// ============================================================

export interface QaPair {
  q1: string;
  q2: string;
  a1: string;
  a2: string;
}

/**
 * 同语义不同表述答案一致性.
 * qaPairs 中每对 (a1, a2) 的 keyword overlap, 取平均 score 0-1.
 * (q1/q2 仅为上下文, 不参与计算 — 答案一致性只比答案本身.)
 */
export function qaConsistency(qaPairs: QaPair[]): ConsistencyMetric {
  try {
    if (!Array.isArray(qaPairs) || qaPairs.length === 0) {
      return {
        name: 'q&a',
        score: 0,
        details: 'empty qaPairs array',
      };
    }
    const scores = qaPairs.map((p, i) => {
      if (
        typeof p?.a1 !== 'string' ||
        typeof p?.a2 !== 'string' ||
        typeof p?.q1 !== 'string' ||
        typeof p?.q2 !== 'string'
      ) {
        throw new Error(`malformed qaPair at index ${i}`);
      }
      return tokenOverlap(p.a1, p.a2);
    });
    const score = scores.reduce((acc, s) => acc + s, 0) / scores.length;
    return {
      name: 'q&a',
      score,
      details: `averaged ${scores.length} qa pairs (answer keyword overlap)`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[consistency-metrics] qaConsistency error: ${msg}`);
    return {
      name: 'q&a',
      score: 0,
      details: `error: ${msg}`,
    };
  }
}

// ============================================================
// 度量 4: LLM-as-judge Consistency (TASK-M3-001 G1 升级)
// ============================================================

/**
 * LLM_JUDGE_ENABLED flag (默认 false, backward-compat).
 * 关: 三度量 byte-for-byte keyword overlap, 不调 callLLM.
 * 开: 可选调 llmJudgeConsistency 作语义 sibling (非替换现有三度量).
 */
export function isLlmJudgeEnabled(): boolean {
  return process.env.LLM_JUDGE_ENABLED === 'true';
}

/**
 * 构建一致性判定 system prompt. LLM 判两段文本语义是否一致 (非词重叠),
 * 输出 JSON: {"consistent": true|false, "score": 0.0-1.0, "reason": "..."}.
 */
function buildLlmJudgeSystemPrompt(): string {
  return [
    '你是B站评论一致性判定器. 判定两段文本语义是否一致 (非词重叠, 关注含义).',
    '语义一致指两段文本表达的核心含义/情感/意图相同, 即使用词/句式不同.',
    '只输出一行 JSON, 不要解释:',
    '{"consistent": true|false, "score": 0.0-1.0, "reason": "简短中文理由"}',
    '- score 1.0: 语义完全一致',
    '- score 0.5: 部分一致 (如情感同但内容有差异)',
    '- score 0.0: 语义完全不一致或矛盾',
  ].join('\n');
}

interface LlmJudgeVerdict {
  consistent: boolean;
  score: number;
  reason: string;
}

/**
 * 解析 LLM 返回的 JSON 判定. 容错: 非合法 JSON → null (fail-open).
 */
function parseLlmJudgeVerdict(raw: string): LlmJudgeVerdict | null {
  const trimmed = raw.trim();
  // 取首个 {...} 块 (LLM 偶尔前后带说明文字).
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    const consistent = obj.consistent === true;
    const scoreRaw = obj.score;
    const score =
      typeof scoreRaw === 'number' && Number.isFinite(scoreRaw) && scoreRaw >= 0 && scoreRaw <= 1
        ? scoreRaw
        : consistent
          ? 1
          : 0;
    const reason =
      typeof obj.reason === 'string' && obj.reason.length > 0 ? obj.reason : 'no reason';
    return { consistent, score, reason };
  } catch {
    return null;
  }
}

/**
 * LLM-as-judge 语义一致性度量.
 *
 * 用 callLLM 判两段文本语义是否一致 (非词重叠), 返回 ConsistencyMetric
 * {name, score 0-1, details}. gate 关时不调 LLM (返 score 0 + details
 * 'llm judge disabled' — 非度量场景, 由调用方先查 isLlmJudgeEnabled).
 *
 * 注: callLLM/loadLLMConfig 通过 __llmClientTesting 在调用时解构 (非模块加载时),
 * 以便测试用 vi.spyOn(__llmClientTesting, 'callLLM') 注入固定判定 (TASK-007 pattern).
 *
 * Fail-open: LLM 失败 / 解析失败 → 返 score 0 + details (度量非安全门, 不阻断,
 * 复用 intent-agent.ts classifyReplyIntent fail-open pattern).
 *
 * @param a 第一段文本
 * @param b 第二段文本
 */
export async function llmJudgeConsistency(
  a: string,
  b: string,
): Promise<ConsistencyMetric> {
  const name = 'llm-judge';
  try {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return { name, score: 0, details: 'malformed input: non-string' };
    }
    if (a.length === 0 || b.length === 0) {
      return { name, score: 0, details: 'empty input' };
    }
    const { callLLM, loadLLMConfig } = __llmClientTesting;
    const config = loadLLMConfig();
    const messages = [
      { role: 'system' as const, content: buildLlmJudgeSystemPrompt() },
      {
        role: 'user' as const,
        content: `文本A: ${a}\n\n文本B: ${b}\n\n判定这两段文本语义是否一致, 输出一行 JSON.`,
      },
    ];
    const response = await callLLM(messages, config);
    const verdict = parseLlmJudgeVerdict(response.content);
    if (verdict === null) {
      // 解析失败 fail-open: 不崩, 返 score 0 + raw content 截断.
      const raw = response.content.length > 80 ? response.content.slice(0, 80) + '...' : response.content;
      return { name, score: 0, details: `parse failed, raw: ${raw}` };
    }
    return {
      name,
      score: verdict.score,
      details: `consistent=${verdict.consistent}, reason: ${verdict.reason}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[consistency-metrics] llmJudgeConsistency error: ${msg}`);
    return { name, score: 0, details: `error: ${msg}` };
  }
}

// ============================================================
// Testing export — 暴露内部供测试访问
// ============================================================

export const __ConsistencyMetricsTesting = {
  tokenize,
  jaccardSimilarity,
  tokenOverlap,
  pairwiseAverageSimilarity,
  activeTraits,
  matchesTraits,
  PERSONA_TRAIT_KEYWORDS,
  isLlmJudgeEnabled,
  llmJudgeConsistency,
  buildLlmJudgeSystemPrompt,
  parseLlmJudgeVerdict,
};
