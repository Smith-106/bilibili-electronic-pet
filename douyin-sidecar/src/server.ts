import Fastify, { type FastifyInstance } from 'fastify';

export interface PublishPayload {
  platform: 'douyin';
  comment_id: string;
  reply_text: string;
  force_publish: boolean;
  trace_id: string;
}

export interface SidecarEnv {
  SIDEcar_PORT?: string;
  DOUYIN_SIDECAR_TOKEN?: string;
  DOUYIN_DRIVER_MODE?: string;
  DOUYIN_UPSTREAM_URL?: string;
  DOUYIN_UPSTREAM_TOKEN?: string;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeMode(value: string | undefined): 'mock' | 'webhook_proxy' {
  return value === 'webhook_proxy' ? 'webhook_proxy' : 'mock';
}

function isPublishPayload(value: unknown): value is PublishPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.platform === 'douyin' &&
    hasText(candidate.comment_id) &&
    hasText(candidate.reply_text) &&
    typeof candidate.force_publish === 'boolean' &&
    hasText(candidate.trace_id)
  );
}

async function publishViaWebhookProxy(payload: PublishPayload, env: NodeJS.ProcessEnv) {
  const upstreamUrl = env.DOUYIN_UPSTREAM_URL;
  if (!hasText(upstreamUrl)) {
    return { published: false, reason: 'not_configured' };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (hasText(env.DOUYIN_UPSTREAM_TOKEN)) {
    headers.Authorization = `Bearer ${env.DOUYIN_UPSTREAM_TOKEN}`;
  }

  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        published: false,
        reason:
          typeof parsed.reason === 'string' && parsed.reason
            ? parsed.reason
            : `upstream_${response.status}`,
      };
    }
    return {
      published: parsed.published !== false,
      reason:
        typeof parsed.reason === 'string' && parsed.reason ? parsed.reason : 'sidecar_publish_ok',
      published_at:
        typeof parsed.published_at === 'string' && parsed.published_at
          ? parsed.published_at
          : new Date().toISOString(),
    };
  } catch (error) {
    return {
      published: false,
      reason: error instanceof Error ? error.message : 'upstream_error',
    };
  }
}

export function createServer(env: NodeJS.ProcessEnv = process.env): FastifyInstance {
  const app = Fastify({ logger: true });
  const mode = normalizeMode(env.DOUYIN_DRIVER_MODE);
  const expectedToken = env.DOUYIN_SIDECAR_TOKEN;

  app.get('/health', async () => ({
    ok: true,
    service: 'douyin-sidecar',
    mode,
    upstream_configured: hasText(env.DOUYIN_UPSTREAM_URL),
  }));

  app.post('/publish', async (request, reply) => {
    if (hasText(expectedToken)) {
      const authHeader = request.headers.authorization;
      if (authHeader !== `Bearer ${expectedToken}`) {
        return reply.code(401).send({ published: false, reason: 'auth' });
      }
    }

    if (!isPublishPayload(request.body)) {
      return reply.code(400).send({ published: false, reason: 'invalid_payload' });
    }

    if (mode === 'mock') {
      return reply.send({
        published: true,
        reason: 'sidecar_publish_ok',
        published_at: new Date().toISOString(),
      });
    }

    const result = await publishViaWebhookProxy(request.body, env);
    const statusCode = result.published ? 200 : result.reason === 'auth' ? 401 : 502;
    return reply.code(statusCode).send(result);
  });

  return app;
}
