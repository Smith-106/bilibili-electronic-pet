/**
 * Memory admin routes (spaces / items / grants / identity-links).
 * Extracted from admin-management.ts (pure extraction).
 */

import type { FastifyInstance } from 'fastify';
import { DuplicateKeyError } from '../../lib/duplicate-key-error.js';
import {
  parseOptionalInteger,
  parseOptionalString,
  type AdminManagementRouteDependencies,
} from './deps.js';

export function registerMemoryRoutes(app: FastifyInstance, deps: AdminManagementRouteDependencies): void {
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

    try {
      const response = await deps.createMemorySpace({
        space_key: spaceKey,
        space_type: spaceType,
        title,
        summary,
      });
      return reply.send(response);
    } catch (error) {
      // ISS-002: @unique space_key P2002 surfaced as DuplicateKeyError → 409 conflict.
      if (error instanceof DuplicateKeyError) {
        return reply.code(409).send({ detail: 'duplicate' });
      }
      throw error;
    }
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
}
