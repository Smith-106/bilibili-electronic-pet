import { getPrisma } from '../../lib/prisma.js';
import { DuplicateKeyError, isPrismaP2002 } from '../../lib/duplicate-key-error.js';
import type { RoleCard, RoleCardValue } from '../contracts.js';
import { normalizeNullableIsoTimestamp, normalizeRoleCardRecord, serializeRoleCardValue } from '../normalizers.js';

export function defaultGetStyleProfile(): { ok: boolean; style_profile: string; preset_profiles: string[] } {
  return {
    ok: true,
    style_profile: 'auto',
    preset_profiles: ['auto', 'empathy', 'meme', 'normal'],
  };
}

export async function defaultSetStyleProfile(input: {
  styleProfile: string;
}): Promise<{ ok: boolean; style_profile: string }> {
  // Update runtime setting via environment override
  process.env.STYLE_PROFILE_DEFAULT = input.styleProfile;
  return {
    ok: true,
    style_profile: input.styleProfile,
  };
}

export function defaultGetRoleProfile(): { ok: boolean; role_profile: string; preset_profiles: string[] } {
  return {
    ok: true,
    role_profile: process.env.ROLE_PROFILE_DEFAULT || 'auto',
    preset_profiles: ['auto', 'default', 'comfort', 'playful'],
  };
}

export async function defaultSetRoleProfile(input: {
  roleProfile: string;
}): Promise<{ ok: boolean; role_profile: string }> {
  // Update runtime setting via environment override
  process.env.ROLE_PROFILE_DEFAULT = input.roleProfile;
  return {
    ok: true,
    role_profile: input.roleProfile,
  };
}

export async function defaultListRoleCards(input: {
  limit: number;
  offset: number;
}): Promise<{ ok: boolean; active_role_card_key: string | null; items: RoleCard[] }> {
  const prisma = getPrisma();
  const items = await prisma.roleCard.findMany({
    orderBy: [{ is_active: 'desc' }, { updated_at: 'desc' }, { id: 'desc' }],
    skip: input.offset,
    take: input.limit,
  });
  const normalizedItems = items.map((item) => normalizeRoleCardRecord(item as unknown as Record<string, unknown>));

  return {
    ok: true,
    active_role_card_key: normalizedItems.find((item) => item.is_active)?.key ?? null,
    items: normalizedItems,
  };
}

export async function defaultCreateRoleCard(input: {
  key: string;
  name: string;
  description: string;
  system_prompt: string;
  tone: RoleCardValue;
  constraints: RoleCardValue;
  enabled: boolean;
}): Promise<{ ok: boolean; item: RoleCard }> {
  const prisma = getPrisma();
  let item;
  try {
    item = await prisma.roleCard.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
        system_prompt: input.system_prompt,
        tone: serializeRoleCardValue(input.tone),
        constraints: serializeRoleCardValue(input.constraints),
        enabled: input.enabled,
        is_active: false,
      },
    });
  } catch (error) {
    // ISS-002: admin create of @unique roleCard.key — P2002 = duplicate key resubmit.
    // catch-as-conflict → 409 (admin path, not publisher's duplicate-success).
    if (isPrismaP2002(error)) {
      throw new DuplicateKeyError('role_card_duplicate');
    }
    throw error;
  }

  return {
    ok: true,
    item: normalizeRoleCardRecord(item as unknown as Record<string, unknown>),
  };
}

export async function defaultUpdateRoleCard(input: {
  cardKey: string;
  name?: string;
  description?: string;
  system_prompt?: string;
  tone?: RoleCardValue;
  constraints?: RoleCardValue;
  enabled?: boolean;
}): Promise<{ ok: boolean; item: RoleCard }> {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.system_prompt !== undefined) {
    data.system_prompt = input.system_prompt;
  }
  if (input.tone !== undefined) {
    data.tone = serializeRoleCardValue(input.tone);
  }
  if (input.constraints !== undefined) {
    data.constraints = serializeRoleCardValue(input.constraints);
  }
  if (input.enabled !== undefined) {
    data.enabled = input.enabled;
  }

  const item = await prisma.roleCard.update({
    where: { key: input.cardKey },
    data,
  });

  return {
    ok: true,
    item: normalizeRoleCardRecord(item as unknown as Record<string, unknown>),
  };
}

export async function defaultDisableRoleCard(input: {
  cardKey: string;
}): Promise<{ ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } }> {
  const prisma = getPrisma();
  const item = await prisma.roleCard.update({
    where: { key: input.cardKey },
    data: {
      enabled: false,
      is_active: false,
      updated_at: new Date(),
    },
  });

  return {
    ok: true,
    item: {
      key: item.key,
      enabled: item.enabled,
      is_active: item.is_active,
      updated_at: normalizeNullableIsoTimestamp(item.updated_at),
    },
  };
}

export async function defaultActivateRoleCard(input: {
  cardKey: string;
}): Promise<{ ok: boolean; active_role_card_key: string }> {
  const prisma = getPrisma();
  await prisma.roleCard.updateMany({
    data: {
      is_active: false,
    },
  });
  const item = await prisma.roleCard.update({
    where: { key: input.cardKey },
    data: {
      enabled: true,
      is_active: true,
      updated_at: new Date(),
    },
  });

  return {
    ok: true,
    active_role_card_key: item.key,
  };
}
