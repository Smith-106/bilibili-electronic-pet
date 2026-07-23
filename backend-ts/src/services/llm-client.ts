/**
 * LLM Service - Multi-provider support (OpenAI, Claude, Ollama)
 * Phase 2 of Enhancement Plan
 */

import type { MemoryContext } from '../app/memory/types.js';

// ============================================================
// Configuration
// ============================================================

/**
 * D2 callLLM tool-call (TASK-M3-003 G3): tool 定义. provider-agnostic 输入格式
 * (与 Claude input_schema 对齐; OpenAI 的 parameters 同形, callLLM 内做 provider 格式适配).
 * 不传 config.tools → byte-for-byte 无 tool 行为 (backward-compat).
 */
interface LLMTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * tool_choice 语义: 'auto' (LLM 自决) | 'none' (禁用 tool) | 'required' (必调 tool) |
 * {type:'function', name} (指定调某 tool). 不传 → 由 provider 默认 (通常 auto).
 */
type LLMToolChoice = 'auto' | 'none' | 'required' | { type: 'function'; name: string };

/** 解析后的 tool 调用结果 (provider-agnostic). 仅当 LLM 响应含 tool_use 时填充, 否则 undefined. */
interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface LLMConfig {
  provider: 'openai' | 'claude' | 'ollama';
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retries: number;
  /**
   * D2 tool-call (TASK-M3-003 G3): optional. 调用方传才启用 tool-call 主路径,
   * 不传 → body 不含 tools/tool_choice (byte-for-byte 现有 text-only 行为).
   * opt-in 即足够, 不加全局 flag (最小改动, 调用方不传 = byte-for-byte).
   */
  tools?: LLMTool[];
  toolChoice?: LLMToolChoice;
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
  /**
   * D2 tool-call (TASK-M3-003 G3): optional. 仅当 LLM 响应含 tool_use/tool_calls 时填充,
   * text-only 响应 → undefined (byte-for-byte, 调用方判 undefined 即旧路径).
   */
  toolCalls?: LLMToolCall[];
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
      // D2 tool-call (TASK-M3-003 G3): config.tools 存在时才加 tools/tool_choice (OpenAI function format).
      // 不存在 → body 与原 text-only byte-for-byte.
      const bodyObj: Record<string, unknown> = {
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };
      if (config.tools && config.tools.length > 0) {
        bodyObj.tools = config.tools.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.input_schema },
        }));
        if (config.toolChoice !== undefined) {
          // OpenAI tool_choice: 'auto'|'none'|'required' | {type:'function',function:{name}}
          if (typeof config.toolChoice === 'string') {
            bodyObj.tool_choice = config.toolChoice;
          } else {
            bodyObj.tool_choice = {
              type: 'function',
              function: { name: config.toolChoice.name },
            };
          }
        }
      }
      body = JSON.stringify(bodyObj);
    } else if (config.provider === 'claude') {
      url = `${config.baseUrl}/v1/messages`;
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      };
      const bodyObj: Record<string, unknown> = {
        model: config.model,
        messages: messages.map((m) => ({
          role: (m.role === 'system' ? 'user' : m.role) as 'user' | 'assistant',
          content: m.content,
        })),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      };
      if (config.tools && config.tools.length > 0) {
        // Claude tools format: {name, description, input_schema} (与 LLMTool 同形, 直接传).
        bodyObj.tools = config.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema,
        }));
        if (config.toolChoice !== undefined) {
          // Claude tool_choice (docs: platform_claude_en_api):
          //   {type:'auto'} (LLM 自决) | {type:'any'} (必调任一 tool) |
          //   {type:'tool', name} (指定 tool) | {type:'none'} (禁用 tool).
          // 我们 LLMToolChoice 'required' 语义 = "必调 tool" → Claude 'any'.
          if (typeof config.toolChoice === 'string') {
            bodyObj.tool_choice =
              config.toolChoice === 'auto'
                ? { type: 'auto' }
                : config.toolChoice === 'none'
                  ? { type: 'none' }
                  : { type: 'any' }; // 'required' → 'any'
          } else {
            bodyObj.tool_choice = { type: 'tool', name: config.toolChoice.name };
          }
        }
      }
      body = JSON.stringify(bodyObj);
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
    // D2 tool-call (TASK-M3-003 G3): OpenAI tool_calls (数组) → LLMToolCall[].
    // content 与 tool_calls 可共存 (text content 仍解析). 无 tool_calls → undefined (byte-for-byte).
    const rawToolCalls = msg?.tool_calls as Array<Record<string, unknown>> | undefined;
    const toolCalls = parseOpenAIToolCalls(rawToolCalls);
    return {
      content: (msg?.content as string) || '',
      provider: config.provider,
      model: config.model,
      ...(toolCalls ? { toolCalls } : {}),
    };
  }

  // Claude format
  if (data.content && Array.isArray(data.content)) {
    const contentBlocks = data.content as Array<Record<string, unknown>>;
    const textBlocks = contentBlocks
      .filter((b: Record<string, unknown>) => b.type === 'text')
      .map((b: Record<string, unknown>) => b.text)
      .join('');
    // D2 tool-call (TASK-M3-003 G3): Claude content 数组中 type==='tool_use' block (含 id/name/input)
    // → LLMToolCall[]. text blocks 仍走原 filter (非替换). 无 tool_use → undefined (byte-for-byte).
    const toolCalls = parseClaudeToolUses(contentBlocks);
    return {
      content: textBlocks,
      provider: config.provider,
      model: config.model,
      ...(toolCalls ? { toolCalls } : {}),
    };
  }

  // Ollama format
  const msg = data.message as Record<string, unknown> | undefined;
  if (msg?.content) {
    // D2 tool-call (TASK-M3-003 G3): Ollama message.tool_calls (OpenAI-compatible 格式, /api/chat).
    const rawToolCalls = msg.tool_calls as Array<Record<string, unknown>> | undefined;
    const toolCalls = parseOpenAIToolCalls(rawToolCalls);
    return {
      content: msg.content as string,
      provider: config.provider,
      model: config.model,
      ...(toolCalls ? { toolCalls } : {}),
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
// D2 tool-call parsing helpers (TASK-M3-003 G3)
// ============================================================

/**
 * OpenAI/Ollama tool_calls 数组 → LLMToolCall[]. 数组项形如:
 *   {id, type:'function', function:{name, arguments(JSON string)}}
 * 无 tool_calls 或解析失败 → undefined (caller 不挂 toolCalls → byte-for-byte).
 */
function parseOpenAIToolCalls(raw: Array<Record<string, unknown>> | undefined): LLMToolCall[] | undefined {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return undefined;
  const calls: LLMToolCall[] = [];
  for (const tc of raw) {
    const fn = tc.function as Record<string, unknown> | undefined;
    if (!fn) continue;
    const name = fn.name as string | undefined;
    if (!name) continue;
    // OpenAI arguments 是 JSON 字符串, 需 parse. 解析失败 → 空 object (不 throw, fail-soft).
    const argsRaw = fn.arguments;
    let input: Record<string, unknown> = {};
    if (typeof argsRaw === 'string') {
      try {
        const parsed = JSON.parse(argsRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          input = parsed as Record<string, unknown>;
        }
      } catch {
        // malformed JSON arguments → 空 input (不阻断, 调用方可据 name 判定)
      }
    } else if (argsRaw && typeof argsRaw === 'object' && !Array.isArray(argsRaw)) {
      // Ollama 可能传 object (非 string)
      input = argsRaw as Record<string, unknown>;
    }
    calls.push({ id: (tc.id as string) || '', name, input });
  }
  return calls.length > 0 ? calls : undefined;
}

/**
 * Claude content 数组中 type==='tool_use' block → LLMToolCall[].
 * block 形如: {type:'tool_use', id, name, input(object)}.
 * 无 tool_use block → undefined.
 */
function parseClaudeToolUses(blocks: Array<Record<string, unknown>>): LLMToolCall[] | undefined {
  const toolUseBlocks = blocks.filter((b) => b.type === 'tool_use');
  if (toolUseBlocks.length === 0) return undefined;
  const calls: LLMToolCall[] = [];
  for (const b of toolUseBlocks) {
    const name = b.name as string | undefined;
    if (!name) continue;
    const input = (b.input as Record<string, unknown> | undefined) ?? {};
    calls.push({ id: (b.id as string) || '', name, input });
  }
  return calls.length > 0 ? calls : undefined;
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
  memoryContext?: MemoryContext,
  threeLayerSegment?: string,
): LLMMessage[] {
  const lengthInstruction =
    lengthMode === 'long'
      ? '请详细展开回复，提供更多信息和细节。'
      : lengthMode === 'short'
        ? '简洁精炼地回复。保持简短友好。'
        : '请控制在2-3句话以内。回复像日常聊天一样自然。';

  const roleInstruction = roleCardPrompt ? `角色设定: ${roleCardPrompt}，不要跳出角色。` : '';

  // D4 三层角色 (TASK-005 G5, terminology.md ThreeLayerPersona):
  // threeLayerSegment 为空串 → 不追加 (byte-for-byte 单层 fallback, C-007 + backward-compat).
  // 非空 → 追加到 system message (Core Traits 人格底色 + Speaking Style 风格 + Dynamic State 当前状态).
  // 注: segment 已由 generator.ts 从 role_card.tone 解析+渲染 (parseThreeLayerPersona + renderThreeLayerPersonaSegment).
  const personaSegment = threeLayerSegment ? `\n${threeLayerSegment}` : '';

  const baseSystem =
    systemPrompt ||
    `你是 ${roleProfile}，一个B站用户。你要自然地回复评论，永远保持角色设定，不要跳出角色。${roleInstruction}`;

  const systemParts: LLMMessage[] = [
    {
      role: 'system',
      content: baseSystem + personaSegment,
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

  // D3 会话记忆上下文 (TASK-004 G4): 注入跨 turn 历史记忆 (用户之前说过什么/角色之前回过什么).
  // 与 knowledgeContext/searchContext 并列注入 system/user message. items 已按 confidence DESC +
  // updated_at DESC 排序并截断到 top-K (memory-service recall). 不传或空 → 完全跳过 (byte-for-byte 单轮行为).
  if (memoryContext && memoryContext.items.length > 0) {
    const memoryLines = memoryContext.items.map((item) => {
      const ts = item.updated_at.toISOString();
      return `- [${ts}] ${item.content}`;
    });
    systemParts.push({
      role: 'user',
      content: `历史记忆 (跨 turn 上下文, 按可信度排序):\n${memoryLines.join('\n')}`,
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
      // reliability fix: 4xx (400/401/403/404...) 是不可恢复的请求级错误 (鉴权失败/格式错误/
      // 模型不存在), 重试无意义只浪费配额 — 仅对 5xx/网络错误/超时重试. callLLM 抛的 error
      // message 格式 "LLM API error: <status> ...", 解析 status 判断.
      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      const statusMatch = errMsg.match(/LLM API error: (\d{3})/);
      const is4xx = statusMatch !== null && Number(statusMatch[1]) >= 400 && Number(statusMatch[1]) < 500;
      if (is4xx) {
        throw lastError;
      }
      if (attempt < config.retries - 1) {
        // reliability low fix: 加 jitter (full jitter 策略 — 随机 [0, delay]) 防雷同退避
        // 导致重试同步尖峰 (Thundering Herd). 原固定 2^attempt*1000 ms 无随机化.
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.floor(Math.random() * baseDelay);
        const delay = jitter;
        console.log(`[LLM] Retry ${attempt + 1}/${config.retries} after ${delay}ms (jittered)`);
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
  /** D3 会话记忆 (TASK-004 G4): optional, 不传或空时单轮行为不变 (backward-compat). */
  memoryContext?: MemoryContext;
  roleProfile: string;
  roleCardPrompt?: string;
  lengthMode: string;
  /**
   * D4 三层角色 (TASK-005 G5, terminology.md ThreeLayerPersona): optional.
   * 已渲染的人类可读三层片段 (Core Traits + Speaking Style + Dynamic State).
   * 空串或不传 → 不追加到 system message (byte-for-byte 单层 fallback, C-007 + backward-compat).
   * 由 generator.ts 从 role_card.tone 解析+渲染后注入.
   */
  threeLayerSegment?: string;
}): Promise<{
  reply_text: string;
  provider: string;
  used_fallback: boolean;
}> {
  const config = loadLLMConfig();
  const {
    systemPrompt,
    userComment,
    knowledgeContext,
    searchContext,
    memoryContext,
    roleProfile,
    roleCardPrompt,
    lengthMode,
    threeLayerSegment,
  } = params;
  const messages = buildMessages(
    systemPrompt,
    userComment,
    knowledgeContext,
    searchContext,
    roleProfile,
    roleCardPrompt,
    lengthMode,
    memoryContext,
    threeLayerSegment,
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
