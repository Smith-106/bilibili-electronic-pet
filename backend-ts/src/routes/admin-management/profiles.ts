/**
 * Style-profile + role-profile admin routes. Extracted from admin-management.ts.
 */

import type { FastifyInstance } from 'fastify';
import type { AdminManagementRouteDependencies } from './deps.js';

export function registerProfileRoutes(app: FastifyInstance, deps: AdminManagementRouteDependencies): void {
  app.get('/api/admin/style-profile', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const response = await deps.getStyleProfile();
    return reply.send(deps.normalizeStyleProfilePayload(response as unknown as Record<string, unknown>));
  });

  app.post('/api/admin/style-profile', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const value = String(body.style_profile ?? body.style ?? '')
      .trim()
      .toLowerCase();
    const allowed = new Set(['auto', 'empathy', 'meme', 'normal']);
    if (!allowed.has(value)) {
      return reply.code(400).send({ detail: 'invalid_style_profile' });
    }

    const response = await deps.setStyleProfile({ styleProfile: value });
    return reply.send(deps.normalizeStyleProfilePayload(response as unknown as Record<string, unknown>));
  });

  app.get('/api/admin/role-profile', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const response = await deps.getRoleProfile();
    return reply.send(deps.normalizeRoleProfilePayload(response as unknown as Record<string, unknown>));
  });

  app.post('/api/admin/role-profile', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const value = String(body.role_profile ?? body.role ?? '')
      .trim()
      .toLowerCase();
    const allowed = new Set(['auto', 'default', 'comfort', 'playful']);
    if (!allowed.has(value)) {
      return reply.code(400).send({ detail: 'invalid_role_profile' });
    }

    const response = await deps.setRoleProfile({ roleProfile: value });
    return reply.send(deps.normalizeRoleProfilePayload(response as unknown as Record<string, unknown>));
  });
}
