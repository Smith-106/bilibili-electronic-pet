import { createHash } from 'node:crypto';

import type { GatewayPublishPayload } from '../contracts.js';
import { isNonEmptyString } from '../normalizers.js';

export function addBlocker(target: string[], message: string): void {
  if (message && !target.includes(message)) {
    target.push(message);
  }
}

export function parsePublishPayload(body: unknown): GatewayPublishPayload | null {
  if (typeof body !== 'object' || body == null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.comment_id) || !isNonEmptyString(record.reply_text)) {
    return null;
  }

  const forcePublish = Boolean(record.force_publish ?? false);
  const source = isNonEmptyString(record.source) ? record.source : 'bili-pet-bot';
  const traceId = isNonEmptyString(record.trace_id) ? record.trace_id : undefined;
  const canonicalId = isNonEmptyString(record.canonical_id) ? record.canonical_id : undefined;
  const containerId = isNonEmptyString(record.container_id) ? record.container_id : undefined;
  const userId = isNonEmptyString(record.user_id) ? record.user_id : undefined;
  const parentExternalId = isNonEmptyString(record.parent_external_id) ? record.parent_external_id : undefined;
  const routingMetadata =
    record.routing_metadata && typeof record.routing_metadata === 'object' && !Array.isArray(record.routing_metadata)
      ? Object.fromEntries(
          Object.entries(record.routing_metadata as Record<string, unknown>).flatMap(([key, value]) =>
            typeof value === 'string' && value.trim() ? [[key, value]] : [],
          ),
        )
      : undefined;

  return {
    comment_id: record.comment_id,
    reply_text: record.reply_text,
    force_publish: forcePublish,
    source,
    ...(traceId ? { trace_id: traceId } : {}),
    ...(canonicalId ? { canonical_id: canonicalId } : {}),
    ...(containerId ? { container_id: containerId } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...(parentExternalId ? { parent_external_id: parentExternalId } : {}),
    ...(routingMetadata && Object.keys(routingMetadata).length > 0 ? { routing_metadata: routingMetadata } : {}),
  };
}

export function buildReplyHash(commentId: string, replyText: string): string {
  const raw = `${commentId}::${replyText.trim()}`;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function gatewaySignaturePayload(payload: GatewayPublishPayload): Record<string, unknown> {
  return {
    comment_id: payload.comment_id,
    reply_text: payload.reply_text,
    force_publish: payload.force_publish,
    source: payload.source,
    ...(payload.trace_id ? { trace_id: payload.trace_id } : {}),
    ...(payload.canonical_id ? { canonical_id: payload.canonical_id } : {}),
    ...(payload.container_id ? { container_id: payload.container_id } : {}),
    ...(payload.user_id ? { user_id: payload.user_id } : {}),
    ...(payload.parent_external_id ? { parent_external_id: payload.parent_external_id } : {}),
    ...(payload.routing_metadata ? { routing_metadata: payload.routing_metadata } : {}),
  };
}
