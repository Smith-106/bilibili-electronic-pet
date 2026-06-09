import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import {
  registerAdminManagementRoutes,
  type AdminManagementRouteDependencies,
} from '../src/routes/admin-management.js';
import type {
  IdentityLink,
  MemoryGrant,
  MemoryItem,
  MemorySpace,
  RoleCardValue,
  RuntimeSettings,
} from '../src/server/contracts.js';

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: 'admin-key',
    adminSessionSecret: 'secret',
    adminSessionTtlSeconds: 3600,
    llmProvider: 'mock',
    llmApiKeyConfigured: false,
    llmFallbackToMock: true,
    searchProvider: 'serpapi',
    searchApiKeyConfigured: false,
    searchCxConfigured: false,
    publisherMode: 'webhook',
    publisherWebhookUrlConfigured: false,
    bilibiliEnabled: false,
    bilibiliPollEnabled: false,
    bilibiliPollIntervalSeconds: 300,
    bilibiliPublishEnabled: false,
    bilibiliEnvCredentialConfigured: false,
    killSwitch: false,
    gatewayToken: '',
    gatewayHmacSecret: '',
    commentIngressToken: '',
    publicCompanionActionsEnabled: false,
    platformBilibiliEnabled: true,
    platformQqEnabled: true,
    platformDouyinEnabled: true,
    platformKuaishouEnabled: true,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}

function buildMemorySpace(overrides: Partial<MemorySpace> = {}): MemorySpace {
  return {
    id: 1,
    space_key: 'operator-main',
    space_type: 'operator',
    title: 'Operator',
    summary: '',
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function buildMemoryItem(overrides: Partial<MemoryItem> = {}): MemoryItem {
  return {
    id: 1,
    space_id: 1,
    item_key: 'summary',
    content: 'content',
    content_type: 'summary',
    source: 'manual',
    item_metadata: {},
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function buildMemoryGrant(overrides: Partial<MemoryGrant> = {}): MemoryGrant {
  return {
    id: 1,
    space_id: 1,
    subject_type: 'operator',
    subject_id: 'alice',
    access_level: 'write',
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function buildIdentityLink(overrides: Partial<IdentityLink> = {}): IdentityLink {
  return {
    id: 1,
    subject_type: 'operator',
    subject_id: 'alice',
    platform: 'bilibili',
    external_id: 'uid-1',
    display_name: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function normalizeRoleCardValue(value: unknown): RoleCardValue {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return String(value ?? '').trim();
}

function buildDeps(overrides: Partial<AdminManagementRouteDependencies> = {}): AdminManagementRouteDependencies {
  return {
    settings: buildSettings(),
    checkApiKey: (request, reply, settings) => {
      if (request.headers['x-api-key'] === settings.apiKey) return true;
      void reply.code(401).send({ detail: 'unauthorized' });
      return false;
    },
    parseAdminLimit: (value, defaultValue, min, max) => {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    },
    parseAdminOffset: (value, defaultValue, min, max) => {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    },
    normalizeStyleProfilePayload: (payload) => ({ ...payload, style_normalized: true }),
    normalizeRoleProfilePayload: (payload) => ({ ...payload, role_normalized: true }),
    normalizeRoleCardInputValue: vi.fn(normalizeRoleCardValue),
    listKnowledgeEntries: vi.fn(() => ({ ok: true, items: [] })),
    createKnowledgeEntry: vi.fn(({ category, title, content }) => ({
      ok: true,
      item: { id: 1, category, title, content },
    })),
    disableKnowledgeEntry: vi.fn(({ entryId }) => ({
      ok: true,
      item: { id: entryId, enabled: false, updated_at: null },
    })),
    listMemorySpaces: vi.fn(() => ({ ok: true, items: [buildMemorySpace()] })),
    createMemorySpace: vi.fn((input) => ({
      ok: true,
      item: buildMemorySpace({ ...input, space_type: input.space_type ?? 'default' }),
    })),
    listMemoryItems: vi.fn(() => ({ ok: true, items: [buildMemoryItem()] })),
    upsertMemoryItem: vi.fn((input) => ({ ok: true, item: buildMemoryItem(input) })),
    listMemoryGrants: vi.fn(() => ({ ok: true, items: [buildMemoryGrant()] })),
    grantMemorySpaceAccess: vi.fn((input) => ({ ok: true, item: buildMemoryGrant(input) })),
    listMemoryIdentityLinks: vi.fn(() => ({ ok: true, items: [buildIdentityLink()] })),
    linkMemoryIdentity: vi.fn((input) => ({
      ok: true,
      item: buildIdentityLink({
        subject_type: input.subject_type,
        subject_id: input.subject_id,
        platform: input.platform ?? '',
        external_id: input.external_id,
        display_name: input.display_name,
      }),
    })),
    getStyleProfile: vi.fn(() => ({ ok: true, style_profile: 'auto', preset_profiles: ['auto'] })),
    setStyleProfile: vi.fn(({ styleProfile }) => ({ ok: true, style_profile: styleProfile })),
    getRoleProfile: vi.fn(() => ({ ok: true, role_profile: 'auto', preset_profiles: ['auto'] })),
    setRoleProfile: vi.fn(({ roleProfile }) => ({ ok: true, role_profile: roleProfile })),
    listRoleCards: vi.fn(() => ({ ok: true, active_role_card_key: null, items: [] })),
    createRoleCard: vi.fn((input) => ({ ok: true, item: input })),
    updateRoleCard: vi.fn((input) => ({ ok: true, item: input })),
    disableRoleCard: vi.fn(({ cardKey }) => ({
      ok: true,
      item: { key: cardKey, enabled: false, is_active: false, updated_at: null },
    })),
    activateRoleCard: vi.fn(({ cardKey }) => ({ ok: true, active_role_card_key: cardKey })),
    ...overrides,
  };
}

function createApp(overrides: Partial<AdminManagementRouteDependencies> = {}) {
  const app = Fastify();
  const deps = buildDeps(overrides);
  registerAdminManagementRoutes(app, deps);
  return { app, deps };
}

describe('admin management route coverage extra', () => {
  it('stops unauthorized requests before calling management services', async () => {
    const listKnowledgeEntries = vi.fn(() => ({ ok: true, items: [] }));
    const { app } = createApp({ listKnowledgeEntries });

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/knowledge',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });
    expect(listKnowledgeEntries).not.toHaveBeenCalled();

    await app.close();
  });

  it('guards every management route before validation and service calls', async () => {
    const checkApiKey = vi.fn((request, reply) => {
      void reply.code(401).send({ detail: 'unauthorized' });
      return false;
    });
    const { app } = createApp({ checkApiKey });
    const requests = [
      { method: 'POST', url: '/api/admin/knowledge', payload: {} },
      { method: 'POST', url: '/api/admin/knowledge/not-a-number/disable' },
      { method: 'GET', url: '/api/admin/memory/spaces?subject_type=operator' },
      { method: 'POST', url: '/api/admin/memory/spaces', payload: {} },
      { method: 'GET', url: '/api/admin/memory/items?space_id=nope' },
      { method: 'POST', url: '/api/admin/memory/items', payload: {} },
      { method: 'GET', url: '/api/admin/memory/grants?space_id=nope' },
      { method: 'POST', url: '/api/admin/memory/grants', payload: {} },
      { method: 'GET', url: '/api/admin/memory/identity-links' },
      { method: 'POST', url: '/api/admin/memory/identity-links', payload: {} },
      { method: 'GET', url: '/api/admin/style-profile' },
      { method: 'POST', url: '/api/admin/style-profile', payload: {} },
      { method: 'GET', url: '/api/admin/role-profile' },
      { method: 'POST', url: '/api/admin/role-profile', payload: {} },
      { method: 'GET', url: '/api/admin/role-cards' },
      { method: 'POST', url: '/api/admin/role-cards', payload: {} },
      { method: 'POST', url: '/api/admin/role-cards/test-card', payload: {} },
      { method: 'POST', url: '/api/admin/role-cards/test-card/disable' },
      { method: 'POST', url: '/api/admin/role-cards/test-card/activate' },
    ] as const;

    for (const request of requests) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ detail: 'unauthorized' });
    }
    expect(checkApiKey).toHaveBeenCalledTimes(requests.length);

    await app.close();
  });

  it('validates knowledge create and disable inputs while forwarding trimmed values', async () => {
    const listKnowledgeEntries = vi.fn(() => ({ ok: true, items: [{ id: 1, title: 'Known' }] }));
    const createKnowledgeEntry = vi.fn(({ category, title, content }) => ({
      ok: true,
      item: { id: 1, category, title, content },
    }));
    const disableKnowledgeEntry = vi.fn(({ entryId }) => ({
      ok: true,
      item: { id: entryId, enabled: false, updated_at: null },
    }));
    const { app } = createApp({ listKnowledgeEntries, createKnowledgeEntry, disableKnowledgeEntry });
    const headers = { 'x-api-key': 'admin-key' };

    const listed = await app.inject({
      method: 'GET',
      url: '/api/admin/knowledge?limit=9999&offset=-5',
      headers,
    });
    const missingCategory = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      headers,
      payload: { title: 'Title', content: 'Content' },
    });
    const missingTitle = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      headers,
      payload: { category: 'manual', content: 'Content' },
    });
    const missingContent = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      headers,
      payload: { category: 'manual', title: 'Title' },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      headers,
      payload: { category: ' manual ', title: ' Title ', content: ' Content ' },
    });
    const invalidDisable = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge/not-a-number/disable',
      headers,
    });
    const disabled = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge/42/disable',
      headers,
    });

    expect(listed.json()).toEqual({ ok: true, items: [{ id: 1, title: 'Known' }] });
    expect(listKnowledgeEntries).toHaveBeenCalledWith({ limit: 1000, offset: 0 });
    expect(missingCategory.json()).toEqual({ detail: 'category_required' });
    expect(missingTitle.json()).toEqual({ detail: 'title_required' });
    expect(missingContent.json()).toEqual({ detail: 'content_required' });
    expect(created.json()).toEqual({
      ok: true,
      item: { id: 1, category: 'manual', title: 'Title', content: 'Content' },
    });
    expect(createKnowledgeEntry).toHaveBeenCalledWith({ category: 'manual', title: 'Title', content: 'Content' });
    expect(invalidDisable.statusCode).toBe(404);
    expect(invalidDisable.json()).toEqual({ detail: 'knowledge_not_found' });
    expect(disabled.json()).toEqual({ ok: true, item: { id: 42, enabled: false, updated_at: null } });
    expect(disableKnowledgeEntry).toHaveBeenCalledWith({ entryId: 42 });

    await app.close();
  });

  it('validates memory route inputs and forwards normalized values', async () => {
    const listMemorySpaces = vi.fn(() => ({ ok: true, items: [] }));
    const createMemorySpace = vi.fn((input) => ({ ok: true, item: buildMemorySpace(input) }));
    const listMemoryItems = vi.fn(() => ({ ok: true, items: [] }));
    const upsertMemoryItem = vi.fn((input) => ({ ok: true, item: buildMemoryItem(input) }));
    const listMemoryGrants = vi.fn(() => ({ ok: true, items: [] }));
    const grantMemorySpaceAccess = vi.fn((input) => ({ ok: true, item: buildMemoryGrant(input) }));
    const listMemoryIdentityLinks = vi.fn(() => ({ ok: true, items: [] }));
    const linkMemoryIdentity = vi.fn((input) => ({
      ok: true,
      item: buildIdentityLink({
        subject_type: input.subject_type,
        subject_id: input.subject_id,
        platform: input.platform ?? '',
        external_id: input.external_id,
        display_name: input.display_name,
      }),
    }));
    const { app } = createApp({
      listMemorySpaces,
      createMemorySpace,
      listMemoryItems,
      upsertMemoryItem,
      listMemoryGrants,
      grantMemorySpaceAccess,
      listMemoryIdentityLinks,
      linkMemoryIdentity,
    });
    const headers = { 'x-api-key': 'admin-key' };

    const subjectPair = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/spaces?subject_type=operator',
      headers,
    });
    const reverseSubjectPair = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/spaces?subject_id=alice',
      headers,
    });
    const listSpaces = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/spaces?limit=9999&offset=-5&space_type=%20operator%20&subject_type=operator&subject_id=alice',
      headers,
    });
    const arrayFilters = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/spaces?space_type=operator&space_type=ignored&subject_type=operator&subject_type=ignored&subject_id=alice&subject_id=ignored',
      headers,
    });
    const missingSpaceKey = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/spaces',
      headers,
      payload: { title: 'Title' },
    });
    const missingTitle = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/spaces',
      headers,
      payload: { space_key: 'key' },
    });
    const createdSpace = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/spaces',
      headers,
      payload: { space_key: ' key ', space_type: ' operator ', title: ' Title ', summary: ' Summary ' },
    });
    const invalidItemSpaceId = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/items?space_id=nope',
      headers,
    });
    const listItems = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/items?space_id=7&item_key=%20k%20&content_type=summary&source=manual&limit=9999&offset=-5',
      headers,
    });
    const listItemsWithoutSpaceId = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/items?item_key=k',
      headers,
    });
    const listItemsWithArraySpaceIdAndBlankFilters = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/items?space_id=7&space_id=8&item_key=%20&content_type=%20&source=%20',
      headers,
    });
    const missingItemSpaceId = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/items',
      headers,
      payload: { item_key: 'key', content: 'content' },
    });
    const missingItemKey = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/items',
      headers,
      payload: { space_id: 1, content: 'content' },
    });
    const missingItemContent = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/items',
      headers,
      payload: { space_id: 1, item_key: 'key' },
    });
    const upsertedItem = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/items',
      headers,
      payload: {
        space_id: '7',
        item_key: ' key ',
        content: ' content ',
        content_type: ' summary ',
        source: ' manual ',
        item_metadata: { confidence: 1 },
      },
    });
    const invalidGrantSpaceId = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/grants?space_id=nope',
      headers,
    });
    const listGrants = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/grants?space_id=7&subject_type=operator&subject_id=alice&limit=9999&offset=-5',
      headers,
    });
    const listGrantsWithoutSpaceId = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/grants?subject_type=operator',
      headers,
    });
    const missingGrantSpaceId = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/grants',
      headers,
      payload: { subject_type: 'operator', subject_id: 'alice' },
    });
    const missingSubjectType = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/grants',
      headers,
      payload: { space_id: 1, subject_id: 'alice' },
    });
    const missingSubjectId = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/grants',
      headers,
      payload: { space_id: 1, subject_type: 'operator' },
    });
    const granted = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/grants',
      headers,
      payload: { space_id: 7, subject_type: ' operator ', subject_id: ' alice ', access_level: ' write ' },
    });
    const listIdentityLinks = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/identity-links?subject_type=operator&subject_id=alice&platform=bilibili&external_id=uid-1&limit=9999&offset=-5',
      headers,
    });
    const missingIdentitySubjectType = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/identity-links',
      headers,
      payload: { subject_id: 'alice', external_id: 'uid-1' },
    });
    const missingIdentitySubjectId = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/identity-links',
      headers,
      payload: { subject_type: 'operator', external_id: 'uid-1' },
    });
    const missingExternalId = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/identity-links',
      headers,
      payload: { subject_type: 'operator', subject_id: 'alice' },
    });
    const linked = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/identity-links',
      headers,
      payload: {
        subject_type: ' operator ',
        subject_id: ' alice ',
        platform: ' bilibili ',
        external_id: ' uid-1 ',
        display_name: ' Alice ',
      },
    });

    expect(subjectPair.statusCode).toBe(400);
    expect(subjectPair.json()).toEqual({ detail: 'subject_pair_required' });
    expect(reverseSubjectPair.statusCode).toBe(400);
    expect(reverseSubjectPair.json()).toEqual({ detail: 'subject_pair_required' });
    expect(listSpaces.statusCode).toBe(200);
    expect(listMemorySpaces).toHaveBeenCalledWith({
      limit: 1000,
      offset: 0,
      spaceType: 'operator',
      subjectType: 'operator',
      subjectId: 'alice',
    });
    expect(arrayFilters.statusCode).toBe(200);
    expect(listMemorySpaces).toHaveBeenCalledWith({
      limit: 200,
      offset: 0,
      spaceType: 'operator',
      subjectType: 'operator',
      subjectId: 'alice',
    });
    expect(missingSpaceKey.json()).toEqual({ detail: 'space_key_required' });
    expect(missingTitle.json()).toEqual({ detail: 'title_required' });
    expect(createdSpace.json()).toMatchObject({ ok: true, item: { space_key: 'key', space_type: 'operator' } });
    expect(invalidItemSpaceId.json()).toEqual({ detail: 'space_id_invalid' });
    expect(listItems.statusCode).toBe(200);
    expect(listMemoryItems).toHaveBeenCalledWith({
      limit: 1000,
      offset: 0,
      spaceId: 7,
      itemKey: 'k',
      contentType: 'summary',
      source: 'manual',
    });
    expect(listItemsWithoutSpaceId.statusCode).toBe(200);
    expect(listMemoryItems).toHaveBeenCalledWith({
      limit: 200,
      offset: 0,
      spaceId: undefined,
      itemKey: 'k',
      contentType: undefined,
      source: undefined,
    });
    expect(listItemsWithArraySpaceIdAndBlankFilters.statusCode).toBe(200);
    expect(listMemoryItems).toHaveBeenCalledWith({
      limit: 200,
      offset: 0,
      spaceId: 7,
      itemKey: undefined,
      contentType: undefined,
      source: undefined,
    });
    expect(missingItemSpaceId.json()).toEqual({ detail: 'space_id_required' });
    expect(missingItemKey.json()).toEqual({ detail: 'item_key_required' });
    expect(missingItemContent.json()).toEqual({ detail: 'content_required' });
    expect(upsertedItem.json()).toMatchObject({ ok: true, item: { space_id: 7, item_key: 'key' } });
    expect(upsertMemoryItem).toHaveBeenCalledWith({
      space_id: 7,
      item_key: 'key',
      content: 'content',
      content_type: 'summary',
      source: 'manual',
      item_metadata: { confidence: 1 },
    });
    expect(invalidGrantSpaceId.json()).toEqual({ detail: 'space_id_invalid' });
    expect(listGrants.statusCode).toBe(200);
    expect(listMemoryGrants).toHaveBeenCalledWith({
      limit: 1000,
      offset: 0,
      spaceId: 7,
      subjectType: 'operator',
      subjectId: 'alice',
    });
    expect(listGrantsWithoutSpaceId.statusCode).toBe(200);
    expect(listMemoryGrants).toHaveBeenCalledWith({
      limit: 200,
      offset: 0,
      spaceId: undefined,
      subjectType: 'operator',
      subjectId: undefined,
    });
    expect(missingGrantSpaceId.json()).toEqual({ detail: 'space_id_required' });
    expect(missingSubjectType.json()).toEqual({ detail: 'subject_type_required' });
    expect(missingSubjectId.json()).toEqual({ detail: 'subject_id_required' });
    expect(granted.json()).toMatchObject({
      ok: true,
      item: { space_id: 7, subject_type: 'operator', subject_id: 'alice' },
    });
    expect(grantMemorySpaceAccess).toHaveBeenCalledWith({
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'write',
    });
    expect(listIdentityLinks.statusCode).toBe(200);
    expect(listMemoryIdentityLinks).toHaveBeenCalledWith({
      limit: 1000,
      offset: 0,
      subjectType: 'operator',
      subjectId: 'alice',
      platform: 'bilibili',
      externalId: 'uid-1',
    });
    expect(missingIdentitySubjectType.json()).toEqual({ detail: 'subject_type_required' });
    expect(missingIdentitySubjectId.json()).toEqual({ detail: 'subject_id_required' });
    expect(missingExternalId.json()).toEqual({ detail: 'external_id_required' });
    expect(linked.json()).toMatchObject({
      ok: true,
      item: {
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'bilibili',
        external_id: 'uid-1',
        display_name: 'Alice',
      },
    });

    await app.close();
  });

  it('normalizes style and role profile reads and writes including invalid input branches', async () => {
    const setStyleProfile = vi.fn(({ styleProfile }) => ({ ok: true, style_profile: styleProfile }));
    const setRoleProfile = vi.fn(({ roleProfile }) => ({ ok: true, role_profile: roleProfile }));
    const { app } = createApp({ setStyleProfile, setRoleProfile });
    const headers = { 'x-api-key': 'admin-key' };

    const getStyle = await app.inject({ method: 'GET', url: '/api/admin/style-profile', headers });
    const invalidStyle = await app.inject({
      method: 'POST',
      url: '/api/admin/style-profile',
      headers,
      payload: { style_profile: 'serious' },
    });
    const invalidStyleFallback = await app.inject({
      method: 'POST',
      url: '/api/admin/style-profile',
      headers,
      payload: {},
    });
    const setStyle = await app.inject({
      method: 'POST',
      url: '/api/admin/style-profile',
      headers,
      payload: { style: ' MEME ' },
    });
    const getRole = await app.inject({ method: 'GET', url: '/api/admin/role-profile', headers });
    const invalidRole = await app.inject({
      method: 'POST',
      url: '/api/admin/role-profile',
      headers,
      payload: { role_profile: 'villain' },
    });
    const invalidRoleFallback = await app.inject({
      method: 'POST',
      url: '/api/admin/role-profile',
      headers,
      payload: {},
    });
    const setRole = await app.inject({
      method: 'POST',
      url: '/api/admin/role-profile',
      headers,
      payload: { role: ' COMFORT ' },
    });

    expect(getStyle.json()).toEqual({
      ok: true,
      style_profile: 'auto',
      preset_profiles: ['auto'],
      style_normalized: true,
    });
    expect(invalidStyle.statusCode).toBe(400);
    expect(invalidStyle.json()).toEqual({ detail: 'invalid_style_profile' });
    expect(invalidStyleFallback.statusCode).toBe(400);
    expect(invalidStyleFallback.json()).toEqual({ detail: 'invalid_style_profile' });
    expect(setStyle.json()).toEqual({ ok: true, style_profile: 'meme', style_normalized: true });
    expect(setStyleProfile).toHaveBeenCalledWith({ styleProfile: 'meme' });
    expect(getRole.json()).toEqual({
      ok: true,
      role_profile: 'auto',
      preset_profiles: ['auto'],
      role_normalized: true,
    });
    expect(invalidRole.statusCode).toBe(400);
    expect(invalidRole.json()).toEqual({ detail: 'invalid_role_profile' });
    expect(invalidRoleFallback.statusCode).toBe(400);
    expect(invalidRoleFallback.json()).toEqual({ detail: 'invalid_role_profile' });
    expect(setRole.json()).toEqual({ ok: true, role_profile: 'comfort', role_normalized: true });
    expect(setRoleProfile).toHaveBeenCalledWith({ roleProfile: 'comfort' });

    await app.close();
  });

  it('covers role card list, create, update, disable, and activate branches', async () => {
    const listRoleCards = vi.fn(() => ({ ok: true, active_role_card_key: 'test-card', items: [] }));
    const createRoleCard = vi.fn((input) => ({ ok: true, item: input }));
    const updateRoleCard = vi.fn((input) => ({ ok: true, item: input }));
    const normalizeRoleCardInputValue = vi.fn(normalizeRoleCardValue);
    const { app } = createApp({ listRoleCards, createRoleCard, updateRoleCard, normalizeRoleCardInputValue });
    const headers = { 'x-api-key': 'admin-key' };

    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/role-cards?limit=9999&offset=-5',
      headers,
    });
    const missingKey = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      headers,
      payload: { name: 'Name' },
    });
    const missingName = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      headers,
      payload: { key: 'test-card' },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      headers,
      payload: {
        key: ' TEST-CARD ',
        name: ' Test Card ',
        description: ' Description ',
        system_prompt: ' Prompt ',
        tone: { mode: 'warm' },
        constraints: ' concise ',
        enabled: 0,
      },
    });
    const invalidUpdateName = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card',
      headers,
      payload: { name: '   ' },
    });
    const invalidUpdateNullName = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card',
      headers,
      payload: { name: null },
    });
    const fallbackUpdated = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card',
      headers,
      payload: { description: null, system_prompt: null },
    });
    const toneOnlyUpdated = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card',
      headers,
      payload: { tone: ' quiet ' },
    });
    const updated = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/ TEST-CARD ',
      headers,
      payload: {
        name: ' Updated ',
        description: ' New description ',
        system_prompt: ' New prompt ',
        tone: ' playful ',
        constraints: { max: 2 },
        enabled: '',
      },
    });
    const disabled = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/Test-Card/disable',
      headers,
    });
    const activated = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/Test-Card/activate',
      headers,
    });

    expect(list.json()).toEqual({ ok: true, active_role_card_key: 'test-card', items: [] });
    expect(listRoleCards).toHaveBeenCalledWith({ limit: 1000, offset: 0 });
    expect(missingKey.json()).toEqual({ detail: 'role_card_key_required' });
    expect(missingName.json()).toEqual({ detail: 'role_card_name_required' });
    expect(created.json()).toMatchObject({
      ok: true,
      item: {
        key: 'test-card',
        name: 'Test Card',
        description: 'Description',
        system_prompt: 'Prompt',
        tone: { mode: 'warm' },
        constraints: 'concise',
        enabled: false,
      },
    });
    expect(createRoleCard).toHaveBeenCalledWith({
      key: 'test-card',
      name: 'Test Card',
      description: 'Description',
      system_prompt: 'Prompt',
      tone: { mode: 'warm' },
      constraints: 'concise',
      enabled: false,
    });
    expect(invalidUpdateName.statusCode).toBe(400);
    expect(invalidUpdateName.json()).toEqual({ detail: 'role_card_name_required' });
    expect(invalidUpdateNullName.statusCode).toBe(400);
    expect(invalidUpdateNullName.json()).toEqual({ detail: 'role_card_name_required' });
    expect(fallbackUpdated.json()).toMatchObject({
      ok: true,
      item: {
        cardKey: 'test-card',
        description: '',
        system_prompt: '',
      },
    });
    expect(toneOnlyUpdated.json()).toMatchObject({
      ok: true,
      item: {
        cardKey: 'test-card',
        tone: 'quiet',
      },
    });
    expect(updated.json()).toMatchObject({
      ok: true,
      item: {
        cardKey: 'test-card',
        name: 'Updated',
        description: 'New description',
        system_prompt: 'New prompt',
        tone: 'playful',
        constraints: { max: 2 },
        enabled: false,
      },
    });
    expect(updateRoleCard).toHaveBeenCalledWith({
      cardKey: 'test-card',
      description: '',
      system_prompt: '',
    });
    expect(updateRoleCard).toHaveBeenCalledWith({
      cardKey: 'test-card',
      tone: 'quiet',
    });
    expect(updateRoleCard).toHaveBeenCalledWith({
      cardKey: 'test-card',
      name: 'Updated',
      description: 'New description',
      system_prompt: 'New prompt',
      tone: 'playful',
      constraints: { max: 2 },
      enabled: false,
    });
    expect(disabled.json()).toEqual({
      ok: true,
      item: { key: 'test-card', enabled: false, is_active: false, updated_at: null },
    });
    expect(activated.json()).toEqual({ ok: true, active_role_card_key: 'test-card' });
    expect(normalizeRoleCardInputValue).toHaveBeenCalledWith({ mode: 'warm' });
    expect(normalizeRoleCardInputValue).toHaveBeenCalledWith(' playful ');

    await app.close();
  });
});
