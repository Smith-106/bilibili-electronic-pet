import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { RoleCardValue, RuntimeSettings } from '../server/contracts.js';

export type AdminManagementRouteDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  normalizeStyleProfilePayload: (payload: Record<string, unknown>) => Record<string, unknown>;
  normalizeRoleProfilePayload: (payload: Record<string, unknown>) => Record<string, unknown>;
  normalizeRoleCardInputValue: (value: unknown) => RoleCardValue;
  listKnowledgeEntries: (input: {
    limit: number;
    offset: number;
  }) =>
    | Promise<{ ok: boolean; items: Array<Record<string, unknown>> }>
    | { ok: boolean; items: Array<Record<string, unknown>> };
  createKnowledgeEntry: (input: {
    category: string;
    title: string;
    content: string;
  }) => Promise<{ ok: boolean; item: Record<string, unknown> }> | { ok: boolean; item: Record<string, unknown> };
  disableKnowledgeEntry: (input: {
    entryId: number;
  }) =>
    | Promise<{ ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } }>
    | { ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } };
  getStyleProfile: () =>
    | Promise<{ ok: boolean; style_profile: string; preset_profiles: string[] }>
    | { ok: boolean; style_profile: string; preset_profiles: string[] };
  setStyleProfile: (input: {
    styleProfile: string;
  }) => Promise<{ ok: boolean; style_profile: string }> | { ok: boolean; style_profile: string };
  getRoleProfile: () =>
    | Promise<{ ok: boolean; role_profile: string; preset_profiles: string[] }>
    | { ok: boolean; role_profile: string; preset_profiles: string[] };
  setRoleProfile: (input: {
    roleProfile: string;
  }) => Promise<{ ok: boolean; role_profile: string }> | { ok: boolean; role_profile: string };
  listRoleCards: (input: {
    limit: number;
    offset: number;
  }) =>
    | Promise<{ ok: boolean; active_role_card_key: string | null; items: Array<Record<string, unknown>> }>
    | { ok: boolean; active_role_card_key: string | null; items: Array<Record<string, unknown>> };
  createRoleCard: (input: {
    key: string;
    name: string;
    description: string;
    system_prompt: string;
    tone: RoleCardValue;
    constraints: RoleCardValue;
    enabled: boolean;
  }) => Promise<{ ok: boolean; item: Record<string, unknown> }> | { ok: boolean; item: Record<string, unknown> };
  updateRoleCard: (input: {
    cardKey: string;
    name?: string;
    description?: string;
    system_prompt?: string;
    tone?: RoleCardValue;
    constraints?: RoleCardValue;
    enabled?: boolean;
  }) => Promise<{ ok: boolean; item: Record<string, unknown> }> | { ok: boolean; item: Record<string, unknown> };
  disableRoleCard: (input: {
    cardKey: string;
  }) =>
    | Promise<{ ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } }>
    | { ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } };
  activateRoleCard: (input: {
    cardKey: string;
  }) => Promise<{ ok: boolean; active_role_card_key: string }> | { ok: boolean; active_role_card_key: string };
};

export function registerAdminManagementRoutes(
  app: FastifyInstance,
  deps: AdminManagementRouteDependencies,
): void {
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
    const entryId = Number.parseInt(String(params.entry_id ?? ''), 10);
    if (!Number.isFinite(entryId) || entryId <= 0) {
      return reply.code(404).send({ detail: 'knowledge_not_found' });
    }

    const response = await deps.disableKnowledgeEntry({ entryId });
    return reply.send(response);
  });

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
  });

  app.post('/api/admin/role-cards/:card_key', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key ?? '')
      .trim()
      .toLowerCase()
      .slice(0, 64);
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
    const cardKey = String(params.card_key ?? '')
      .trim()
      .toLowerCase();

    const response = await deps.disableRoleCard({ cardKey });
    return reply.send(response);
  });

  app.post('/api/admin/role-cards/:card_key/activate', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key ?? '')
      .trim()
      .toLowerCase();

    const response = await deps.activateRoleCard({ cardKey });
    return reply.send(response);
  });
}
