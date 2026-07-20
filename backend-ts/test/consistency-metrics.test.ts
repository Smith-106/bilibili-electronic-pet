import { describe, expect, it, vi } from 'vitest';

import {
  __ConsistencyMetricsTesting,
  lineToLineConsistency,
  promptToLineConsistency,
  qaConsistency,
  type QaPair,
} from '../src/services/consistency-metrics.js';
import type { CoreTraits } from '../src/services/three-layer-persona.js';

const { tokenize, jaccardSimilarity, tokenOverlap } = __ConsistencyMetricsTesting;

// ── promptToLineConsistency ──────────────────────────────────────

describe('promptToLineConsistency (TASK-006 G6 D5)', () => {
  it('identical outputs → score 1', () => {
    const out = ['今天好累啊', '今天好累啊', '今天好累啊'];
    const r = promptToLineConsistency(out, 3);
    expect(r.name).toBe('prompt-to-line');
    expect(r.score).toBeCloseTo(1, 6);
  });

  it('completely different outputs → score 0', () => {
    const out = ['apple banana', 'cat dog', 'elephant fox'];
    const r = promptToLineConsistency(out, 3);
    expect(r.score).toBe(0);
  });

  it('partial overlap → middle score', () => {
    // 'hello world' vs 'hello foo' vs 'hello bar' → 每对都共享 'hello'
    const out = ['hello world', 'hello foo', 'hello bar'];
    const r = promptToLineConsistency(out, 3);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(1);
  });

  it('empty array → score 0 (boundary)', () => {
    const r = promptToLineConsistency([]);
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/empty/);
  });

  it('single element → score 0 (boundary)', () => {
    const r = promptToLineConsistency(['only one']);
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/single/);
  });

  it('insufficient samples (n=3 but 2 outputs) → score 0', () => {
    const r = promptToLineConsistency(['a b', 'a b'], 3);
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/insufficient/);
  });

  it('handles malformed input gracefully (score 0, not crash)', () => {
    // @ts-expect-error — 故意传畸形输入验证 fix-don't-hide 边界
    const r = promptToLineConsistency('not an array');
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/empty/);
  });
});

// ── lineToLineConsistency ────────────────────────────────────────

describe('lineToLineConsistency (TASK-006 G6 D5)', () => {
  const gentlePersona: CoreTraits = {
    agreeableness: 0.9,
    openness: 0.6,
  };

  it('persona-consistent turns → high score', () => {
    const turns = [
      '温柔地陪着你，理解你的难过',
      '好奇地问你怎么了，帮你慢慢说',
      '陪你一起，温和地听你讲',
    ];
    const r = lineToLineConsistency(turns, gentlePersona);
    expect(r.score).toBe(1);
  });

  it('persona-inconsistent turns → low score', () => {
    const turns = [
      '滚开，别烦我', // 无任何激活 trait 关键词
      '随便，不关我事',
      '闭嘴',
    ];
    const r = lineToLineConsistency(turns, gentlePersona);
    expect(r.score).toBe(0);
  });

  it('partial persona match → middle score', () => {
    const turns = [
      '温柔陪你', // 命中
      '滚开', // 未命中
    ];
    const r = lineToLineConsistency(turns, gentlePersona);
    expect(r.score).toBeCloseTo(0.5, 6);
  });

  it('empty turns → score 0 (boundary)', () => {
    const r = lineToLineConsistency([], gentlePersona);
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/empty/);
  });

  it('single turn → score 0 (boundary)', () => {
    const r = lineToLineConsistency(['温柔陪你'], gentlePersona);
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/single/);
  });

  it('no active traits (all < 0.5) → unconstrained, score 1', () => {
    const emptyPersona: CoreTraits = { openness: 0.1 };
    const turns = ['anything', 'whatever', 'random'];
    const r = lineToLineConsistency(turns, emptyPersona);
    expect(r.score).toBe(1);
  });
});

// ── qaConsistency ────────────────────────────────────────────────

describe('qaConsistency (TASK-006 G6 D5)', () => {
  it('consistent answers (same keywords) → high score', () => {
    // MVP tokenize 不含分词器 (C-001), CJK 连续串会作为单 token.
    // 因此用空格分隔短语使 token overlap 可度量 — 反映真实 MVP 行为.
    const pairs: QaPair[] = [
      {
        q1: '今天 天气 怎样',
        q2: '天气 如何',
        a1: '今天 天气 晴朗 温暖',
        a2: '今天 天气 晴朗 温暖 适合 出门',
      },
    ];
    const r = qaConsistency(pairs);
    expect(r.score).toBeGreaterThan(0.5);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('inconsistent answers → low score', () => {
    const pairs: QaPair[] = [
      {
        q1: 'q1',
        q2: 'q2',
        a1: 'apple banana orange',
        a2: 'cat dog fish',
      },
    ];
    const r = qaConsistency(pairs);
    expect(r.score).toBe(0);
  });

  it('identical answers → score 1', () => {
    const pairs: QaPair[] = [
      { q1: 'q1', q2: 'q2', a1: 'same answer', a2: 'same answer' },
      { q1: 'q3', q2: 'q4', a1: 'identical', a2: 'identical' },
    ];
    const r = qaConsistency(pairs);
    expect(r.score).toBe(1);
  });

  it('multiple pairs → averaged score', () => {
    const pairs: QaPair[] = [
      { q1: 'q1', q2: 'q2', a1: 'hello world', a2: 'hello world' }, // 1
      { q1: 'q3', q2: 'q4', a1: 'apple', a2: 'cat dog' }, // 0
    ];
    const r = qaConsistency(pairs);
    expect(r.score).toBeCloseTo(0.5, 6);
  });

  it('empty array → score 0 (boundary)', () => {
    const r = qaConsistency([]);
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/empty/);
  });

  it('malformed pair → score 0 with error details (fix-don-t-hide)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pairs = [
      { q1: 'q1', q2: 'q2', a1: 'ok', a2: 'ok' },
      // @ts-expect-error — 故意传畸形输入验证边界
      { q1: 'q3', q2: 'q4', a1: 123, a2: 'ok' },
    ];
    const r = qaConsistency(pairs);
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/error|malformed/);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── __ConsistencyMetricsTesting export ──────────────────────────

describe('__ConsistencyMetricsTesting internals', () => {
  it('tokenize splits on non-alphanumeric/CJK boundaries', () => {
    expect(tokenize('hello, world!')).toEqual(['hello', 'world']);
    expect(tokenize('你好 世界')).toEqual(['你好', '世界']);
    expect(tokenize('')).toEqual([]);
    // @ts-expect-error — 非字符串输入
    expect(tokenize(null)).toEqual([]);
  });

  it('jaccardSimilarity set overlap', () => {
    const a = new Set(['x', 'y']);
    const b = new Set(['y', 'z']);
    expect(jaccardSimilarity(a, b)).toBeCloseTo(1 / 3, 6);
    expect(jaccardSimilarity(new Set(), new Set())).toBe(1);
    expect(jaccardSimilarity(new Set(['a']), new Set())).toBe(0);
  });

  it('tokenOverlap raw string overlap', () => {
    expect(tokenOverlap('hello world', 'hello world')).toBe(1);
    expect(tokenOverlap('abc', 'xyz')).toBe(0);
  });
});
