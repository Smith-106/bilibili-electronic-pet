import type { FastifyReply, FastifyRequest } from 'fastify';

import { verifyAdminSessionToken } from './admin-auth.js';
import type { RuntimeSettings } from './contracts.js';
import { isProductionRuntime } from './normalizers.js';
import { timingSafeStringCompare } from '../lib/timing-safe-compare.js';

function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }
  return String(value ?? '');
}

/** Check x-api-key header; returns false and sends 401 on failure */
function checkApiKey(request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings): boolean {
  const providedSessionToken = getHeaderValue(request.headers['x-admin-session']).trim();
  if (providedSessionToken && verifyAdminSessionToken(providedSessionToken, settings)) {
    return true;
  }

  const expected = settings.apiKey.trim();
  if (!expected) {
    if (isProductionRuntime()) {
      void reply.code(503).send({ detail: 'admin_auth_unconfigured' });
      return false;
    }
    return true;
  }

  const provided = getHeaderValue(request.headers['x-api-key']).trim();
  // security fix: timing-safe compare 防 apiKey timing attack (原 !== 非 constant-time).
  if (!timingSafeStringCompare(provided, expected)) {
    void reply.code(401).send({ detail: 'unauthorized' });
    return false;
  }
  return true;
}

function checkCommentIngressAuth(request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings): boolean {
  const expected = settings.commentIngressToken.trim();
  if (!expected) {
    if (isProductionRuntime()) {
      void reply.code(503).send({ detail: 'comment_ingress_auth_unconfigured' });
      return false;
    }
    return true;
  }

  const providedToken = getHeaderValue(request.headers['x-comment-ingress-token']).trim();
  const authorization = getHeaderValue(request.headers.authorization).trim();
  // security fix: timing-safe compare 防 ingress token timing attack (原 === 非 constant-time).
  // 两路都算再 OR (避免 || 短路泄露哪路匹配).
  const tokenMatch = timingSafeStringCompare(providedToken, expected);
  const bearerMatch = timingSafeStringCompare(authorization, `Bearer ${expected}`);
  if (tokenMatch || bearerMatch) {
    return true;
  }

  void reply.code(401).send({ detail: 'unauthorized' });
  return false;
}

export { checkApiKey, checkCommentIngressAuth, getHeaderValue };
