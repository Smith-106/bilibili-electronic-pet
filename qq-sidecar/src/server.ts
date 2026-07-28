import Fastify, { type FastifyInstance } from "fastify";

export interface PublishPayload {
  platform: "qq";
  target_kind?: "comment-reply" | "message";
  comment_id: string;
  canonical_id?: string;
  container_id?: string;
  parent_external_id?: string;
  routing_metadata?: Record<string, string>;
  reply_text: string;
  force_publish: boolean;
  trace_id: string;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// fetch timeout 防御 (对齐 backend sibling publisher.ts:538-539 / sidecar-webhook.ts):
// isFinite + 上界守护, 非 numeric env 回退 15s 默认, 防 AbortSignal.timeout(NaN) RangeError.
function resolveUpstreamTimeoutSeconds(
  env: NodeJS.ProcessEnv,
  envKey: string,
): number {
  const raw = Number.parseInt(env[envKey] || "15", 10);
  return Number.isFinite(raw) && raw > 0 && raw <= 300 ? raw : 15;
}

function normalizeMode(
  value: string | undefined,
): "mock" | "webhook_proxy" | "onebot_http" {
  if (value === "webhook_proxy") return "webhook_proxy";
  if (value === "onebot_http") return "onebot_http";
  return "mock";
}

function isPublishPayload(value: unknown): value is PublishPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.platform === "qq" &&
    hasText(candidate.comment_id) &&
    hasText(candidate.reply_text) &&
    typeof candidate.force_publish === "boolean" &&
    hasText(candidate.trace_id)
  );
}

async function publishViaWebhookProxy(
  payload: PublishPayload,
  env: NodeJS.ProcessEnv,
) {
  const upstreamUrl = env.QQ_UPSTREAM_URL;
  if (!hasText(upstreamUrl)) {
    return { published: false, reason: "not_configured" };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (hasText(env.QQ_UPSTREAM_TOKEN)) {
    headers.Authorization = `Bearer ${env.QQ_UPSTREAM_TOKEN}`;
  }

  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(
        resolveUpstreamTimeoutSeconds(env, "QQ_UPSTREAM_TIMEOUT_SECONDS") *
          1000,
      ),
    });
    const parsed = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      return {
        published: false,
        reason:
          typeof parsed.reason === "string" && parsed.reason
            ? parsed.reason
            : `upstream_${response.status}`,
      };
    }
    return {
      published: parsed.published !== false,
      reason:
        typeof parsed.reason === "string" && parsed.reason
          ? parsed.reason
          : "sidecar_publish_ok",
      published_at:
        typeof parsed.published_at === "string" && parsed.published_at
          ? parsed.published_at
          : new Date().toISOString(),
    };
  } catch {
    // CWE-209: 不透传原始 error.message 进 HTTP body (reason 经 route reply.code(502).send
    // 序列化, 显式 send 绕过 setErrorHandler). 收敛为固定 enum, error 仅服务端 logger 可见.
    return {
      published: false,
      reason: "upstream_error",
    };
  }
}

function joinActionUrl(baseUrl: string, action: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  return `${normalizedBaseUrl}/${action}`;
}

function buildOneBotMessage(
  payload: PublishPayload,
): Array<{ type: "reply" | "text"; data: Record<string, string> }> {
  const replyToMessageId =
    payload.routing_metadata?.reply_to_message_id ||
    payload.parent_external_id ||
    payload.comment_id;

  return [
    {
      type: "reply",
      data: {
        id: replyToMessageId,
      },
    },
    {
      type: "text",
      data: {
        text: payload.reply_text,
      },
    },
  ];
}

function resolveOneBotAction(
  payload: PublishPayload,
):
  | {
      action: "send_group_msg";
      params: {
        group_id: string;
        message: Array<{
          type: "reply" | "text";
          data: Record<string, string>;
        }>;
      };
    }
  | {
      action: "send_private_msg";
      params: {
        user_id: string;
        message: Array<{
          type: "reply" | "text";
          data: Record<string, string>;
        }>;
      };
    }
  | null {
  const chatType = payload.routing_metadata?.chat_type?.trim().toLowerCase();
  const groupId = payload.routing_metadata?.group_id || payload.container_id;
  const userId = payload.routing_metadata?.user_id;
  const message = buildOneBotMessage(payload);

  if ((chatType === "group" || !chatType) && hasText(groupId)) {
    return {
      action: "send_group_msg",
      params: {
        group_id: groupId,
        message,
      },
    };
  }

  if ((chatType === "private" || !hasText(groupId)) && hasText(userId)) {
    return {
      action: "send_private_msg",
      params: {
        user_id: userId,
        message,
      },
    };
  }

  return null;
}

async function publishViaOneBotHttp(
  payload: PublishPayload,
  env: NodeJS.ProcessEnv,
) {
  const onebotUrl = env.QQ_ONEBOT_URL;
  if (!hasText(onebotUrl)) {
    return { published: false, reason: "not_configured" };
  }

  const resolvedAction = resolveOneBotAction(payload);
  if (!resolvedAction) {
    return { published: false, reason: "unsupported_target" };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (hasText(env.QQ_ONEBOT_TOKEN)) {
    headers.Authorization = `Bearer ${env.QQ_ONEBOT_TOKEN}`;
  }

  try {
    const response = await fetch(
      joinActionUrl(onebotUrl, resolvedAction.action),
      {
        method: "POST",
        headers,
        body: JSON.stringify(resolvedAction.params),
        signal: AbortSignal.timeout(
          resolveUpstreamTimeoutSeconds(env, "QQ_ONEBOT_TIMEOUT_SECONDS") *
            1000,
        ),
      },
    );
    const parsed = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      return {
        published: false,
        reason: `onebot_http_${response.status}`,
      };
    }

    const status = typeof parsed.status === "string" ? parsed.status : "";
    const retcode = typeof parsed.retcode === "number" ? parsed.retcode : 0;
    if (status === "failed" || retcode > 1) {
      return {
        published: false,
        reason:
          typeof parsed.wording === "string" && parsed.wording
            ? parsed.wording
            : `onebot_retcode_${retcode}`,
      };
    }

    return {
      published: true,
      reason: "onebot_http_ok",
      published_at: new Date().toISOString(),
    };
  } catch {
    // CWE-209: 不透传原始 error.message 进 HTTP body (同 publishViaWebhookProxy).
    return {
      published: false,
      reason: "onebot_http_error",
    };
  }
}

export function createServer(
  env: NodeJS.ProcessEnv = process.env,
): FastifyInstance {
  const app = Fastify({ logger: true });

  // CWE-209 纵深防御: 未显式 reply.code().send() 的 throw (运行时异常/JSON 序列化错) 兜底为
  // 500 {detail:'internal_error'}, 不透传原始 error.message 给客户端. 显式 send 路径不受影响.
  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(statusCode).send({ detail: message });
    }
    request.log.error({ err: error }, "unhandled_error");
    return reply.code(500).send({ detail: "internal_error" });
  });

  const mode = normalizeMode(env.QQ_DRIVER_MODE);
  const expectedToken = env.QQ_SIDECAR_TOKEN;

  app.get("/health", async () => ({
    ok: true,
    service: "qq-sidecar",
    mode,
    upstream_configured: hasText(env.QQ_UPSTREAM_URL),
    onebot_configured: hasText(env.QQ_ONEBOT_URL),
  }));

  app.post("/publish", async (request, reply) => {
    if (hasText(expectedToken)) {
      const authHeader = request.headers.authorization;
      if (authHeader !== `Bearer ${expectedToken}`) {
        return reply.code(401).send({ published: false, reason: "auth" });
      }
    }

    if (!isPublishPayload(request.body)) {
      return reply
        .code(400)
        .send({ published: false, reason: "invalid_payload" });
    }

    if (mode === "mock") {
      return reply.send({
        published: true,
        reason: "sidecar_publish_ok",
        published_at: new Date().toISOString(),
      });
    }

    const result =
      mode === "webhook_proxy"
        ? await publishViaWebhookProxy(request.body, env)
        : await publishViaOneBotHttp(request.body, env);
    const statusCode = result.published
      ? 200
      : result.reason === "auth"
        ? 401
        : 502;
    return reply.code(statusCode).send(result);
  });

  return app;
}
