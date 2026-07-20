import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __ConsistencyMetricsTesting,
  lineToLineConsistency,
  llmJudgeConsistency,
  promptToLineConsistency,
  qaConsistency,
  type QaPair,
} from '../src/services/consistency-metrics.js';
import type { CoreTraits } from '../src/services/three-layer-persona.js';

const { __llmClientTesting } = await import('../src/services/llm-client.js');

const { tokenize, jaccardSimilarity, tokenOverlap } = __ConsistencyMetricsTesting;

// trackedEnvKeys (TASK-003 pattern): 本文件独立维护. LLM_JUDGE_ENABLED 新 env 同步.
const trackedEnvKeys = ['LLM_JUDGE_ENABLED'] as const;
const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function clearTrackedEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function restoreTrackedEnv(): void {
  clearTrackedEnv();
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    }
  }
}

beforeEach(() => {
  clearTrackedEnv();
});

afterEach(() => {
  vi.restoreAllMocks();
  restoreTrackedEnv();
});

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

// ── llmJudgeConsistency (TASK-M3-001 G1 LLM-as-judge 升级) ────────

describe('isLlmJudgeEnabled flag (TASK-M3-001 G1)', () => {
  const { isLlmJudgeEnabled } = __ConsistencyMetricsTesting;

  it('defaults to false when env unset (backward-compat)', () => {
    expect(isLlmJudgeEnabled()).toBe(false);
  });

  it('returns false for non-"true" values (fail-safe to default)', () => {
    process.env.LLM_JUDGE_ENABLED = 'false';
    expect(isLlmJudgeEnabled()).toBe(false);
    process.env.LLM_JUDGE_ENABLED = '';
    expect(isLlmJudgeEnabled()).toBe(false);
    process.env.LLM_JUDGE_ENABLED = 'garbage';
    expect(isLlmJudgeEnabled()).toBe(false);
    process.env.LLM_JUDGE_ENABLED = '1';
    expect(isLlmJudgeEnabled()).toBe(false);
  });

  it('returns true only for exact literal "true"', () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    expect(isLlmJudgeEnabled()).toBe(true);
    // 非 exact literal 仍 false (fail-safe, 不静默启用 LLM judge)
    process.env.LLM_JUDGE_ENABLED = 'TRUE';
    expect(isLlmJudgeEnabled()).toBe(false);
  });
});

describe('parseLlmJudgeVerdict (TASK-M3-001 G1)', () => {
  const { parseLlmJudgeVerdict } = __ConsistencyMetricsTesting;

  it('parses consistent verdict', () => {
    const v = parseLlmJudgeVerdict('{"consistent": true, "score": 0.9, "reason": "语义相同"}');
    expect(v).not.toBeNull();
    expect(v?.consistent).toBe(true);
    expect(v?.score).toBeCloseTo(0.9, 6);
    expect(v?.reason).toBe('语义相同');
  });

  it('parses inconsistent verdict', () => {
    const v = parseLlmJudgeVerdict('{"consistent": false, "score": 0.1, "reason": "含义矛盾"}');
    expect(v?.consistent).toBe(false);
    expect(v?.score).toBeCloseTo(0.1, 6);
  });

  it('extracts JSON from surrounding text (LLM 偶尔带说明)', () => {
    const v = parseLlmJudgeVerdict('判定如下:\n{"consistent": true, "score": 1.0, "reason": "完全一致"}\n以上.');
    expect(v?.consistent).toBe(true);
    expect(v?.score).toBe(1);
  });

  it('score 缺失时 consistent=true 回退 1, consistent=false 回退 0', () => {
    const a = parseLlmJudgeVerdict('{"consistent": true}');
    expect(a?.score).toBe(1);
    const b = parseLlmJudgeVerdict('{"consistent": false}');
    expect(b?.score).toBe(0);
  });

  it('score 越界 (NaN/>1/<0) 时回退到 consistent 语义', () => {
    const a = parseLlmJudgeVerdict('{"consistent": true, "score": 999}');
    expect(a?.score).toBe(1);
    const b = parseLlmJudgeVerdict('{"consistent": false, "score": -5}');
    expect(b?.score).toBe(0);
  });

  it('reason 缺失时回退 "no reason"', () => {
    const v = parseLlmJudgeVerdict('{"consistent": true, "score": 0.8}');
    expect(v?.reason).toBe('no reason');
  });

  it('non-JSON input → null (fail-open)', () => {
    expect(parseLlmJudgeVerdict('not json at all')).toBeNull();
    expect(parseLlmJudgeVerdict('')).toBeNull();
  });

  it('malformed JSON (broken syntax) → null', () => {
    expect(parseLlmJudgeVerdict('{consistent: true}')).toBeNull();
  });
});

describe('llmJudgeConsistency LLM 调用 (TASK-M3-001 G1, mock callLLM)', () => {
  it('gate=true + LLM 返回 consistent → score 高', async () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: '{"consistent": true, "score": 0.95, "reason": "同义不同词"}',
      provider: 'openai',
      model: 'gpt-4',
    });
    const r = await llmJudgeConsistency('今天好累啊', '今天感觉很疲惫');
    expect(r.name).toBe('llm-judge');
    expect(r.score).toBeCloseTo(0.95, 6);
    expect(r.details).toMatch(/consistent=true/);
  });

  it('gate=true + LLM 返回 inconsistent → score 低', async () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: '{"consistent": false, "score": 0.1, "reason": "含义完全不同"}',
      provider: 'openai',
      model: 'gpt-4',
    });
    const r = await llmJudgeConsistency('今天好累啊', '我要吃火锅');
    expect(r.score).toBeCloseTo(0.1, 6);
    expect(r.details).toMatch(/consistent=false/);
  });

  it('fail-open: LLM 调用失败 → score 0 不崩', async () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockRejectedValue(new Error('LLM API error: 500'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = await llmJudgeConsistency('text a', 'text b');
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/error/);
  });

  it('LLM 返回非 JSON → parse 失败 fail-open score 0', async () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: '我觉得它们挺一致的',
      provider: 'openai',
      model: 'gpt-4',
    });
    const r = await llmJudgeConsistency('a', 'b');
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/parse failed/);
  });

  it('空输入 → score 0 (boundary, 不调 LLM)', async () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    const spy = vi.spyOn(__llmClientTesting, 'callLLM');
    const r = await llmJudgeConsistency('', 'text');
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/empty/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('畸形输入 (非字符串) → score 0 (boundary, 不调 LLM)', async () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    const spy = vi.spyOn(__llmClientTesting, 'callLLM');
    // @ts-expect-error — 故意传畸形输入验证边界
    const r = await llmJudgeConsistency(null, 'text');
    expect(r.score).toBe(0);
    expect(r.details).toMatch(/malformed/);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('LLM_JUDGE_ENABLED flag backward-compat (TASK-M3-001 G1)', () => {
  it('flag=false: 现有三度量 byte-for-byte keyword overlap (不调 callLLM)', () => {
    const spy = vi.spyOn(__llmClientTesting, 'callLLM');
    // promptToLineConsistency (sync, 不调 LLM)
    const p = promptToLineConsistency(['hello world', 'hello world', 'hello world'], 3);
    expect(p.score).toBe(1);
    // qaConsistency (sync, 不调 LLM)
    const q = qaConsistency([
      { q1: 'q1', q2: 'q2', a1: 'hello', a2: 'hello' },
    ]);
    expect(q.score).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it('flag=true: 现有三度量仍 byte-for-byte keyword overlap (llmJudge 为独立 sibling 非替换)', () => {
    process.env.LLM_JUDGE_ENABLED = 'true';
    const spy = vi.spyOn(__llmClientTesting, 'callLLM');
    // 现有三度量 sync, 不调 LLM (llmJudgeConsistency 是独立 async sibling)
    const p = promptToLineConsistency(['hello world', 'hello world', 'hello world'], 3);
    expect(p.score).toBe(1);
    const q = qaConsistency([
      { q1: 'q1', q2: 'q2', a1: 'hello', a2: 'hello' },
    ]);
    expect(q.score).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });
});
