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
  // 守护 env 数值配置：非数字/越界值回退到默认，避免 NaN 进请求体或 setTimeout。
  // 与 decider.ts REPLY_BASE_PROBABILITY / publisher.ts 超时阈值同一 isFinite 守护标准。
  // F2: temperature 收紧到 0-1 (Claude API 官方范围, OpenAI 也接受 0-1; 旧的 0-2 会放行 Claude 拒绝的 >1 值)。
  const tempRaw = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
  const temperature = Number.isFinite(tempRaw) && tempRaw >= 0 && tempRaw <= 1 ? tempRaw : 0.7;
  // F3: maxTokens 加上界 8192 (model cap 量级, 防 per-token 计费经济 DoS + 超 cap API 400)。
  const maxTokensRaw = parseInt(process.env.LLM_MAX_TOKENS || '150', 10);
  const maxTokens = Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 && maxTokensRaw <= 8192 ? maxTokensRaw : 150;
  // F1: timeoutMs 加上界 120000 (2min, 防单次挂起 LLM 调用 × retries 长期阻塞 worker 饥饿)。
  const timeoutRaw = parseInt(process.env.LLM_TIMEOUT || '30000', 10);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 && timeoutRaw <= 120000 ? timeoutRaw : 30000;
  // F5/F6: retries 下界 ≥1 (顺修 pre-existing throw undefined: retries=0 循环不执行 lastError 仍 undefined),
  // 上界降到 4 (对未限速外部 API 防滥用, 指数退避末次 8s 可接受)。
  const retriesRaw = parseInt(process.env.LLM_RETRIES || '2', 10);
  const retries = Number.isFinite(retriesRaw) && retriesRaw >= 1 && retriesRaw <= 4 ? retriesRaw : 2;

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
