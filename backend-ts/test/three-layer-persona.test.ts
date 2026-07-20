import { describe, expect, it } from 'vitest';

import {
  parseThreeLayerPersona,
  renderThreeLayerPersonaSegment,
  deriveDynamicStateFromPetState,
  __threeLayerPersonaTesting,
} from '../src/services/three-layer-persona.js';
import type { ThreeLayerPersona } from '../src/services/three-layer-persona.js';
import { __llmClientTesting } from '../src/services/llm-client.js';
import type { RoleCardValue } from '../src/models/entities.js';

// D4 三层角色 (TASK-005 G5, terminology.md ThreeLayerPersona) 测试.
// C-007 零 migration: 三层内嵌到 RoleCard.tone 现有 JSON 字段, 不新增 Prisma 字段.
// backward-compat: 无三层 key 时 parseThreeLayerPersona 返回 {}, buildMessages 单层 fallback byte-for-byte.

const { buildMessages } = __llmClientTesting;
const { TONE_KEY_CORE_TRAITS, TONE_KEY_SPEAKING_STYLE, TONE_KEY_DYNAMIC_STATE } = __threeLayerPersonaTesting;

function makeToneValue(layers: Partial<{
  core_traits: Record<string, unknown>;
  speaking_style: Record<string, unknown>;
  dynamic_state: Record<string, unknown>;
}>): RoleCardValue {
  const obj: Record<string, unknown> = {};
  if (layers.core_traits) obj[TONE_KEY_CORE_TRAITS] = layers.core_traits;
  if (layers.speaking_style) obj[TONE_KEY_SPEAKING_STYLE] = layers.speaking_style;
  if (layers.dynamic_state) obj[TONE_KEY_DYNAMIC_STATE] = layers.dynamic_state;
  return obj;
}

describe('three-layer persona: parseThreeLayerPersona', () => {
  it('parses all three layers from tone JSON object', () => {
    const tone = makeToneValue({
      core_traits: {
        openness: 0.8,
        conscientiousness: 0.6,
        extraversion: 0.3,
        agreeableness: 0.9,
        neuroticism: 0.2,
        defense_maturity: 0.7,
      },
      speaking_style: {
        tone: 'warm',
        formality: 0.2,
        emoji_usage: 0.8,
        sentence_length: 'short',
      },
      dynamic_state: { mood: 0.6, energy: 0.5, relationship: 0.4 },
    });

    const persona = parseThreeLayerPersona(tone);
    expect(persona.core_traits).toEqual({
      openness: 0.8,
      conscientiousness: 0.6,
      extraversion: 0.3,
      agreeableness: 0.9,
      neuroticism: 0.2,
      defense_maturity: 0.7,
    });
    expect(persona.speaking_style).toEqual({
      tone: 'warm',
      formality: 0.2,
      emoji_usage: 0.8,
      sentence_length: 'short',
    });
    expect(persona.dynamic_state).toEqual({ mood: 0.6, energy: 0.5, relationship: 0.4 });
  });

  it('returns empty (all undefined) for legacy tone string (single-layer fallback)', () => {
    const persona = parseThreeLayerPersona('legacy tone description');
    expect(persona).toEqual({});
  });

  it('returns empty for tone {} or empty string', () => {
    expect(parseThreeLayerPersona('{}')).toEqual({});
    expect(parseThreeLayerPersona('')).toEqual({});
    expect(parseThreeLayerPersona('{}' as RoleCardValue)).toEqual({});
  });

  it('returns empty for undefined/null tone', () => {
    expect(parseThreeLayerPersona(undefined)).toEqual({});
    expect(parseThreeLayerPersona(null)).toEqual({});
  });

  it("parses partial layers (missing layer → undefined, fix-dont-hide: real parse of present layer)", () => {
    const tone = makeToneValue({
      core_traits: { openness: 0.5 },
    });
    const persona = parseThreeLayerPersona(tone);
    expect(persona.core_traits).toEqual({ openness: 0.5 });
    expect(persona.speaking_style).toBeUndefined();
    expect(persona.dynamic_state).toBeUndefined();
  });

  it('clamps out-of-range scores to 0-1 (sanitize layer)', () => {
    const tone = makeToneValue({
      core_traits: { openness: 1.5, neuroticism: -0.3 },
      dynamic_state: { mood: 2, energy: -1 },
    });
    const persona = parseThreeLayerPersona(tone);
    expect(persona.core_traits?.openness).toBe(1);
    expect(persona.core_traits?.neuroticism).toBe(0);
    expect(persona.dynamic_state?.mood).toBe(1);
    expect(persona.dynamic_state?.energy).toBe(0);
  });

  it('drops non-numeric / invalid fields rather than injecting NaN', () => {
    const tone = makeToneValue({
      core_traits: { openness: 'high' as unknown, extraversion: null as unknown },
      speaking_style: { tone: '   ', sentence_length: 'mega' as unknown },
    });
    const persona = parseThreeLayerPersona(tone);
    expect(persona.core_traits?.openness).toBeUndefined();
    expect(persona.core_traits?.extraversion).toBeUndefined();
    expect(persona.speaking_style?.tone).toBeUndefined();
    expect(persona.speaking_style?.sentence_length).toBeUndefined();
  });

  it('ignores tone array (not an object)', () => {
    const persona = parseThreeLayerPersona([1, 2, 3] as unknown as RoleCardValue);
    expect(persona).toEqual({});
  });
});

describe('three-layer persona: renderThreeLayerPersonaSegment', () => {
  it('renders empty segment when persona is {} (byte-for-byte backward-compat: caller skips append)', () => {
    expect(renderThreeLayerPersonaSegment({})).toBe('');
  });

  it('renders Core Traits segment with score labels', () => {
    const segment = renderThreeLayerPersonaSegment({
      core_traits: { openness: 0.8, neuroticism: 0.1 },
    });
    expect(segment).toContain('人格底色 (Core Traits)');
    expect(segment).toContain('openness=high');
    expect(segment).toContain('neuroticism=very_low');
    expect(segment).not.toContain('Speaking Style');
    expect(segment).not.toContain('Dynamic State');
  });

  it('renders Speaking Style segment', () => {
    const segment = renderThreeLayerPersonaSegment({
      speaking_style: { tone: 'warm', emoji_usage: 0.9, sentence_length: 'short' },
    });
    expect(segment).toContain('说话风格 (Speaking Style)');
    expect(segment).toContain('tone=warm');
    expect(segment).toContain('emoji=high');
    expect(segment).toContain('sentence_length=short');
  });

  it('renders Dynamic State segment', () => {
    const segment = renderThreeLayerPersonaSegment({
      dynamic_state: { mood: 0.5, energy: 0.25, relationship: 0.95 },
    });
    expect(segment).toContain('当前状态 (Dynamic State)');
    expect(segment).toContain('mood=mid');
    expect(segment).toContain('energy=low');
    expect(segment).toContain('relationship=high');
  });

  it('renders all three layers joined by newline', () => {
    const segment = renderThreeLayerPersonaSegment({
      core_traits: { openness: 0.5 },
      speaking_style: { tone: 'calm' },
      dynamic_state: { mood: 0.5 },
    });
    const lines = segment.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Core Traits');
    expect(lines[1]).toContain('Speaking Style');
    expect(lines[2]).toContain('Dynamic State');
  });

  it('scoreLabel thresholds: very_low (<0.25), low (0.25-0.5), mid (0.5-0.75), high (>=0.75)', () => {
    const { scoreLabel } = __threeLayerPersonaTesting;
    expect(scoreLabel(0)).toBe('very_low');
    expect(scoreLabel(0.24)).toBe('very_low');
    expect(scoreLabel(0.25)).toBe('low');
    expect(scoreLabel(0.49)).toBe('low');
    expect(scoreLabel(0.5)).toBe('mid');
    expect(scoreLabel(0.74)).toBe('mid');
    expect(scoreLabel(0.75)).toBe('high');
    expect(scoreLabel(1)).toBe('high');
  });
});

// G2 (TASK-M3-002): style_hints parse + render query 检索.
// backward-compat: style_hints/query optional, 缺失 byte-for-byte.
describe('three-layer persona: G2 style_hints parse + render query retrieval', () => {
  const { sanitizeSpeakingStyle } = __threeLayerPersonaTesting;

  it('parseThreeLayerPersona parses style_hints array (C-007 reuse tone column)', () => {
    const tone = makeToneValue({
      speaking_style: {
        tone: 'warm',
        style_hints: [
          { tone: 'warm', sentence_length: 'short' },
          { tone: 'professional', formality: 0.9 },
        ],
      },
    });
    const persona = parseThreeLayerPersona(tone);
    expect(persona.speaking_style?.style_hints).toHaveLength(2);
    expect(persona.speaking_style?.style_hints?.[0]).toEqual({ tone: 'warm', sentence_length: 'short' });
    expect(persona.speaking_style?.style_hints?.[1]).toEqual({ tone: 'professional', formality: 0.9 });
  });

  it('style_hints missing → undefined (byte-for-byte single-style fallback)', () => {
    const tone = makeToneValue({ speaking_style: { tone: 'warm' } });
    const persona = parseThreeLayerPersona(tone);
    expect(persona.speaking_style?.style_hints).toBeUndefined();
  });

  it('style_hints non-array → undefined (sanitize drops invalid, fix-dont-hide)', () => {
    const tone = makeToneValue({
      speaking_style: { tone: 'warm', style_hints: 'not-an-array' as unknown },
    });
    const persona = parseThreeLayerPersona(tone);
    expect(persona.speaking_style?.style_hints).toBeUndefined();
    expect(persona.speaking_style?.tone).toBe('warm');
  });

  it('style_hints with invalid items → only valid ones kept', () => {
    const tone = makeToneValue({
      speaking_style: {
        style_hints: [
          { tone: 'warm' },
          'not-an-object',
          { formality: 0.5 },
          null,
        ] as unknown[],
      },
    });
    const persona = parseThreeLayerPersona(tone);
    expect(persona.speaking_style?.style_hints).toHaveLength(2);
    expect(persona.speaking_style?.style_hints?.[0]?.tone).toBe('warm');
    expect(persona.speaking_style?.style_hints?.[1]?.formality).toBe(0.5);
  });

  it('sanitizeSpeakingStyle recursion: nested style_hints sanitized independently', () => {
    const result = sanitizeSpeakingStyle({
      tone: 'warm',
      style_hints: [{ formality: 1.5, emoji_usage: -0.3 }],
    });
    expect(result.style_hints?.[0]?.formality).toBe(1);
    expect(result.style_hints?.[0]?.emoji_usage).toBe(0);
  });

  it('render: no query → byte-for-byte single SpeakingStyle (backward-compat)', () => {
    const persona: ThreeLayerPersona = {
      speaking_style: { tone: 'warm', sentence_length: 'short' },
    };
    const noQuery = renderThreeLayerPersonaSegment(persona);
    const undefinedQuery = renderThreeLayerPersonaSegment(persona, undefined);
    const emptyQuery = renderThreeLayerPersonaSegment(persona, '');
    expect(noQuery).toBe('说话风格 (Speaking Style): tone=warm, sentence_length=short');
    expect(undefinedQuery).toBe(noQuery);
    expect(emptyQuery).toBe(noQuery);
  });

  it('render: query + style_hints → retrieves top-K, renders style_hint[n] lines', () => {
    const persona: ThreeLayerPersona = {
      speaking_style: {
        tone: 'default',
        style_hints: [
          { tone: 'warm', sentence_length: 'short' },
          { tone: 'professional', formality: 0.9 },
          { tone: 'playful', emoji_usage: 0.9 },
        ],
      },
    };
    const segment = renderThreeLayerPersonaSegment(persona, 'playful short');
    expect(segment).toContain('说话风格 (Speaking Style)');
    expect(segment).toContain('style_hint[0]');
    // playful + short hint matches query best → index 0
    expect(segment).toContain('tone=playful');
    expect(segment).toContain('emoji=high');
    // should NOT contain the default single-style tone= (retrieved branch wins)
    expect(segment).not.toContain('tone=default');
  });

  it('render: query + style_hints but no match → fallback to single byte-for-byte (fail-open)', () => {
    const persona: ThreeLayerPersona = {
      speaking_style: {
        tone: 'warm',
        style_hints: [{ tone: 'professional', formality: 0.9 }],
      },
    };
    const segment = renderThreeLayerPersonaSegment(persona, 'zzzznomatch');
    // BM25 returns empty (no overlap) → fallback to single style
    expect(segment).toContain('tone=warm');
    expect(segment).not.toContain('style_hint[');
  });

  it('render: query but no style_hints → byte-for-byte single', () => {
    const persona: ThreeLayerPersona = {
      speaking_style: { tone: 'warm', sentence_length: 'short' },
    };
    const segment = renderThreeLayerPersonaSegment(persona, 'anything');
    expect(segment).toBe('说话风格 (Speaking Style): tone=warm, sentence_length=short');
  });

  it('render: Core Traits + Dynamic State unaffected by query (query only affects style)', () => {
    const persona: ThreeLayerPersona = {
      core_traits: { openness: 0.8 },
      speaking_style: {
        tone: 'warm',
        style_hints: [{ tone: 'playful', emoji_usage: 0.9 }],
      },
      dynamic_state: { mood: 0.5 },
    };
    const segment = renderThreeLayerPersonaSegment(persona, 'playful');
    const lines = segment.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Core Traits');
    expect(lines[1]).toContain('style_hint[0]');
    expect(lines[2]).toContain('Dynamic State');
  });
});

describe('three-layer persona: buildMessages injection + backward-compat', () => {
  const baseParams = {
    userComment: 'hi',
    knowledgeContext: '',
    searchContext: '',
    roleProfile: 'default',
    roleCardPrompt: undefined as string | undefined,
    lengthMode: 'medium',
  };

  it('byte-for-byte single-layer when threeLayerSegment is empty/undefined', () => {
    const a = buildMessages(
      'system-prompt-X',
      baseParams.userComment,
      baseParams.knowledgeContext,
      baseParams.searchContext,
      baseParams.roleProfile,
      baseParams.roleCardPrompt,
      baseParams.lengthMode,
      undefined,
      undefined,
    );
    const b = buildMessages(
      'system-prompt-X',
      baseParams.userComment,
      baseParams.knowledgeContext,
      baseParams.searchContext,
      baseParams.roleProfile,
      baseParams.roleCardPrompt,
      baseParams.lengthMode,
      undefined,
      '',
    );
    expect(a[0].content).toBe(b[0].content);
    expect(a[0].content).toBe('system-prompt-X');
  });

  it('appends threeLayerSegment to system message when non-empty', () => {
    const segment = '人格底色 (Core Traits): openness=high';
    const messages = buildMessages(
      'system-prompt-X',
      baseParams.userComment,
      baseParams.knowledgeContext,
      baseParams.searchContext,
      baseParams.roleProfile,
      baseParams.roleCardPrompt,
      baseParams.lengthMode,
      undefined,
      segment,
    );
    expect(messages[0].content).toBe('system-prompt-X\n' + segment);
  });

  it('appends segment in default system branch when systemPrompt is empty', () => {
    const segment = '当前状态 (Dynamic State): mood=mid';
    const messages = buildMessages(
      '',
      baseParams.userComment,
      baseParams.knowledgeContext,
      baseParams.searchContext,
      'auto',
      'You are Doro.',
      baseParams.lengthMode,
      undefined,
      segment,
    );
    expect(messages[0].content).toContain('角色设定: You are Doro.');
    expect(messages[0].content).toContain(segment);
    expect(messages[0].content.endsWith(segment)).toBe(true);
  });
});

describe('three-layer persona: PetState Dynamic State derivation', () => {
  it('derives energy from needs_json energy score (/100 → 0-1)', () => {
    const ds = deriveDynamicStateFromPetState({
      needs: JSON.stringify([{ key: 'energy', score: 76 }]),
    });
    expect(ds.energy).toBeCloseTo(0.76, 2);
    expect(ds.mood).toBeUndefined();
    expect(ds.relationship).toBeUndefined();
  });

  it('derives mood/relationship from state_metadata numeric fields', () => {
    const ds = deriveDynamicStateFromPetState({
      state_metadata: JSON.stringify({ mood: 0.6, relationship: 0.3 }),
      needs: JSON.stringify([{ key: 'energy', score: 50 }]),
    });
    expect(ds.mood).toBeCloseTo(0.6, 2);
    expect(ds.relationship).toBeCloseTo(0.3, 2);
    expect(ds.energy).toBeCloseTo(0.5, 2);
  });

  it('accepts object form (not string) for state_metadata and needs', () => {
    const ds = deriveDynamicStateFromPetState({
      state_metadata: { mood: 0.9 },
      needs: [{ key: 'energy', score: 20 }],
    });
    expect(ds.mood).toBeCloseTo(0.9, 2);
    expect(ds.energy).toBeCloseTo(0.2, 2);
  });

  it('returns empty DynamicState when no energy need / no metadata (fallback, not NaN)', () => {
    const ds = deriveDynamicStateFromPetState({
      needs: JSON.stringify([{ key: 'hunger', score: 40 }]),
      state_metadata: '{}',
    });
    expect(ds).toEqual({});
    expect(ds.energy).toBeUndefined();
  });

  it("handles malformed needs JSON gracefully (fix-dont-hide: parse error → undefined, not throw)", () => {
    const ds = deriveDynamicStateFromPetState({ needs: '{not-json' });
    expect(ds).toEqual({});
  });

  it('clamps energy score overflow (>100 → 1)', () => {
    const ds = deriveDynamicStateFromPetState({
      needs: JSON.stringify([{ key: 'energy', score: 150 }]),
    });
    expect(ds.energy).toBe(1);
  });
});
