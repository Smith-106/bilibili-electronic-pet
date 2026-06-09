import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { dbSearchKnowledgeMock, generateWithLLMMock, promptConfig } = vi.hoisted(() => ({
  dbSearchKnowledgeMock: vi.fn(),
  generateWithLLMMock: vi.fn(),
  promptConfig: {
    actionPool: ['pat', 'roll', 'wave'],
    bannedWords: [] as string[],
    lengthDistribution: { long: 0, extra_long: 0 },
    skipKeywords: [] as string[],
  },
}));

vi.mock('../src/services/db-queries.js', () => ({
  searchKnowledge: dbSearchKnowledgeMock,
}));

vi.mock('../src/services/llm-client.js', () => ({
  generateWithLLM: generateWithLLMMock,
}));

vi.mock('../src/services/prompt-config.js', () => ({
  getPromptActionPool: () => promptConfig.actionPool,
  getPromptBannedWords: () => promptConfig.bannedWords,
  getPromptLengthDistribution: () => promptConfig.lengthDistribution,
  getPromptSkipKeywords: () => promptConfig.skipKeywords,
}));

const { buildKnowledgeContext, searchKnowledge } = await import('../src/services/knowledge.js');
const { generateReplyWithMeta } = await import('../src/services/generator.js');

beforeEach(() => {
  dbSearchKnowledgeMock.mockReset();
  generateWithLLMMock.mockReset();
  promptConfig.actionPool = ['pat', 'roll', 'wave'];
  promptConfig.bannedWords = [];
  promptConfig.lengthDistribution = { long: 0, extra_long: 0 };
  promptConfig.skipKeywords = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('knowledge service coverage', () => {
  it('returns database search results and falls back to empty results on errors', async () => {
    dbSearchKnowledgeMock.mockResolvedValueOnce([{ answer: 'Known answer' }]).mockRejectedValueOnce(new Error('db_down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(searchKnowledge('known')).resolves.toEqual([{ answer: 'Known answer' }]);
    await expect(searchKnowledge('broken')).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Error searching knowledge:', expect.any(Error));
  });

  it('builds mixed knowledge context entries and ignores unsupported entries', () => {
    expect(buildKnowledgeContext([])).toBe('');
    expect(buildKnowledgeContext(null as never)).toBe('');
    expect(
      buildKnowledgeContext([
        { question: 'How?', answer: 'Like this.' },
        { answer: 'Answer only.' },
        { category: 'persona' },
        { title: 'ignored' },
      ] as never),
    ).toBe('Knowledge Context:\nQ: How?\nA: Like this.\n\nAnswer only.\n\nCategory: persona\n');
    expect(buildKnowledgeContext([{ title: 'ignored' }] as never)).toBe('');
  });
});

describe('generator service coverage', () => {
  it('skips generation when prompt skip keywords match', async () => {
    promptConfig.skipKeywords = ['skip-me'];

    await expect(
      generateReplyWithMeta({
        content: 'please skip-me',
        style_mode: 'normal',
        length_mode: 'medium',
        role_profile: 'auto',
      }),
    ).resolves.toMatchObject({
      reply_text: '',
      provider: 'skip',
      used_fallback: true,
    });
    expect(generateWithLLMMock).not.toHaveBeenCalled();
  });

  it('returns provider output and forwards role card prompts with configured prompt hints', async () => {
    promptConfig.bannedWords = ['forbidden'];
    generateWithLLMMock.mockResolvedValue({
      reply_text: 'provider reply',
      provider: 'openai',
      used_fallback: false,
    });

    const result = await generateReplyWithMeta({
      content: 'hello',
      style_mode: 'normal',
      length_mode: 'short',
      role_profile: 'comfort',
      role_card: {
        key: 'care-card',
        system_prompt: 'Use the care card.',
      },
      knowledge_context: 'knowledge',
      search_context: 'search',
    });

    expect(result).toMatchObject({
      reply_text: 'provider reply',
      provider: 'openai',
      used_fallback: false,
      resolved_role_profile: 'comfort',
      resolved_role_card_key: 'care-card',
    });
    expect(generateWithLLMMock).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeContext: 'knowledge',
        searchContext: 'search',
        roleProfile: 'comfort',
        roleCardPrompt: 'Use the care card.',
        lengthMode: 'short',
      }),
    );
    expect(generateWithLLMMock.mock.calls[0][0].systemPrompt).toContain('forbidden');
  });

  it('builds long and fallback length hints while preserving empty context defaults', async () => {
    generateWithLLMMock.mockResolvedValue({ reply_text: 'provider reply', provider: 'openai', used_fallback: false });

    await generateReplyWithMeta({
      content: 'long hint',
      style_mode: 'normal',
      length_mode: 'long',
      role_profile: 'default',
    });
    await generateReplyWithMeta({
      content: 'unknown hint',
      style_mode: 'normal',
      length_mode: 'unknown' as never,
      role_profile: 'auto',
    });

    expect(generateWithLLMMock.mock.calls[0][0]).toMatchObject({
      knowledgeContext: '',
      searchContext: '',
      roleCardPrompt: undefined,
      lengthMode: 'long',
    });
    expect(generateWithLLMMock.mock.calls[0][0].systemPrompt).not.toEqual(
      generateWithLLMMock.mock.calls[1][0].systemPrompt,
    );
    expect(generateWithLLMMock.mock.calls[1][0].lengthMode).toBe('unknown');
  });

  it('falls back to expanded long meme replies with role card labels', async () => {
    promptConfig.lengthDistribution = { long: 1, extra_long: 1 };
    generateWithLLMMock.mockRejectedValue(new Error('llm_down'));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await generateReplyWithMeta({
      content: 'long comment body',
      style_mode: 'meme',
      length_mode: 'long',
      role_profile: 'playful',
      role_card: {
        key: 'meme-card',
        system_prompt: 'Meme card prompt',
      },
    });

    expect(result.provider).toBe('mock');
    expect(result.used_fallback).toBe(true);
    expect(result.reply_text).toContain('meme-card');
    expect(result.reply_text).toContain('\n\n');
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back missing length distribution weights to zero', async () => {
    promptConfig.lengthDistribution = {} as never;
    generateWithLLMMock.mockResolvedValue({ reply_text: '', provider: 'fallback', used_fallback: true });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await generateReplyWithMeta({
      content: 'long but no distribution weights',
      style_mode: 'normal',
      length_mode: 'long',
      role_profile: 'default',
    });

    expect(result).toMatchObject({
      provider: 'mock',
      used_fallback: true,
    });
    expect(result.reply_text).not.toContain('\n\n');
  });

  it('falls back across empathy and normal role-profile branches', async () => {
    generateWithLLMMock.mockResolvedValue({ reply_text: '', provider: 'fallback', used_fallback: true });

    const empathy = await generateReplyWithMeta({
      content: 'needs comfort',
      style_mode: 'empathy',
      length_mode: 'extra_long',
      role_profile: 'comfort',
    });
    const playful = await generateReplyWithMeta({
      content: 'make it fun',
      style_mode: 'normal',
      length_mode: 'medium',
      role_profile: 'playful',
    });
    const defaultRole = await generateReplyWithMeta({
      content: 'default branch',
      style_mode: 'normal',
      length_mode: 'medium',
      role_profile: 'default',
    });

    expect(empathy.reply_text).toContain('comfort');
    expect(playful.reply_text).toContain('[Doro_Doro]');
    expect(defaultRole.reply_text).toContain('[Doro_Doro]');
    expect(generateWithLLMMock).toHaveBeenCalledTimes(3);
  });

  it('falls back with empty action pools and omitted generation options', async () => {
    promptConfig.actionPool = [];
    generateWithLLMMock.mockResolvedValue({ reply_text: '', provider: 'fallback', used_fallback: true });

    const result = await generateReplyWithMeta({
      content: 'minimal branch',
    } as never);

    expect(result).toMatchObject({
      provider: 'mock',
      used_fallback: true,
      resolved_role_profile: undefined,
      resolved_role_card_key: undefined,
    });
    expect(result.reply_text).toContain('[Doro_Doro]');
  });
});
