import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// D2 LLM-led 意图代理 (TASK-007 G7): ReplyIntent + LLM_REVIEW_GATE flag + C-005 规则优先.
// 测: gate=false byte-for-byte / gate=true LLM intent 分类 / C-005 规则优先 LLM 加严 /
// safetyCheck LLM sibling / fail-open.
//
// 顶层 await import (decider.test.ts pattern): 各 describe 块内 await 不被 vitest 解析,
// 故所有依赖在文件顶层 await import 后解构.
const { __replyIntentTesting: replyIntentTesting } = await import('../src/domain/reply-intent.js');
const {
  classifyReplyIntent,
  __intentAgentTesting: intentAgentTesting,
} = await import('../src/services/intent-agent.js');
const { __llmClientTesting } = await import('../src/services/llm-client.js');
const { generateReplyWithMeta } = await import('../src/services/generator.js');
const { clearConfigCache: clearPromptConfigCache } = await import('../src/services/prompt-config.js');
const { safetyCheck } = await import('../src/services/safety.js');

// trackedEnvKeys (TASK-003 发现: 各测试文件本地 const, 非中心列表 — 本文件独立维护).
// LLM_TIMEOUT/LLM_RETRIES/LLM_BASE_URL 仅在"主路径真调 callLLM"的测试用 — 让 fetch 快速 fail
// (端口 1 拒绝连接 + 短超时 + 单次重试), 避免 5s 测试超时. intent-agent sibling 用 mock spy 拦截.
const trackedEnvKeys = [
  'LLM_REVIEW_GATE_ENABLED',
  'LLM_TIMEOUT',
  'LLM_RETRIES',
  'LLM_BASE_URL',
] as const;

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
  vi.useRealTimers();
  vi.restoreAllMocks();
  restoreTrackedEnv();
});

// ── ReplyIntent type + parser ─────────────────────────────────────

describe('ReplyIntent parse + type (TASK-007, OQ-1 命名裁决)', () => {
  const parse = replyIntentTesting.parseReplyIntent;

  it('parses each intent literal', () => {
    expect(parse('soothe')).toBe('soothe');
    expect(parse('meme')).toBe('meme');
    expect(parse('verify')).toBe('verify');
    expect(parse('reject')).toBe('reject');
    expect(parse('skip')).toBe('skip');
  });

  it('parses first token + strips non-letters (LLM may add punctuation/explanation)', () => {
    expect(parse('skip.')).toBe('skip');
    expect(parse('  REJECT  ')).toBe('reject');
    expect(parse('meme, because funny')).toBe('meme');
    expect(parse('soothe!\n')).toBe('soothe');
  });

  it('returns null for unknown / empty / garbage', () => {
    expect(parse('')).toBeNull();
    expect(parse('hello')).toBeNull();
    expect(parse('sooth')).toBeNull();
    expect(parse('123')).toBeNull();
  });

  it('OQ-1: ReplyIntent 语义正交于 PublishIntent (词根碰撞可接受)', () => {
    // ReplyIntent 管"回什么性质" (soothe/meme/verify/reject/skip), PublishIntent 管"发什么
    // 内容" (target + payload, domain/publish/types.ts:21). 两者不共享字段也不互相替换.
    // 本断言锁定 ReplyIntent 的 5 个值域, 与 PublishIntent 的 target/payload 字段集不相交.
    const replyIntents: ReadonlyArray<string> = ['soothe', 'meme', 'verify', 'reject', 'skip'];
    for (const v of replyIntents) {
      expect(typeof v).toBe('string');
    }
    // ReplyIntent 的值不是 PublishIntent 的字段名 (target/payload/traceId/source).
    const publishIntentFields = ['target', 'payload', 'traceId', 'source'];
    for (const f of publishIntentFields) {
      expect(replyIntents).not.toContain(f);
    }
  });
});

// ── intent-agent gate + C-005 合成 ─────────────────────────────────

describe('intent-agent LLM_REVIEW_GATE flag (TASK-007, OQ-2 flag 实验)', () => {
  const { isLlmReviewGateEnabled, shouldSkipByRuleAndIntent } = intentAgentTesting;

  it('defaults to false when env unset (byte-for-byte backward compat)', () => {
    expect(isLlmReviewGateEnabled()).toBe(false);
  });

  it('returns false for non-"true" values (fail-safe to default)', () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'false';
    expect(isLlmReviewGateEnabled()).toBe(false);
    process.env.LLM_REVIEW_GATE_ENABLED = '';
    expect(isLlmReviewGateEnabled()).toBe(false);
    process.env.LLM_REVIEW_GATE_ENABLED = 'garbage';
    expect(isLlmReviewGateEnabled()).toBe(false);
    process.env.LLM_REVIEW_GATE_ENABLED = '1';
    expect(isLlmReviewGateEnabled()).toBe(false);
  });

  it('returns true only for exact literal "true" (case-insensitive via toLowerCase? no — exact)', () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    expect(isLlmReviewGateEnabled()).toBe(true);
    // 非 exact literal 仍 false (fail-safe, 不静默启用 LLM gate)
    process.env.LLM_REVIEW_GATE_ENABLED = 'TRUE';
    expect(isLlmReviewGateEnabled()).toBe(false);
  });

  it('C-005: 规则 skip → 必跳 (LLM 无权覆盖)', () => {
    // 规则 skip=true, LLM 说固性质 → 仍跳
    expect(shouldSkipByRuleAndIntent(true, 'soothe')).toBe(true);
    expect(shouldSkipByRuleAndIntent(true, 'meme')).toBe(true);
    expect(shouldSkipByRuleAndIntent(true, 'verify')).toBe(true);
    // 规则 skip=true, LLM null (gate off / fail) → 仍跳
    expect(shouldSkipByRuleAndIntent(true, null)).toBe(true);
  });

  it('C-005: 规则回 + LLM skip/reject → 跳 (LLM 加严)', () => {
    expect(shouldSkipByRuleAndIntent(false, 'skip')).toBe(true);
    expect(shouldSkipByRuleAndIntent(false, 'reject')).toBe(true);
  });

  it('C-005: 规则回 + LLM 回性质 / null → 不跳 (规则说回 + LLM 不加严)', () => {
    expect(shouldSkipByRuleAndIntent(false, 'soothe')).toBe(false);
    expect(shouldSkipByRuleAndIntent(false, 'meme')).toBe(false);
    expect(shouldSkipByRuleAndIntent(false, 'verify')).toBe(false);
    expect(shouldSkipByRuleAndIntent(false, null)).toBe(false);
  });
});

// ── classifyReplyIntent with mocked callLLM ───────────────────────

describe('classifyReplyIntent LLM 调用 (TASK-007, mock callLLM)', () => {
  it('gate=false 短路 null (不调 callLLM, byte-for-byte)', async () => {
    const spy = vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'skip',
      provider: 'openai',
      model: 'gpt-4',
    });
    const intent = await classifyReplyIntent('whatever');
    expect(intent).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('gate=true + LLM 返回 skip → 返回 skip', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'skip',
      provider: 'openai',
      model: 'gpt-4',
    });
    const intent = await classifyReplyIntent('刷屏垃圾');
    expect(intent).toBe('skip');
  });

  it('gate=true + LLM 返回 soothe (带标点) → 返回 soothe', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'soothe.',
      provider: 'openai',
      model: 'gpt-4',
    });
    const intent = await classifyReplyIntent('今天好难过');
    expect(intent).toBe('soothe');
  });

  it('gate=true + LLM 返回未知 → null (parse 失败, 规则决策生效)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'unknown_label',
      provider: 'openai',
      model: 'gpt-4',
    });
    const intent = await classifyReplyIntent('xxx');
    expect(intent).toBeNull();
  });

  it('fail-open: LLM 调用失败 → null (不阻断, 规则决策生效)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(__llmClientTesting, 'callLLM').mockRejectedValue(new Error('LLM API error: 500'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const intent = await classifyReplyIntent('test');
    expect(intent).toBeNull();
  });
});

// ── generator.ts 集成: C-005 规则优先 LLM 加严 ────────────────────

describe('generator generateReplyWithMeta C-005 规则优先 (TASK-007)', () => {
  // 用临时 PROJECT_ROOT 让 prompt-config 返回默认 (skip keywords 非空, 含默认黑名单词).
  const originalProjectRoot = process.env.PROJECT_ROOT;
  beforeEach(() => {
    // 清缓存让 prompt-config 读默认 (无 yaml 时 fallback hardcoded defaults, 含 skip keywords)
    clearPromptConfigCache();
  });
  afterEach(() => {
    clearPromptConfigCache();
    if (originalProjectRoot === undefined) delete process.env.PROJECT_ROOT;
    else process.env.PROJECT_ROOT = originalProjectRoot;
  });

  function buildParams(content: string) {
    return {
      content,
      style_mode: 'normal',
      length_mode: 'medium',
      knowledge_context: '',
      search_context: '',
      role_profile: 'default',
    };
  }

  it('gate=false: 规则 skip (含黑名单词) → provider=skip (byte-for-byte)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'skip',
      provider: 'openai',
      model: 'gpt-4',
    });
    // prompt-config 默认 skip keywords 含 "广告" (DEFAULT_SKIP_KEYWORDS). 触发 shouldSkipByKeywords=true.
    const result = await generateReplyWithMeta(buildParams('广告广告加群'));
    expect(result.provider).toBe('skip');
    expect(result.reply_text).toBe('');
    // gate=false 时 LLM 不应被调
    expect(__llmClientTesting.callLLM).not.toHaveBeenCalled();
  });

  it('gate=true: 规则 skip → 必跳 (LLM 无权覆盖, 即使 LLM 说 soothe)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const spy = vi
      .spyOn(__llmClientTesting, 'callLLM')
      //第一次 callLLM 是 intent-agent 分类 (system prompt 含 "意图分类器")
      .mockResolvedValueOnce({
        content: 'soothe',
        provider: 'openai',
        model: 'gpt-4',
      });
    const result = await generateReplyWithMeta(buildParams('广告广告加群'));
    expect(result.provider).toBe('skip');
    expect(result.reply_text).toBe('');
    // intent-agent 的 callLLM 被调了 (gate=true), 但规则已 skip → 不进入 buildMessages 主路径
    expect(spy).toHaveBeenCalled();
  });

  it('gate=true: 规则回 + LLM skip → 跳 (LLM 加严)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'skip',
      provider: 'openai',
      model: 'gpt-4',
    });
    const result = await generateReplyWithMeta(buildParams('今天天气真好'));
    expect(result.provider).toBe('skip');
    expect(result.reply_text).toBe('');
  });

  it('gate=true: 规则回 + LLM reject → 跳 (LLM 加严)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'reject',
      provider: 'openai',
      model: 'gpt-4',
    });
    const result = await generateReplyWithMeta(buildParams('今天天气真好'));
    expect(result.provider).toBe('skip');
  });

  it('gate=true: 规则回 + LLM fail (callLLM reject) → fail-open 回 (规则决策生效)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    // 让主路径 callLLM (模块作用域, spy 不拦截) 快速失败: 端口 1 拒绝连接 + 短超时 + 单次重试.
    process.env.LLM_BASE_URL = 'http://127.0.0.1:1';
    process.env.LLM_TIMEOUT = '100';
    process.env.LLM_RETRIES = '1';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // intent-agent 调用失败 → null; generateWithLLM 主路径也会走 fallback (mock 路径无 API key
    // loadLLMConfig 会用空 key, fetch 抛错). 验证不跳 (provider 非 skip) 即 fail-open 生效.
    vi.spyOn(__llmClientTesting, 'callLLM').mockRejectedValue(new Error('LLM 500'));
    const result = await generateReplyWithMeta(buildParams('今天天气真好'));
    // fail-open: 规则未 skip + LLM null → 不跳; LLM 主路径失败 → mock fallback
    expect(result.provider).not.toBe('skip');
  });

  it('gate=true: 规则回 + LLM soothe → 不跳 (进入 LLM 主路径, 主路径失败走 mock fallback)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    // 同上: 让主路径 callLLM 快速失败 (端口 1 拒绝 + 短超时 + 单次重试).
    process.env.LLM_BASE_URL = 'http://127.0.0.1:1';
    process.env.LLM_TIMEOUT = '100';
    process.env.LLM_RETRIES = '1';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // intent-agent 返回 soothe (不跳). 注: __llmClientTesting.callLLM spy 只拦截 intent-agent
    // 的调用 (intent-agent.ts 调用时解构 __llmClientTesting.callLLM); generateWithLLM 主路径
    // 走 callLLMWithRetry → 模块作用域 callLLM (spy 不拦截), 无 API key 会 fetch 失败 → mockReply fallback.
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'soothe',
      provider: 'openai',
      model: 'gpt-4',
    });
    const result = await generateReplyWithMeta(buildParams('今天天气真好'));
    expect(result.provider).not.toBe('skip');
  });
});

// ── safety.ts LLM sibling ──────────────────────────────────────────

describe('safetyCheck LLM sibling (TASK-007, 非 replacement)', () => {
  it('gate=false: byte-for-byte 现有规则行为 (不调 callLLM)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const spy = vi.spyOn(__llmClientTesting, 'callLLM');
    const [safe, flags] = await safetyCheck('今天天气真好');
    expect(safe).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    expect((flags as { llm_intent?: string }).llm_intent).toBeUndefined();
  });

  it('gate=true + 规则 ok + LLM skip → manual_review (LLM 加严, 非 replacement)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'skip',
      provider: 'openai',
      model: 'gpt-4',
    });
    const [safe, flags] = await safetyCheck('今天天气真好');
    expect(safe).toBe(false);
    const f = flags as { decision: string; reason: string; llm_intent?: string; triggered_rules: string[] };
    expect(f.decision).toBe('manual_review');
    expect(f.reason).toBe('llm_intent_skip');
    expect(f.llm_intent).toBe('skip');
    expect(f.triggered_rules).toContain('llm_intent_agent');
  });

  it('gate=true + 规则 ok + LLM reject → manual_review', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'reject',
      provider: 'openai',
      model: 'gpt-4',
    });
    const [safe, flags] = await safetyCheck('今天天气真好');
    expect(safe).toBe(false);
    const f = flags as { decision: string; reason: string; llm_intent?: string };
    expect(f.decision).toBe('manual_review');
    expect(f.reason).toBe('llm_intent_reject');
  });

  it('gate=true + 规则 blocked → 必跳 (LLM 不被调, 规则优先)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const spy = vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'soothe',
      provider: 'openai',
      model: 'gpt-4',
    });
    // "去死" 触发 keyword_blacklist (DEFAULT_KEYWORD_BLACKLIST 含 "去死") → 规则 blocked
    const [safe, flags] = await safetyCheck('去死吧');
    expect(safe).toBe(false);
    const f = flags as { decision: string; triggered_rules: string[] };
    expect(f.decision).toBe('blocked');
    expect(f.triggered_rules).toContain('keyword_blacklist');
    // 规则 blocked 提前 return, LLM sibling 不执行
    expect(spy).not.toHaveBeenCalled();
  });

  it('gate=true + 规则 ok + LLM soothe → 仍 safe (不加严, 记录 llm_intent)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(__llmClientTesting, 'callLLM').mockResolvedValue({
      content: 'soothe',
      provider: 'openai',
      model: 'gpt-4',
    });
    const [safe, flags] = await safetyCheck('今天天气真好');
    expect(safe).toBe(true);
    expect((flags as { llm_intent?: string }).llm_intent).toBe('soothe');
  });

  it('gate=true + 规则 ok + LLM fail → fail-open (规则 ok 决策生效, 不阻断)', async () => {
    process.env.LLM_REVIEW_GATE_ENABLED = 'true';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(__llmClientTesting, 'callLLM').mockRejectedValue(new Error('LLM 500'));
    const [safe] = await safetyCheck('今天天气真好');
    expect(safe).toBe(true);
  });
});
