/**
 * D4 Three-Layer Persona (TASK-005 G5, terminology.md ThreeLayerPersona)
 *
 * 深度研究 D4 发现: 当前 RoleCard 为单层 (system_prompt + tone/constraints JSON).
 * 本模块将角色扩展为三层, 复用 RoleCard 现有 `tone` JSON 字段承载 (零 migration, C-007):
 *
 *   1. Core Traits   — Big Five + Vaillant 人格底色 (openness/conscientiousness/extraversion/
 *                      agreeableness/neuroticism, 0-1 分数). MVP 仅承载结构, 不引入测量工具.
 *   2. Speaking Style — 风格 hints (tone/formality/emoji_usage/sentence_length). MVP 仅 JSON hints,
 *                      不加 vector DB style RAG.
 *   3. Dynamic State  — 跨 turn 当前状态 (mood/energy/relationship). 复用 PetState 字段持久化,
 *                      不加跨 turn relationship graph.
 *
 * ## C-007 零 Migration 决策
 *
 * RoleCard.tone 是已存在的 String 列 (default "{}"), parseRoleCardValue 已将其解析为
 * Record<string, unknown>. 三层 JSON 内嵌到 tone 的保留 key:
 *   - tone.core_traits   (CoreTraits)
 *   - tone.speaking_style (SpeakingStyle)
 *   - tone.dynamic_state (DynamicState)
 *
 * 现有 RoleCard 无三层 key 时 → 解析返回 undefined 三层 → buildMessages 行为 byte-for-byte
 * 不变 (单层 fallback). 不新增 Prisma 字段, 不触发 migration.
 *
 * ## Backward-Compat
 *
 * 三层均 optional. 缺失层用合理 default (中性 openness 0.5 等), 但解析本身不注入 default —
 * default 仅在渲染层用于生成人类可读 prompt 文本. 缺失三层时 buildMessages 不追加任何三层
 * prompt 片段 (byte-for-byte 现有单层行为).
 */

import type { RoleCardValue } from '../models/entities.js';

// ============================================================
// Layer 1: Core Traits (Big Five + Vaillant)
// ============================================================

/**
 * Big Five 人格分数 (0-1). MVP 仅承载结构, 不引入测量工具.
 * 各维度语义:
 *   - openness            开放性 (好奇/创造力)
 *   - conscientiousness   尽责性 (自律/有序)
 *   - extraversion        外向性 (社交/活跃)
 *   - agreeableness      宜人性 (温和/合作)
 *   - neuroticism         神经质 (情绪波动/敏感)
 *
 * Vaillant 防御机制层级承载于 defense_maturity (0-1, MVP 仅占位).
 */
export type CoreTraits = {
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
  defense_maturity?: number;
};

// ============================================================
// Layer 2: Speaking Style
// ============================================================

export type SpeakingStyle = {
  /** 语气 hint: 'warm' | 'playful' | 'calm' | 'professional' | 'mysterious' 等 */
  tone?: string;
  /** 正式度 0-1 (0=口语, 1=书面) */
  formality?: number;
  /** emoji 使用频率 0-1 (0=几乎不用, 1=高频) */
  emoji_usage?: number;
  /** 句长 hint: 'short' | 'medium' | 'long' */
  sentence_length?: 'short' | 'medium' | 'long';
};

// ============================================================
// Layer 3: Dynamic State (跨 turn)
// ============================================================

export type DynamicState = {
  /** 心情 0-1 (0=低落, 1=愉悦) */
  mood?: number;
  /** 能量 0-1 (0=疲惫, 1=充沛) */
  energy?: number;
  /** 关系亲密度 0-1 (0=陌生, 1=亲密) */
  relationship?: number;
};

// ============================================================
// Three-Layer Persona (聚合)
// ============================================================

export type ThreeLayerPersona = {
  core_traits?: CoreTraits;
  speaking_style?: SpeakingStyle;
  dynamic_state?: DynamicState;
};

// tone 字段保留 key (禁止与 legacy tone string 冲突)
const TONE_KEY_CORE_TRAITS = 'core_traits';
const TONE_KEY_SPEAKING_STYLE = 'speaking_style';
const TONE_KEY_DYNAMIC_STATE = 'dynamic_state';

/**
 * 从 RoleCard.tone (RoleCardValue) 解析三层角色.
 *
 * - tone 为 JSON object → 读取三层保留 key (缺失层 undefined).
 * - tone 为 legacy string / 非 object → 全部 undefined (单层 fallback).
 * - tone 为空串 / '{}' → 全部 undefined.
 *
 * 真实解析 JSON, 非 stub. 缺失层不注入 default (default 仅渲染层使用).
 */
export function parseThreeLayerPersona(tone: RoleCardValue | undefined | null): ThreeLayerPersona {
  if (!tone) {
    return {};
  }
  // RoleCardValue = string | Record<string, unknown>; legacy string 无法承载三层.
  if (typeof tone === 'string') {
    return {};
  }
  if (typeof tone !== 'object' || Array.isArray(tone)) {
    return {};
  }
  const obj = tone as Record<string, unknown>;
  const result: ThreeLayerPersona = {};
  const core = obj[TONE_KEY_CORE_TRAITS];
  if (core && typeof core === 'object' && !Array.isArray(core)) {
    result.core_traits = sanitizeCoreTraits(core as Record<string, unknown>);
  }
  const style = obj[TONE_KEY_SPEAKING_STYLE];
  if (style && typeof style === 'object' && !Array.isArray(style)) {
    result.speaking_style = sanitizeSpeakingStyle(style as Record<string, unknown>);
  }
  const dyn = obj[TONE_KEY_DYNAMIC_STATE];
  if (dyn && typeof dyn === 'object' && !Array.isArray(dyn)) {
    result.dynamic_state = sanitizeDynamicState(dyn as Record<string, unknown>);
  }
  return result;
}

function clamp01(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function sanitizeCoreTraits(raw: Record<string, unknown>): CoreTraits {
  const result: CoreTraits = {};
  const openness = clamp01(raw.openness);
  if (openness !== undefined) result.openness = openness;
  const conscientiousness = clamp01(raw.conscientiousness);
  if (conscientiousness !== undefined) result.conscientiousness = conscientiousness;
  const extraversion = clamp01(raw.extraversion);
  if (extraversion !== undefined) result.extraversion = extraversion;
  const agreeableness = clamp01(raw.agreeableness);
  if (agreeableness !== undefined) result.agreeableness = agreeableness;
  const neuroticism = clamp01(raw.neuroticism);
  if (neuroticism !== undefined) result.neuroticism = neuroticism;
  const defense = clamp01(raw.defense_maturity);
  if (defense !== undefined) result.defense_maturity = defense;
  return result;
}

function sanitizeSpeakingStyle(raw: Record<string, unknown>): SpeakingStyle {
  const result: SpeakingStyle = {};
  if (typeof raw.tone === 'string' && raw.tone.trim()) {
    result.tone = raw.tone.trim();
  }
  const formality = clamp01(raw.formality);
  if (formality !== undefined) result.formality = formality;
  const emoji = clamp01(raw.emoji_usage);
  if (emoji !== undefined) result.emoji_usage = emoji;
  if (raw.sentence_length === 'short' || raw.sentence_length === 'medium' || raw.sentence_length === 'long') {
    result.sentence_length = raw.sentence_length;
  }
  return result;
}

function sanitizeDynamicState(raw: Record<string, unknown>): DynamicState {
  const result: DynamicState = {};
  const mood = clamp01(raw.mood);
  if (mood !== undefined) result.mood = mood;
  const energy = clamp01(raw.energy);
  if (energy !== undefined) result.energy = energy;
  const relationship = clamp01(raw.relationship);
  if (relationship !== undefined) result.relationship = relationship;
  return result;
}

// ============================================================
// Dynamic State 持久化 (复用 PetState, 跨 turn)
// ============================================================

/**
 * 从 PetState 字段派生 DynamicState (跨 turn 持久化).
 *
 * PetState.mood_label / mood_note / relationship_level 是字符串语义, 不直接是 0-1 数值.
 * MVP 降级: 通过 needs_json 中的 energy need score 派生 energy; mood/relationship 暂用
 * state_metadata 中若存在的 mood/relationship 数值 (由 pet-core 写入), 否则 undefined.
 *
 * 这里仅做读取派生, 不写入 PetState (写入仍由 pet-core service 负责, 避免越权).
 */
export function deriveDynamicStateFromPetState(params: {
  state_metadata?: Record<string, unknown> | string;
  needs?: Array<{ key: string; score: number }> | string;
}): DynamicState {
  const result: DynamicState = {};
  const meta = resolveObject(params.state_metadata);
  const mood = clamp01(meta?.mood);
  if (mood !== undefined) result.mood = mood;
  const relationship = clamp01(meta?.relationship);
  if (relationship !== undefined) result.relationship = relationship;
  const energyScore = findEnergyScore(params.needs);
  if (energyScore !== undefined) {
    const energy = clamp01(energyScore / 100);
    if (energy !== undefined) result.energy = energy;
  }
  return result;
}

function resolveObject(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * 从 needs (可能是 StoredPetNeed[] 或 needs_json 字符串) 中提取 energy need 的 score (0-100).
 * 返回 undefined 表示无 energy need.
 */
function findEnergyScore(needs: unknown): number | undefined {
  if (!needs) return undefined;
  let arr: unknown = needs;
  if (typeof needs === 'string') {
    const trimmed = needs.trim();
    if (!trimmed) return undefined;
    try {
      arr = JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(arr)) return undefined;
  for (const item of arr) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const rec = item as Record<string, unknown>;
      if (rec.key === 'energy' && typeof rec.score === 'number' && Number.isFinite(rec.score)) {
        return rec.score;
      }
    }
  }
  return undefined;
}

// ============================================================
// 渲染: 三层 → system message 片段
// ============================================================

/**
 * 将三层角色渲染为 system message 附加片段.
 *
 * 返回 '' 时调用方应跳过追加 (byte-for-byte 单层 fallback).
 * 返回非空串时调用方追加到 system message (三层均缺失则返回 '').
 *
 * 渲染规则:
 *   - Core Traits: 列出非 undefined 维度作人类可读 hint (分数映射描述词).
 *   - Speaking Style: 列出 hint.
 *   - Dynamic State: 列出 mood/energy/relationship 当前值.
 */
export function renderThreeLayerPersonaSegment(persona: ThreeLayerPersona): string {
  const parts: string[] = [];

  if (persona.core_traits) {
    const ct = persona.core_traits;
    const traitLines: string[] = [];
    if (ct.openness !== undefined) traitLines.push(`openness=${scoreLabel(ct.openness)}`);
    if (ct.conscientiousness !== undefined) traitLines.push(`conscientiousness=${scoreLabel(ct.conscientiousness)}`);
    if (ct.extraversion !== undefined) traitLines.push(`extraversion=${scoreLabel(ct.extraversion)}`);
    if (ct.agreeableness !== undefined) traitLines.push(`agreeableness=${scoreLabel(ct.agreeableness)}`);
    if (ct.neuroticism !== undefined) traitLines.push(`neuroticism=${scoreLabel(ct.neuroticism)}`);
    if (traitLines.length > 0) {
      parts.push(`人格底色 (Core Traits): ${traitLines.join(', ')}`);
    }
  }

  if (persona.speaking_style) {
    const ss = persona.speaking_style;
    const styleLines: string[] = [];
    if (ss.tone) styleLines.push(`tone=${ss.tone}`);
    if (ss.formality !== undefined) styleLines.push(`formality=${scoreLabel(ss.formality)}`);
    if (ss.emoji_usage !== undefined) styleLines.push(`emoji=${scoreLabel(ss.emoji_usage)}`);
    if (ss.sentence_length) styleLines.push(`sentence_length=${ss.sentence_length}`);
    if (styleLines.length > 0) {
      parts.push(`说话风格 (Speaking Style): ${styleLines.join(', ')}`);
    }
  }

  if (persona.dynamic_state) {
    const ds = persona.dynamic_state;
    const dynLines: string[] = [];
    if (ds.mood !== undefined) dynLines.push(`mood=${scoreLabel(ds.mood)}`);
    if (ds.energy !== undefined) dynLines.push(`energy=${scoreLabel(ds.energy)}`);
    if (ds.relationship !== undefined) dynLines.push(`relationship=${scoreLabel(ds.relationship)}`);
    if (dynLines.length > 0) {
      parts.push(`当前状态 (Dynamic State): ${dynLines.join(', ')}`);
    }
  }

  if (parts.length === 0) return '';
  return parts.join('\n');
}

function scoreLabel(score: number): string {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'mid';
  if (score >= 0.25) return 'low';
  return 'very_low';
}

// ============================================================
// 测试导出
// ============================================================

export const __threeLayerPersonaTesting = {
  TONE_KEY_CORE_TRAITS,
  TONE_KEY_SPEAKING_STYLE,
  TONE_KEY_DYNAMIC_STATE,
  sanitizeCoreTraits,
  sanitizeSpeakingStyle,
  sanitizeDynamicState,
  clamp01,
  scoreLabel,
};
