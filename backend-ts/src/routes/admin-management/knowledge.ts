/**
 * Knowledge admin routes. Extracted from admin-management.ts (pure extraction).
 */

import type { FastifyInstance } from 'fastify';
import type { AdminManagementRouteDependencies } from './deps.js';

export function registerKnowledgeRoutes(app: FastifyInstance, deps: AdminManagementRouteDependencies): void {
  app.get('/api/admin/knowledge', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.listKnowledgeEntries({
      limit: deps.parseAdminLimit(query.limit, 200, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.post('/api/admin/knowledge', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const category = String(body.category ?? '')
      .trim()
      .slice(0, 64);
    const title = String(body.title ?? '')
      .trim()
      .slice(0, 128);
    const content = String(body.content ?? '')
      .trim()
      .slice(0, 65535);

    if (!category) {
      return reply.code(400).send({ detail: 'category_required' });
    }
    if (!title) {
      return reply.code(400).send({ detail: 'title_required' });
    }
    if (!content) {
      return reply.code(400).send({ detail: 'content_required' });
    }

    const response = await deps.createKnowledgeEntry({ category, title, content });
    return reply.send(response);
  });

  app.post('/api/admin/knowledge/:entry_id/disable', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const entryId = Number.parseInt(String(params.entry_id), 10);
    if (!Number.isFinite(entryId) || entryId <= 0) {
      return reply.code(404).send({ detail: 'knowledge_not_found' });
    }

    const response = await deps.disableKnowledgeEntry({ entryId });
    return reply.send(response);
  });
}
