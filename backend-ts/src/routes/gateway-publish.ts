import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { getPrisma } from '../lib/prisma.js';
import { listPublishingPlatforms } from '../platforms/registry.js';
import type {
  AdminGatewayLogsResponse,
  GatewayPublishPayload,
  PlatformName,
  PublishExecutionResult,
  PublishFinalizeInput,
  PublishGatewayInput,
  PublishPlatformInput,
  PublishReservationInput,
  ReservePublishLogResult,
  RuntimeSettings,
} from '../server/contracts.js';

export type GatewayPublishRouteDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  getHeaderValue: (value: string | string[] | undefined) => string;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminString: (value: unknown) => string | undefined;
  parsePublishPayload: (body: unknown) => GatewayPublishPayload | null;
  buildReplyHash: (commentId: string, replyText: string) => string;
  gatewaySignaturePayload: (payload: GatewayPublishPayload) => Record<string, unknown>;
  createTraceId: (preferred?: string) => string;
  verifyPayloadSignature: (payload: Record<string, unknown>, secret: string, signature: string) => boolean;
  reservePublishLog: (input: PublishReservationInput) => Promise<ReservePublishLogResult> | ReservePublishLogResult;
  finalizePublishLog: (input: PublishFinalizeInput) => Promise<void> | void;
  publishGatewayReply: (input: PublishGatewayInput) => Promise<PublishExecutionResult> | PublishExecutionResult;
  publishPlatformReply: (input: PublishPlatformInput) => Promise<PublishExecutionResult> | PublishExecutionResult;
  normalizePublishFailureReason: (reason: string | undefined) => string;
  isPlatformEnabled: (platform: PlatformName, settings: RuntimeSettings) => boolean;
  getPlatformPublishSource: (platform: PlatformName, settings: RuntimeSettings) => string;
  listAdminGatewayLogs: (input: {
    commentId?: string;
    limit: number;
  }) => Promise<AdminGatewayLogsResponse> | AdminGatewayLogsResponse;
  normalizeIsoTimestamp: (value: Date | string | undefined) => string;
};

function normalizeGatewayLogItems(
  items: Array<Record<string, unknown>>,
  deps: GatewayPublishRouteDependencies,
): Array<Record<string, unknown>> {
  return items.map((item) => ({
    ...item,
    published_at: deps.normalizeIsoTimestamp(item.published_at as Date | string | undefined),
    created_at: deps.normalizeIsoTimestamp(item.created_at as Date | string | undefined),
  }));
}

export function registerGatewayPublishRoutes(
  app: FastifyInstance,
  deps: GatewayPublishRouteDependencies,
): void {
  const publishCore = async (
    requestBody: unknown,
    headers: Record<string, string | string[] | undefined>,
    platform?: PlatformName,
  ) => {
    const payload = deps.parsePublishPayload(requestBody);
    if (!payload) {
      return { statusCode: 400, body: { detail: 'invalid_payload' } };
    }

    const expectedApiKey = deps.settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = deps.getHeaderValue(headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return { statusCode: 401, body: { detail: 'unauthorized' } };
      }
    }

    const traceId = deps.createTraceId(payload.trace_id ?? deps.getHeaderValue(headers['x-trace-id']));

    const expectedToken = deps.settings.gatewayToken.trim();
    if (expectedToken) {
      const authorization = deps.getHeaderValue(headers.authorization);
      const expectedAuthorization = `Bearer ${expectedToken}`;
      if (authorization !== expectedAuthorization) {
        return { statusCode: 401, body: { detail: 'unauthorized' } };
      }
    }

    const hmacSecret = deps.settings.gatewayHmacSecret.trim();
    if (hmacSecret) {
      const signature = deps.getHeaderValue(headers['x-signature']);
      if (!signature) {
        return { statusCode: 401, body: { detail: 'missing_signature' } };
      }
      const valid = deps.verifyPayloadSignature(deps.gatewaySignaturePayload(payload), hmacSecret, signature);
      if (!valid) {
        return { statusCode: 401, body: { detail: 'invalid_signature' } };
      }
    }

    const resolvedPlatform: PlatformName = platform ?? 'bilibili';
    const canonicalCommentId = `${resolvedPlatform}:${payload.comment_id}`;
    const hashed = deps.buildReplyHash(payload.comment_id, payload.reply_text);

    const reservation = await deps.reservePublishLog({
      platform: resolvedPlatform,
      canonicalCommentId,
      commentId: payload.comment_id,
      replyHash: hashed,
      source: payload.source,
    });

    if (reservation.duplicate) {
      return {
        statusCode: 200,
        body: {
          ok: true,
          published: false,
          duplicate: true,
          reason: 'idempotent_replay',
          trace_id: traceId,
        },
      };
    }

    const publishResult = platform
      ? await deps.publishPlatformReply({
          platform,
          commentId: payload.comment_id,
          replyText: payload.reply_text,
          forcePublish: payload.force_publish,
          traceId,
        })
      : await deps.publishGatewayReply({
          commentId: payload.comment_id,
          replyText: payload.reply_text,
          forcePublish: payload.force_publish,
          source: payload.source,
          traceId,
        });

    if (!publishResult.published) {
      const normalizedReason = deps.normalizePublishFailureReason(publishResult.reason);
      await deps.finalizePublishLog({
        reservationKey: reservation.reservationKey,
        status: 'failed',
        source: payload.source,
        failureReason: normalizedReason,
      });
      return {
        statusCode: 200,
        body: {
          ok: false,
          published: false,
          reason: normalizedReason,
          comment_id: payload.comment_id,
          trace_id: traceId,
        },
      };
    }

    const sourceValue = platform ? deps.getPlatformPublishSource(platform, deps.settings) : payload.source;

    await deps.finalizePublishLog({
      reservationKey: reservation.reservationKey,
      status: publishResult.status ?? 'published',
      source: sourceValue,
      publishedAt: publishResult.publishedAt,
    });

    return {
      statusCode: 200,
      body: {
        ok: true,
        published: true,
        reason: publishResult.reason,
        comment_id: payload.comment_id,
        published_at: publishResult.publishedAt ? publishResult.publishedAt.toISOString() : null,
        trace_id: traceId,
      },
    };
  };

  app.post('/gateway/publish', async (request, reply) => {
    const result = await publishCore(
      request.body,
      request.headers as Record<string, string | string[] | undefined>,
    );
    return reply.code(result.statusCode).send(result.body);
  });

  const platformRoutes: PlatformName[] = listPublishingPlatforms();
  for (const platform of platformRoutes) {
    app.post(`/gateway/publish/${platform}`, async (request, reply) => {
      if (!deps.isPlatformEnabled(platform, deps.settings)) {
        return reply.code(403).send({ detail: 'platform_disabled' });
      }

      const result = await publishCore(
        request.body,
        request.headers as Record<string, string | string[] | undefined>,
        platform,
      );
      return reply.code(result.statusCode).send(result.body);
    });
  }

  app.get('/gateway/publish-logs', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();

    const limit = deps.parseAdminLimit(query.limit, 50, 1, 500);
    const offset = deps.parseAdminOffset(query.offset, 0, 0, 100000);
    const status = deps.parseAdminString(query.status);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.publishLog.count({ where }),
      prisma.publishLog.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
    ]);

    return reply.send({
      ok: true,
      total,
      items: items.map((item) => ({
        id: item.id,
        platform: item.platform,
        canonical_comment_id: item.canonical_comment_id,
        comment_id: item.comment_id,
        reply_hash: item.reply_hash,
        source: item.source,
        status: item.status,
        published_at: item.published_at?.toISOString() ?? null,
        failure_reason: item.failure_reason,
        created_at: item.created_at?.toISOString() ?? null,
      })),
    });
  });

  app.get('/api/admin/gateway/logs', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.listAdminGatewayLogs({
      commentId: deps.parseAdminString(query.comment_id),
      limit: deps.parseAdminLimit(query.limit, 50, 1, 200),
    });

    return reply.send({
      ok: true,
      ...response,
      items: normalizeGatewayLogItems(response.items, deps),
    });
  });

  app.get('/api/admin/gateway/publish-logs', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.listAdminGatewayLogs({
      commentId: deps.parseAdminString(query.comment_id),
      limit: deps.parseAdminLimit(query.limit, 50, 1, 200),
    });

    return reply.send({
      ...response,
      items: normalizeGatewayLogItems(response.items, deps),
    });
  });
}
