import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type {
  IdentityLink,
  MemoryGrant,
  MemoryItem,
  MemorySpace,
  RoleCardValue,
  RuntimeSettings,
} from '../server/contracts.js';

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
  listMemorySpaces: (input: {
    limit: number;
    offset: number;
    spaceType?: string;
    subjectType?: string;
    subjectId?: string;
  }) => Promise<{ ok: boolean; items: MemorySpace[] }> | { ok: boolean; items: MemorySpace[] };
  createMemorySpace: (input: {
    space_key: string;
    space_type?: string;
    title: string;
    summary?: string;
  }) => Promise<{ ok: boolean; item: MemorySpace }> | { ok: boolean; item: MemorySpace };
  listMemoryItems: (input: {
    limit: number;
    offset: number;
    spaceId?: number;
    itemKey?: string;
    contentType?: string;
    source?: string;
  }) => Promise<{ ok: boolean; items: MemoryItem[] }> | { ok: boolean; items: MemoryItem[] };
  upsertMemoryItem: (input: {
    space_id: number;
    item_key: string;
    content: string;
    content_type?: string;
    source?: string;
    item_metadata?: Record<string, unknown>;
  }) => Promise<{ ok: boolean; item: MemoryItem }> | { ok: boolean; item: MemoryItem };
  listMemoryGrants: (input: {
    limit: number;
    offset: number;
    spaceId?: number;
    subjectType?: string;
    subjectId?: string;
  }) => Promise<{ ok: boolean; items: MemoryGrant[] }> | { ok: boolean; items: MemoryGrant[] };
  grantMemorySpaceAccess: (input: {
    space_id: number;
    subject_type: string;
    subject_id: string;
    access_level?: string;
  }) => Promise<{ ok: boolean; item: MemoryGrant }> | { ok: boolean; item: MemoryGrant };
  listMemoryIdentityLinks: (input: {
    limit: number;
    offset: number;
    subjectType?: string;
    subjectId?: string;
    platform?: string;
    externalId?: string;
  }) => Promise<{ ok: boolean; items: IdentityLink[] }> | { ok: boolean; items: IdentityLink[] };
  linkMemoryIdentity: (input: {
    subject_type: string;
    subject_id: string;
    platform?: string;
    external_id: string;
    display_name?: string | null;
  }) => Promise<{ ok: boolean; item: IdentityLink }> | { ok: boolean; item: IdentityLink };
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

function parseOptionalString(value: unknown, maxLength = 255): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalized = raw.trim().slice(0, maxLength);
  return normalized || undefined;
}

function parseOptionalInteger(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function registerAdminManagementRoutes(app: FastifyInstance, deps: AdminManagementRouteDependencies): void {
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

  app.get('/api/admin/memory/spaces', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const subjectType = parseOptionalString(query.subject_type, 64);
    const subjectId = parseOptionalString(query.subject_id, 128);

    if ((subjectType && !subjectId) || (!subjectType && subjectId)) {
      return reply.code(400).send({ detail: 'subject_pair_required' });
    }

    const response = await deps.listMemorySpaces({
      limit: deps.parseAdminLimit(query.limit, 200, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
      spaceType: parseOptionalString(query.space_type, 64),
      subjectType,
      subjectId,
    });
    return reply.send(response);
  });

  app.post('/api/admin/memory/spaces', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const spaceKey = String(body.space_key ?? '')
      .trim()
      .slice(0, 128);
    const spaceType = parseOptionalString(body.space_type, 64);
    const title = String(body.title ?? '')
      .trim()
      .slice(0, 128);
    const summary = String(body.summary ?? '')
      .trim()
      .slice(0, 4096);

    if (!spaceKey) {
      return reply.code(400).send({ detail: 'space_key_required' });
    }
    if (!title) {
      return reply.code(400).send({ detail: 'title_required' });
    }

    const response = await deps.createMemorySpace({
      space_key: spaceKey,
      space_type: spaceType,
      title,
      summary,
    });
    return reply.send(response);
  });

  app.get('/api/admin/memory/items', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const spaceId = parseOptionalInteger(query.space_id);
    if (query.space_id !== undefined && spaceId === undefined) {
      return reply.code(400).send({ detail: 'space_id_invalid' });
    }

    const response = await deps.listMemoryItems({
      limit: deps.parseAdminLimit(query.limit, 200, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
      spaceId,
      itemKey: parseOptionalString(query.item_key, 128),
      contentType: parseOptionalString(query.content_type, 64),
      source: parseOptionalString(query.source, 64),
    });
    return reply.send(response);
  });

  app.post('/api/admin/memory/items', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const spaceId = Number.parseInt(String(body.space_id ?? ''), 10);
    const itemKey = String(body.item_key ?? '')
      .trim()
      .slice(0, 128);
    const content = String(body.content ?? '')
      .trim()
      .slice(0, 65535);
    const contentType = parseOptionalString(body.content_type, 64);
    const source = parseOptionalString(body.source, 64);
    const itemMetadata =
      body.item_metadata && typeof body.item_metadata === 'object' && !Array.isArray(body.item_metadata)
        ? (body.item_metadata as Record<string, unknown>)
        : undefined;

    if (!Number.isFinite(spaceId) || spaceId <= 0) {
      return reply.code(400).send({ detail: 'space_id_required' });
    }
    if (!itemKey) {
      return reply.code(400).send({ detail: 'item_key_required' });
    }
    if (!content) {
      return reply.code(400).send({ detail: 'content_required' });
    }

    const response = await deps.upsertMemoryItem({
      space_id: spaceId,
      item_key: itemKey,
      content,
      content_type: contentType,
      source,
      item_metadata: itemMetadata,
    });
    return reply.send(response);
  });

  app.get('/api/admin/memory/grants', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const spaceId = parseOptionalInteger(query.space_id);
    if (query.space_id !== undefined && spaceId === undefined) {
      return reply.code(400).send({ detail: 'space_id_invalid' });
    }

    const response = await deps.listMemoryGrants({
      limit: deps.parseAdminLimit(query.limit, 200, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
      spaceId,
      subjectType: parseOptionalString(query.subject_type, 64),
      subjectId: parseOptionalString(query.subject_id, 128),
    });
    return reply.send(response);
  });

  app.post('/api/admin/memory/grants', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const spaceId = Number.parseInt(String(body.space_id ?? ''), 10);
    const subjectType = String(body.subject_type ?? '')
      .trim()
      .slice(0, 64);
    const subjectId = String(body.subject_id ?? '')
      .trim()
      .slice(0, 128);
    const accessLevel = parseOptionalString(body.access_level, 32);

    if (!Number.isFinite(spaceId) || spaceId <= 0) {
      return reply.code(400).send({ detail: 'space_id_required' });
    }
    if (!subjectType) {
      return reply.code(400).send({ detail: 'subject_type_required' });
    }
    if (!subjectId) {
      return reply.code(400).send({ detail: 'subject_id_required' });
    }

    const response = await deps.grantMemorySpaceAccess({
      space_id: spaceId,
      subject_type: subjectType,
      subject_id: subjectId,
      access_level: accessLevel,
    });
    return reply.send(response);
  });

  app.get('/api/admin/memory/identity-links', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.listMemoryIdentityLinks({
      limit: deps.parseAdminLimit(query.limit, 200, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
      subjectType: parseOptionalString(query.subject_type, 64),
      subjectId: parseOptionalString(query.subject_id, 128),
      platform: parseOptionalString(query.platform, 64),
      externalId: parseOptionalString(query.external_id, 128),
    });
    return reply.send(response);
  });

  app.post('/api/admin/memory/identity-links', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const subjectType = String(body.subject_type ?? '')
      .trim()
      .slice(0, 64);
    const subjectId = String(body.subject_id ?? '')
      .trim()
      .slice(0, 128);
    const platform = parseOptionalString(body.platform, 64);
    const externalId = String(body.external_id ?? '')
      .trim()
      .slice(0, 128);
    const displayName = parseOptionalString(body.display_name, 128) ?? null;

    if (!subjectType) {
      return reply.code(400).send({ detail: 'subject_type_required' });
    }
    if (!subjectId) {
      return reply.code(400).send({ detail: 'subject_id_required' });
    }
    if (!externalId) {
      return reply.code(400).send({ detail: 'external_id_required' });
    }

    const response = await deps.linkMemoryIdentity({
      subject_type: subjectType,
      subject_id: subjectId,
      platform,
      external_id: externalId,
      display_name: displayName,
    });
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
