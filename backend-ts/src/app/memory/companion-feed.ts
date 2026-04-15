import { createMemoryService } from './memory-service.js';
import type { MemoryService, MemoryItemRecord, MemorySpaceRecord, UpsertMemoryItemInput } from './types.js';

export const COMPANION_SYSTEM_SPACE_KEY = 'companion:system';

async function ensureCompanionSystemSpace(service: MemoryService): Promise<MemorySpaceRecord> {
  const existing = await service.listSpaces({ spaceKeys: [COMPANION_SYSTEM_SPACE_KEY] });
  if (existing.length > 0) {
    return existing[0];
  }

  return service.createSpace({
    space_key: COMPANION_SYSTEM_SPACE_KEY,
    space_type: 'system',
    title: 'Companion System',
    summary: 'Auto-generated companion feed signals sourced from backend activity.',
  });
}

export async function upsertCompanionFeedItem(
  input: {
    itemKey: string;
    content: string;
    contentType?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  },
  service: MemoryService = createMemoryService(),
): Promise<MemoryItemRecord> {
  const space = await ensureCompanionSystemSpace(service);
  const payload: UpsertMemoryItemInput = {
    space_id: space.id,
    item_key: input.itemKey,
    content: input.content,
    content_type: input.contentType ?? 'companion_signal',
    source: input.source ?? 'system',
    item_metadata: input.metadata ?? {},
  };

  return service.upsertItem(payload);
}
