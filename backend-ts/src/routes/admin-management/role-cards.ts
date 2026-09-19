/**
 * Role-card admin routes. Extracted from admin-management.ts (pure extraction).
 */

import type { FastifyInstance } from 'fastify';
import { DuplicateKeyError } from '../../lib/duplicate-key-error.js';
import type { RoleCardValue } from '../../server/contracts.js';
import type { AdminManagementRouteDependencies } from './deps.js';

export function registerRoleCardRoutes(app: FastifyInstance, deps: AdminManagementRouteDependencies): void {
  app.get('/api/admin/role-cards', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.listRoleCards({
      limit: deps.parseAdminLimit(query.limit, 200, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.post('/api/admin/role-cards', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const key = String(body.key ?? '')
      .trim()
      .toLowerCase()
      .slice(0, 64);
    const name = String(body.name ?? '')
      .trim()
      .slice(0, 128);
    const description = String(body.description ?? '')
      .trim()
      .slice(0, 65535);
    const systemPrompt = String(body.system_prompt ?? '')
      .trim()
      .slice(0, 65535);
    const tone = deps.normalizeRoleCardInputValue(body.tone);
    const constraints = deps.normalizeRoleCardInputValue(body.constraints);
    const enabled = Boolean(body.enabled ?? true);

    if (!key) {
      return reply.code(400).send({ detail: 'role_card_key_required' });
    }
    if (!name) {
      return reply.code(400).send({ detail: 'role_card_name_required' });
    }

    try {
      const response = await deps.createRoleCard({
        key,
        name,
        description,
        system_prompt: systemPrompt,
        tone,
        constraints,
        enabled,
      });
      return reply.send(response);
    } catch (error) {
      // ISS-002: @unique roleCard.key P2002 surfaced as DuplicateKeyError → 409 conflict.
      if (error instanceof DuplicateKeyError) {
        return reply.code(409).send({ detail: 'duplicate' });
      }
      throw error;
    }
  });

  app.post('/api/admin/role-cards/:card_key', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key).trim().toLowerCase().slice(0, 64);
    const body = request.body as Record<string, unknown>;

    const updateData: {
      cardKey: string;
      name?: string;
      description?: string;
      system_prompt?: string;
      tone?: RoleCardValue;
      constraints?: RoleCardValue;
      enabled?: boolean;
    } = { cardKey };

    if ('name' in body) {
      updateData.name = String(body.name ?? '')
        .trim()
        .slice(0, 128);
      if (!updateData.name) {
        return reply.code(400).send({ detail: 'role_card_name_required' });
      }
    }
    if ('description' in body) {
      updateData.description = String(body.description ?? '')
        .trim()
        .slice(0, 65535);
    }
    if ('system_prompt' in body) {
      updateData.system_prompt = String(body.system_prompt ?? '')
        .trim()
        .slice(0, 65535);
    }
    if ('tone' in body) {
      updateData.tone = deps.normalizeRoleCardInputValue(body.tone);
    }
    if ('constraints' in body) {
      updateData.constraints = deps.normalizeRoleCardInputValue(body.constraints);
    }
    if ('enabled' in body) {
      updateData.enabled = Boolean(body.enabled);
    }

    const response = await deps.updateRoleCard(updateData);
    return reply.send(response);
  });

  app.post('/api/admin/role-cards/:card_key/disable', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key).trim().toLowerCase();

    const response = await deps.disableRoleCard({ cardKey });
    return reply.send(response);
  });

  app.post('/api/admin/role-cards/:card_key/activate', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key).trim().toLowerCase();

    const response = await deps.activateRoleCard({ cardKey });
    return reply.send(response);
  });
}
