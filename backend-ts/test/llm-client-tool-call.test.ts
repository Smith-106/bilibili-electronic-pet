import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// D2 callLLM tool-call 主路径升级 (TASK-M3-003 G3):
// 测 callLLM body 构造 (有无 tools) + parseLLMResponse tool_use 解析 (OpenAI/Claude 两种格式)
// + backward-compat (无 tools byte-for-byte, text-only toolCalls undefined).
//
// 通过 stub globalThis.fetch 拦截真实 HTTP, 断言:
//   1. body 不含 tools (无 config.tools) — byte-for-byte
//   2. body 含 tools/tool_choice (有 config.tools, OpenAI + Claude 两种 provider 格式)
//   3. parseLLMResponse: OpenAI tool_calls → toolCalls 解析
//   4. parseLLMResponse: Claude tool_use block → toolCalls 解析
//   5. text-only 响应 → toolCalls undefined
//   6. text + tool_use 共存 → content + toolCalls 都解析
//
// 注: 不调真实 LLM (无 API key, 无网络). fetch mock 返回构造响应测解析逻辑.
const { __llmClientTesting } = await import('../src/services/llm-client.js');

// trackedEnvKeys (本文件独立, intent-agent.test.ts 模式): 只读 LLM provider 配置, 无主路径真调.
const trackedEnvKeys = [
  'LLM_PROVIDER',
  'LLM_API_KEY',
  'LLM_MODEL',
  'LLM_BASE_URL',
  'LLM_TEMPERATURE',
  'LLM_MAX_TOKENS',
  'LLM_TIMEOUT',
  'LLM_RETRIES',
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

function setBaseConfig(): void {
  process.env.LLM_PROVIDER = 'openai';
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_MODEL = 'gpt-4';
  process.env.LLM_BASE_URL = 'https://api.openai.com/v1';
  process.env.LLM_TEMPERATURE = '0.7';
  process.env.LLM_MAX_TOKENS = '150';
  process.env.LLM_TIMEOUT = '5000';
  process.env.LLM_RETRIES = '1';
}

interface FetchCall {
  url: string;
  body: string;
}

function mockFetchOnce(responseData: Record<string, unknown>): {
  fetchSpy: ReturnType<typeof vi.fn>;
  getCalls: () => FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fetchSpy = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body as string });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchSpy);
  return { fetchSpy, getCalls: () => calls };
}

beforeEach(() => {
  clearTrackedEnv();
  setBaseConfig();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreTrackedEnv();
});

const testTool = {
  name: 'get_weather',
  description: 'Get weather for a city',
  input_schema: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
};

// ── callLLM body 构造: 无 tools (byte-for-byte) ─────────────────────

describe('callLLM body: 无 tools → byte-for-byte (TASK-M3-003 G3)', () => {
  it('OpenAI provider 无 config.tools → body 不含 tools/tool_choice', async () => {
    const { getCalls } = mockFetchOnce({
      choices: [{ message: { content: 'hello', role: 'assistant' } }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('tool_choice');
    // 核心 text-only 字段仍存在 (byte-for-byte)
    expect(body.model).toBe('gpt-4');
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(150);
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('Claude provider 无 config.tools → body 不含 tools/tool_choice', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.LLM_MODEL = 'claude-sonnet-4-6';
    process.env.LLM_BASE_URL = 'https://api.anthropic.com';
    const { getCalls } = mockFetchOnce({
      content: [{ type: 'text', text: 'hello' }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('tool_choice');
  });

  it('LLMResponse text-only 无 toolCalls 字段 (byte-for-byte, undefined 语义)', async () => {
    const { getCalls } = mockFetchOnce({
      choices: [{ message: { content: 'plain text', role: 'assistant' } }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    const resp = await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    expect(resp.content).toBe('plain text');
    expect(resp.toolCalls).toBeUndefined();
    // 确认未触发 fetch body 含 tools
    const body = JSON.parse(getCalls()[0].body);
    expect(body).not.toHaveProperty('tools');
  });
});

// ── callLLM body 构造: 有 tools (两种 provider 格式) ────────────────

describe('callLLM body: 有 tools → 含 tools/tool_choice (TASK-M3-003 G3)', () => {
  it('OpenAI provider + tools → tools OpenAI function format + tool_choice auto', async () => {
    const { getCalls } = mockFetchOnce({
      choices: [{ message: { content: '', role: 'assistant' } }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = 'auto';
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body.tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get weather for a city',
          parameters: testTool.input_schema,
        },
      },
    ]);
    expect(body.tool_choice).toBe('auto');
  });

  it('OpenAI provider + tools + tool_choice required → tool_choice required', async () => {
    const { getCalls } = mockFetchOnce({
      choices: [{ message: { content: '', role: 'assistant' } }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = 'required';
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body.tool_choice).toBe('required');
  });

  it('OpenAI provider + tool_choice 指定 tool → {type:function,function:{name}}', async () => {
    const { getCalls } = mockFetchOnce({
      choices: [{ message: { content: '', role: 'assistant' } }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = { type: 'function', name: 'get_weather' };
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body.tool_choice).toEqual({
      type: 'function',
      function: { name: 'get_weather' },
    });
  });

  it('Claude provider + tools → tools Claude input_schema format + tool_choice {type:auto}', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.LLM_MODEL = 'claude-sonnet-4-6';
    process.env.LLM_BASE_URL = 'https://api.anthropic.com';
    const { getCalls } = mockFetchOnce({
      content: [{ type: 'text', text: '' }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = 'auto';
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body.tools).toEqual([
      {
        name: 'get_weather',
        description: 'Get weather for a city',
        input_schema: testTool.input_schema,
      },
    ]);
    expect(body.tool_choice).toEqual({ type: 'auto' });
  });

  it('Claude provider + tool_choice required → {type:any} (Claude "必调 tool" 语义)', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.LLM_MODEL = 'claude-sonnet-4-6';
    process.env.LLM_BASE_URL = 'https://api.anthropic.com';
    const { getCalls } = mockFetchOnce({
      content: [{ type: 'text', text: '' }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = 'required';
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body.tool_choice).toEqual({ type: 'any' });
  });

  it('Claude provider + tool_choice none → {type:none} (docs platform_claude_en_api)', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.LLM_MODEL = 'claude-sonnet-4-6';
    process.env.LLM_BASE_URL = 'https://api.anthropic.com';
    const { getCalls } = mockFetchOnce({
      content: [{ type: 'text', text: '' }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = 'none';
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body.tool_choice).toEqual({ type: 'none' });
  });

  it('Claude provider + tool_choice 指定 tool → {type:tool,name}', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.LLM_MODEL = 'claude-sonnet-4-6';
    process.env.LLM_BASE_URL = 'https://api.anthropic.com';
    const { getCalls } = mockFetchOnce({
      content: [{ type: 'text', text: '' }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = { type: 'function', name: 'get_weather' };
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'get_weather' });
  });

  it('OpenAI provider + tools 但空 toolChoice → body 有 tools 无 tool_choice', async () => {
    const { getCalls } = mockFetchOnce({
      choices: [{ message: { content: '', role: 'assistant' } }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    // toolChoice 不设
    await __llmClientTesting.callLLM([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body).toHaveProperty('tools');
    expect(body).not.toHaveProperty('tool_choice');
  });
});

// ── callLLMWithRetry 透传 tools ────────────────────────────────────

describe('callLLMWithRetry 透传 tools (TASK-M3-003 G3)', () => {
  it('retry 路径 config.tools 透传到 body (首次即成功, 验 tools 进 body)', async () => {
    const { getCalls } = mockFetchOnce({
      choices: [{ message: { content: '', role: 'assistant' } }],
    });
    const config = __llmClientTesting.loadLLMConfig();
    config.tools = [testTool];
    config.toolChoice = 'auto';
    await __llmClientTesting.callLLMWithRetry([{ role: 'user', content: 'hi' }], config);
    const body = JSON.parse(getCalls()[0].body);
    expect(body).toHaveProperty('tools');
    expect(body.tool_choice).toBe('auto');
  });
});

// ── parseLLMResponse tool_use 解析 (直接调, 非 fetch) ──────────────

describe('parseLLMResponse OpenAI tool_calls 解析 (TASK-M3-003 G3)', () => {
  const config = __llmClientTesting.loadLLMConfig();

  it('OpenAI tool_calls 数组 → LLMResponse.toolCalls 含 id/name/input', () => {
    const data = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_001',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"city":"Beijing"}',
                },
              },
            ],
          },
        },
      ],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('');
    expect(resp.toolCalls).toEqual([
      { id: 'call_001', name: 'get_weather', input: { city: 'Beijing' } },
    ]);
  });

  it('OpenAI text + tool_calls 共存 → content + toolCalls 都解析', () => {
    const data = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Let me check the weather.',
            tool_calls: [
              {
                id: 'call_002',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"city":"Shanghai"}',
                },
              },
            ],
          },
        },
      ],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('Let me check the weather.');
    expect(resp.toolCalls).toEqual([
      { id: 'call_002', name: 'get_weather', input: { city: 'Shanghai' } },
    ]);
  });

  it('OpenAI text-only (无 tool_calls) → toolCalls undefined (byte-for-byte)', () => {
    const data = {
      choices: [{ message: { role: 'assistant', content: 'just text' } }],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('just text');
    expect(resp.toolCalls).toBeUndefined();
  });

  it('OpenAI tool_calls malformed JSON arguments → input 空 object (fail-soft, 不 throw)', () => {
    const data = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_bad',
                type: 'function',
                function: { name: 'get_weather', arguments: '{not json' },
              },
            ],
          },
        },
      ],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.toolCalls).toEqual([
      { id: 'call_bad', name: 'get_weather', input: {} },
    ]);
  });
});

describe('parseLLMResponse Claude tool_use 解析 (TASK-M3-003 G3)', () => {
  const config = { ...__llmClientTesting.loadLLMConfig(), provider: 'claude' as const, model: 'claude-sonnet-4-6' };

  it('Claude tool_use block → LLMResponse.toolCalls 含 id/name/input', () => {
    const data = {
      content: [
        { type: 'tool_use', id: 'tu_01', name: 'get_weather', input: { city: 'Beijing' } },
      ],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('');
    expect(resp.toolCalls).toEqual([
      { id: 'tu_01', name: 'get_weather', input: { city: 'Beijing' } },
    ]);
  });

  it('Claude text + tool_use 共存 → content + toolCalls 都解析 (非替换 text 路径)', () => {
    const data = {
      content: [
        { type: 'text', text: 'Let me check the weather.' },
        { type: 'tool_use', id: 'tu_02', name: 'get_weather', input: { city: 'Shanghai' } },
      ],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('Let me check the weather.');
    expect(resp.toolCalls).toEqual([
      { id: 'tu_02', name: 'get_weather', input: { city: 'Shanghai' } },
    ]);
  });

  it('Claude text-only (无 tool_use) → toolCalls undefined (byte-for-byte)', () => {
    const data = {
      content: [{ type: 'text', text: 'just text' }],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('just text');
    expect(resp.toolCalls).toBeUndefined();
  });

  it('Claude 多个 tool_use block → toolCalls 数组含全部', () => {
    const data = {
      content: [
        { type: 'text', text: 'doing two things' },
        { type: 'tool_use', id: 'tu_a', name: 'get_weather', input: { city: 'A' } },
        { type: 'tool_use', id: 'tu_b', name: 'get_time', input: { tz: 'UTC' } },
      ],
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('doing two things');
    expect(resp.toolCalls).toHaveLength(2);
    expect(resp.toolCalls).toContainEqual({ id: 'tu_a', name: 'get_weather', input: { city: 'A' } });
    expect(resp.toolCalls).toContainEqual({ id: 'tu_b', name: 'get_time', input: { tz: 'UTC' } });
  });
});

describe('parseLLMResponse Ollama tool_calls 解析 (TASK-M3-003 G3)', () => {
  const config = { ...__llmClientTesting.loadLLMConfig(), provider: 'ollama' as const, model: 'llama3.1/latest' };

  it('Ollama message.tool_calls → LLMResponse.toolCalls (OpenAI-compatible)', () => {
    const data = {
      message: {
        role: 'assistant',
        content: 'calling tool',
        tool_calls: [
          {
            function: { name: 'get_weather', arguments: '{"city":"Beijing"}' },
          },
        ],
      },
    };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('calling tool');
    expect(resp.toolCalls).toEqual([
      { id: '', name: 'get_weather', input: { city: 'Beijing' } },
    ]);
  });

  it('Ollama text-only → toolCalls undefined (byte-for-byte)', () => {
    const data = { message: { role: 'assistant', content: 'plain text' } };
    const resp = __llmClientTesting.parseLLMResponse(data, config);
    expect(resp.content).toBe('plain text');
    expect(resp.toolCalls).toBeUndefined();
  });
});
