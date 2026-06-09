/**
 * LLM Service - Multi-provider support (OpenAI, Claude, Ollama)
 * Phase 2 of Enhancement Plan
 */

// ============================================================
// Configuration
// ============================================================

interface LLMConfig {
  provider: 'openai' | 'claude' | 'ollama';
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retries: number;
}

function loadLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'openai') as LLMConfig['provider'];
  if (!['openai', 'claude', 'ollama'].includes(provider)) {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}. Use openai, claude, or ollama`);
  }
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || '';
  const baseUrl = process.env.LLM_BASE_URL || '';
  const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
  const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '150', 10);
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT || '30000', 10);
  const retries = parseInt(process.env.LLM_RETRIES || '2') as LLMConfig['retries'];

  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        apiKey,
        model: model || 'gpt-4',
        baseUrl: baseUrl || 'https://api.openai.com/v1',
        temperature,
        maxTokens,
        timeoutMs,
        retries,
      };
    case 'claude':
      return {
        provider: 'claude',
        apiKey,
        model: model || 'claude-sonnet-4-6',
        baseUrl: baseUrl || 'https://api.anthropic.com',
        temperature,
        maxTokens,
        timeoutMs,
        retries,
      };
    case 'ollama':
      return {
        provider: 'ollama',
        apiKey: '',
        model: model || 'llama3.1/latest',
        baseUrl: baseUrl || 'http://localhost:11434',
        temperature,
        maxTokens,
        timeoutMs,
        retries,
      };
  }
}

// ============================================================
// LLM Client - Raw API calls
// ============================================================

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  provider: string;
  model: string;
}

async function callLLM(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    let url: string;
    let body: string;
    let headers: Record<string, string>;

    if (config.provider === 'openai' || config.provider === 'ollama') {
      url = `${config.baseUrl}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      };
      body = JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      });
    } else if (config.provider === 'claude') {
      url = `${config.baseUrl}/v1/messages`;
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      };
      body = JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({
          role: (m.role === 'system' ? 'user' : m.role) as 'user' | 'assistant',
          content: m.content,
        })),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });
    } else {
      throw new Error(`Unknown provider: ${config.provider}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} ${response.statusText}: ${errorText}`);
    }
    const data = await response.json();
    return parseLLMResponse(data, config);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`LLM timeout after ${config.timeoutMs}ms`);
    }
    throw new Error(`LLM error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseLLMResponse(data: Record<string, unknown>, config: LLMConfig): LLMResponse {
  // OpenAI format
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (choices && choices.length > 0) {
    const choice = choices[0];
    const msg = choice.message as Record<string, unknown> | undefined;
    return {
      content: (msg?.content as string) || '',
      provider: config.provider,
      model: config.model,
    };
  }

  // Claude format
  if (data.content && Array.isArray(data.content)) {
    const textBlocks = data.content
      .filter((b: Record<string, unknown>) => b.type === 'text')
      .map((b: Record<string, unknown>) => b.text)
      .join('');
    return {
      content: textBlocks,
      provider: config.provider,
      model: config.model,
    };
  }

  // Ollama format
  const msg = data.message as Record<string, unknown> | undefined;
  if (msg?.content) {
    return {
      content: msg.content as string,
      provider: config.provider,
      model: config.model,
    };
  }

  // Fallback
  return {
    content: typeof data === 'string' ? data : String(data),
    provider: config.provider,
    model: config.model,
  };
}

// ============================================================
// Build messages
// ============================================================

function buildMessages(
  systemPrompt: string,
  userComment: string,
  knowledgeContext: string,
  searchContext: string,
  roleProfile: string,
  roleCardPrompt: string | undefined,
  lengthMode: string,
): LLMMessage[] {
  const lengthInstruction =
    lengthMode === 'long'
      ? '请详细展开回复，提供更多信息和细节。'
      : lengthMode === 'short'
        ? '简洁精炼地回复。保持简短友好。'
        : '请控制在2-3句话以内。回复像日常聊天一样自然。';

  const roleInstruction = roleCardPrompt ? `角色设定: ${roleCardPrompt}，不要跳出角色。` : '';

  const systemParts: LLMMessage[] = [
    {
      role: 'system',
      content:
        systemPrompt ||
        `你是 ${roleProfile}，一个B站用户。你要自然地回复评论，永远保持角色设定，不要跳出角色。${roleInstruction}`,
    },
  ];

  if (knowledgeContext) {
    systemParts.push({
      role: 'user',
      content: `参考资料: ${knowledgeContext}`,
    });
  }

  if (searchContext) {
    systemParts.push({
      role: 'user',
      content: `搜索结果: ${searchContext}`,
    });
  }
  if (roleCardPrompt) {
    systemParts.push({
      role: 'user',
      content: `角色卡: ${roleCardPrompt}`,
    });
  }

  systemParts.push({
    role: 'user',
    content: `${userComment}\n\n${lengthInstruction}`,
  });

  return systemParts;
}

// ============================================================
// Retry wrapper
// ============================================================

async function callLLMWithRetry(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.retries; attempt++) {
    try {
      return await callLLM(messages, config);
    } catch (error) {
      lastError = error as Error;
      if (attempt < config.retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[LLM] Retry ${attempt + 1}/${config.retries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ============================================================
// Public API
// ============================================================

export async function generateWithLLM(params: {
  systemPrompt: string;
  userComment: string;
  knowledgeContext: string;
  searchContext: string;
  roleProfile: string;
  roleCardPrompt?: string;
  lengthMode: string;
}): Promise<{
  reply_text: string;
  provider: string;
  used_fallback: boolean;
}> {
  const config = loadLLMConfig();
  const { systemPrompt, userComment, knowledgeContext, searchContext, roleProfile, roleCardPrompt, lengthMode } =
    params;
  const messages = buildMessages(
    systemPrompt,
    userComment,
    knowledgeContext,
    searchContext,
    roleProfile,
    roleCardPrompt,
    lengthMode,
  );

  try {
    const response = await callLLMWithRetry(messages, config);
    return {
      reply_text: response.content.trim(),
      provider: response.provider,
      used_fallback: false,
    };
  } catch (error) {
    console.error('[LLM] Primary provider failed, using fallback:', error);
    return {
      reply_text: generateFallbackReply(userComment, roleProfile, lengthMode),
      provider: 'fallback',
      used_fallback: true,
    };
  }
}

function generateFallbackReply(_comment: string, _roleProfile: string, _lengthMode: string): string {
  const templates = ['收到你的评论了!谢谢支持~', '你好呀,感谢关注~', '哈哈, 有意思~'];
  return templates[Math.floor(Math.random() * templates.length)];
}

export const __llmClientTesting = {
  buildMessages,
  callLLM,
  callLLMWithRetry,
  generateFallbackReply,
  loadLLMConfig,
  parseLLMResponse,
};
