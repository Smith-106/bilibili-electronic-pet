// GENERATED FILE — DO NOT EDIT.
// 由 scripts/gen-frontend-contracts.mjs 从 backend-ts/src/server/contracts.ts 生成。
// 重新生成: npm run gen:contracts

export type RoleCardValue = string | Record<string, unknown>;

export type AdminJobItem = {
  id: string;
  status: string;
  raw_status?: string;
  comment_text: string | null;
  comment_content?: string | null;
  reply_text?: string | null;
  risk_flags: string[];
  route_context: Record<string, unknown> | null;
  created_at: string | null;
  updated_at?: string | null;
  published_at?: string | null;
};

export type AdminBilibiliCredential = {
  id: number;
  name: string;
  is_active: boolean;
  has_sessdata?: boolean;
  has_bili_jct?: boolean;
  buvid3?: string | null;
  expires_at: string | null;
  last_used_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BilibiliVideo = {
  id: number;
  bvid: string;
  aid?: number | null;
  title?: string | null;
  owner_mid?: number | null;
  poll_enabled: boolean;
  comment_count?: number | null;
  last_polled_at?: string | null;
  last_poll_status?: string | null;
  last_poll_error?: string | null;
  last_rpid?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoleCard = {
  id: number;
  key: string;
  name: string;
  description: string;
  system_prompt: string;
  tone: RoleCardValue;
  constraints: RoleCardValue;
  enabled: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type MemorySpace = {
  id: number;
  space_key: string;
  space_type: string;
  title: string;
  summary: string;
  created_at: string | null;
  updated_at: string | null;
};

export type MemoryItem = {
  id: number;
  space_id: number;
  item_key: string;
  content: string;
  content_type: string;
  source: string;
  item_metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
};

/** admin-api Job 视图 = 后端 AdminJobItem wire。 */
export type Job = AdminJobItem;

/** admin-api BilibiliVideo 视图 = 后端 wire + 兼容别名 (video_id/enabled 恒为 undefined)。 */
export type BilibiliVideoView = BilibiliVideo & { video_id?: number; enabled?: boolean };

/** admin-api BilibiliCredential 视图 = 后端 wire + 兼容别名 (credential_id/active 恒为 undefined)。 */
export type BilibiliCredentialView = AdminBilibiliCredential & { credential_id?: number; active?: boolean };

/** admin-api RoleCard 视图 = 后端 wire + 兼容别名 (active 为 is_active 别名)。 */
export type RoleCardView = RoleCard & { active?: boolean };

/** admin-api MemorySpace 视图 = 后端 wire。 */
export type MemorySpaceView = MemorySpace;

/** admin-api MemoryItem 视图 = 后端 wire。 */
export type MemoryItemView = MemoryItem;
