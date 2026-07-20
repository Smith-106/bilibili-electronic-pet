import { createMemoryRepository, type MemoryRepository } from '../../infra/db/repositories/memory-repository.js';
import type {
  CreateMemorySpaceInput,
  ListIdentityLinkOptions,
  ListMemoryGrantOptions,
  ListMemoryItemOptions,
  ListMemorySpaceOptions,
  MemoryItemRecord,
  MemoryService,
  RecallMemoryResult,
  UpsertIdentityLinkInput,
  UpsertMemoryGrantInput,
  UpsertMemoryItemInput,
} from './types.js';

// D3 会话记忆召回 (TASK-004 G4, C-003): MEMORY_RECALL_LIMIT 控制注入 LLM 的记忆条目上限,
// 防爆 context window. env 走 process.env 内联读取 (与 llm-client.ts loadLLMConfig 同 pattern,
// 非 env-config 中心列表 — TASK-003 发现). 非正整数/越界回退默认 20.
const DEFAULT_MEMORY_RECALL_LIMIT = 20;
const MAX_MEMORY_RECALL_LIMIT = 1000;

function resolveMemoryRecallLimit(): number {
  const raw = parseInt(process.env.MEMORY_RECALL_LIMIT || String(DEFAULT_MEMORY_RECALL_LIMIT), 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_MEMORY_RECALL_LIMIT;
  }
  // 上界防误配超大值绕过截断意图 (C-003 防 context window 爆).
  return raw > MAX_MEMORY_RECALL_LIMIT ? MAX_MEMORY_RECALL_LIMIT : raw;
}

// G4 可信度阈值过滤 (TASK-M3-004): MEMORY_CONFIDENCE_THRESHOLD 控制 recall 只召回高可信度记忆.
// 默认 0 → 不过滤, byte-for-byte 全量召回 (backward-compat, 用户 opt-in 设 0.5 启用过滤).
// env 走 process.env 内联读取 (与 resolveMemoryRecallLimit 同 pattern, C-009 零 migration).
// 非有限数/负数回退默认 0 (fail-open, 不阻断召回). >1 视为 1 (只召回 confidence=1).
const DEFAULT_MEMORY_CONFIDENCE_THRESHOLD = 0;

function resolveConfidenceThreshold(): number {
  const raw = Number(process.env.MEMORY_CONFIDENCE_THRESHOLD ?? String(DEFAULT_MEMORY_CONFIDENCE_THRESHOLD));
  if (!Number.isFinite(raw) || raw < 0) {
    return DEFAULT_MEMORY_CONFIDENCE_THRESHOLD;
  }
  if (raw > 1) {
    return 1;
  }
  return raw;
}

/**
 * 从 item_metadata.confidence 读取可信度 (number 0-1).
 * 缺失/非有限数视为 0 (低优先级), 不抛错 — recall fail-open 不阻断主流程.
 */
function readConfidence(item: MemoryItemRecord): number {
  const raw = item.item_metadata?.confidence;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 0;
  }
  return raw;
}

export function createMemoryService(repository: MemoryRepository = createMemoryRepository()): MemoryService {
  return {
    async listSpaces(filters?: ListMemorySpaceOptions) {
      return repository.listSpaces(filters);
    },

    async listAccessibleSpaces(subjectType: string, subjectId: string) {
      const grants = await repository.listGrants({
        subjectType,
        subjectId,
      });

      const spaceIds = [...new Set(grants.map((grant) => grant.space_id))];
      if (!spaceIds.length) {
        return [];
      }

      return repository.listSpaces({ ids: spaceIds });
    },

    async createSpace(input: CreateMemorySpaceInput) {
      return repository.createSpace(input);
    },

    async listItems(filters?: ListMemoryItemOptions) {
      return repository.listItems(filters);
    },

    async listSpaceItems(spaceId: number) {
      return repository.listItems({ spaceId });
    },

    async upsertItem(input: UpsertMemoryItemInput) {
      return repository.upsertItem(input);
    },

    // D3 会话记忆召回 (TASK-004 G4): 全量召回 → confidence 阈值过滤 → confidence DESC + updated_at DESC 排序 → top-K 截断.
    // 复用 repository.listItems({spaceId}) (现有 spaceId 索引, C-009 零 migration).
    // C-003: MUST 全量召回再截断, 不可即注入全量 (爆 context window).
    // G4 (TASK-M3-004): threshold>0 时过滤掉 confidence < threshold 的记忆 (真实召回质量升级, 应用层零 migration).
    //   threshold=0 → 不过滤, byte-for-byte 全量召回 (backward-compat). 无高可信记忆返空 (fail-open, 不阻断主流程).
    async recall(spaceId: number): Promise<RecallMemoryResult> {
      const limit = resolveMemoryRecallLimit();
      const threshold = resolveConfidenceThreshold();
      const items = await repository.listItems({ spaceId });
      const filtered = threshold > 0 ? items.filter((item) => readConfidence(item) >= threshold) : items;
      const sorted = [...filtered].sort((a, b) => {
        const confDiff = readConfidence(b) - readConfidence(a);
        if (confDiff !== 0) {
          return confDiff;
        }
        // confidence 相同时按 updated_at DESC (repository 默认序已是 updated_at DESC + id DESC,
        // 但 sort 破坏原序, 显式重排保稳定).
        const timeDiff = b.updated_at.getTime() - a.updated_at.getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return b.id - a.id;
      });
      return {
        items: sorted.slice(0, limit),
        limit,
      };
    },

    async listGrants(filters?: ListMemoryGrantOptions) {
      return repository.listGrants(filters);
    },

    async listSpaceGrants(spaceId: number) {
      return repository.listGrants({ spaceId });
    },

    async listSubjectGrants(subjectType: string, subjectId: string) {
      return repository.listGrants({
        subjectType,
        subjectId,
      });
    },

    async grantSpaceAccess(input: UpsertMemoryGrantInput) {
      return repository.upsertGrant(input);
    },

    async listIdentityLinks(filters?: ListIdentityLinkOptions) {
      return repository.listIdentityLinks(filters);
    },

    async linkIdentity(input: UpsertIdentityLinkInput) {
      return repository.upsertIdentityLink(input);
    },
  };
}

// Testing exports: recall 排序/截断/阈值过滤逻辑的纯函数 (memory-recall.test.ts 单测, 不依赖 DB).
export const __memoryServiceTesting = {
  resolveMemoryRecallLimit,
  resolveConfidenceThreshold,
  readConfidence,
};
