/**
 * Shared dependencies + parse helpers for the admin-management route group.
 * Extracted from admin-management.ts (pure extraction, no behavior change).
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import type {
  IdentityLink,
  MemoryGrant,
  MemoryItem,
  MemorySpace,
  RoleCardValue,
  RuntimeSettings,
} from '../../server/contracts.js';

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

export function parseOptionalString(value: unknown, maxLength = 255): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalized = raw.trim().slice(0, maxLength);
  return normalized || undefined;
}

export function parseOptionalInteger(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
