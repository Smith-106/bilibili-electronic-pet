import type {
  BilibiliVideo,
  CompanionInteraction,
  CompanionInteractionKind,
  RoleCard,
  RoleCardValue,
} from './contracts.js';

export function hasText(value: string | undefined): boolean {
  return Boolean((value ?? '').trim());
}

export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function parseInteger(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function isProductionRuntime(): boolean {
  return (
    String(process.env.NODE_ENV ?? '')
      .trim()
      .toLowerCase() === 'production'
  );
}

export function parseAdminLimit(value: unknown, defaultValue: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

export function parseAdminOffset(value: unknown, defaultValue: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

export function parseAdminString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalized = raw.trim();
  return normalized || undefined;
}

export function parseAdminBoolean(value: unknown): boolean | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

export function normalizeIsoTimestamp(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

export function normalizeNullableIsoTimestamp(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return normalizeIsoTimestamp(value);
}

export function startCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeCompanionInteractionKind(value: unknown): CompanionInteractionKind {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'pat' || normalized === 'feed' || normalized === 'wake') {
    return normalized;
  }
  if (normalized === 'fallback') {
    return 'fallback';
  }
  return 'signal';
}

export function buildCompanionInteraction(item: {
  item_key: string;
  content: string;
  source: string;
  item_metadata?: Record<string, unknown>;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}): CompanionInteraction {
  const metadata = item.item_metadata ?? {};
  const action = typeof metadata.action === 'string' ? metadata.action.trim().toLowerCase() : '';
  const kind = normalizeCompanionInteractionKind(action);
  const sourceLabel = startCase(item.source || 'system');
  const title = action ? `${startCase(action)} interaction` : `${sourceLabel} signal`;
  const timestamp = item.updated_at ?? item.created_at;

  // F1 (security): the legacy companion-state path feeds an UNAUTHENTICATED GET endpoint
  // (GET /companion/state). item.content can carry user-submitted free text (POST
  // /companion/actions note, up to 256 chars) or Bilibili external identifiers (comment_id
  // from comment-job-actions) — both are PII that MUST NOT surface on the public response.
  // Use a curated, non-PII detail derived from kind/title/source only. The pet-core path
  // (toCompanionState) uses operator-authored event_detail, not user content, so it is safe.
  const detail = `${title} from ${sourceLabel.toLowerCase()}`;

  return {
    kind,
    title,
    detail,
    timestamp: timestamp ? normalizeIsoTimestamp(timestamp) : 'Pending',
    source: sourceLabel,
  };
}

export const REVIEWABLE_JOB_STATUSES = ['manual_queue', 'blocked', 'dedupe_skipped'] as const;

export function normalizeAdminJobStatus(status: unknown): string {
  const normalized = String(status ?? '').trim();
  if (!normalized) {
    return 'queued';
  }
  return REVIEWABLE_JOB_STATUSES.includes(normalized as (typeof REVIEWABLE_JOB_STATUSES)[number])
    ? 'pending_review'
    : normalized;
}

export function buildAdminJobStatusWhere(status?: string): Record<string, unknown> {
  const normalized = String(status ?? '').trim();
  if (!normalized) {
    return {};
  }
  if (normalized === 'pending_review') {
    return {
      status: {
        in: [...REVIEWABLE_JOB_STATUSES],
      },
    };
  }
  return { status: normalized };
}

export function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function parseRoleCardValue(value: unknown): RoleCardValue {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : normalized;
  } catch {
    return normalized;
  }
}

export function normalizeRoleCardInputValue(value: unknown): RoleCardValue {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);

  return `{${entries.join(',')}}`;
}

export function serializeRoleCardValue(value: RoleCardValue): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return stableStringify(value);
}

export function normalizeRoleCardRecord(item: Record<string, unknown>): RoleCard {
  return {
    id: Number(item.id ?? 0),
    key: String(item.key ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    system_prompt: String(item.system_prompt ?? ''),
    tone: parseRoleCardValue(item.tone),
    constraints: parseRoleCardValue(item.constraints),
    enabled: Boolean(item.enabled),
    is_active: Boolean(item.is_active),
    created_at: normalizeNullableIsoTimestamp(item.created_at as Date | string | null | undefined),
    updated_at: normalizeNullableIsoTimestamp(item.updated_at as Date | string | null | undefined),
  };
}

export function extractRiskFlagLabels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  }

  const payload = parseJsonRecord(value);
  const labels: string[] = [];
  const directKeys = ['reason', 'decision', 'label', 'risk_level'];
  for (const key of directKeys) {
    const item = String(payload[key] ?? '').trim();
    if (item && item !== 'ok') {
      labels.push(item);
    }
  }

  const arrayKeys = ['blocked_words', 'risk_labels', 'pii_types', 'flags'];
  for (const key of arrayKeys) {
    const items = Array.isArray(payload[key]) ? payload[key] : [];
    for (const item of items) {
      const normalized = String(item ?? '').trim();
      if (normalized) {
        labels.push(normalized);
      }
    }
  }

  return [...new Set(labels)];
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeAdminJobListItem(item: Record<string, unknown>): Record<string, unknown> {
  const rawStatus = String(item.raw_status ?? item.status ?? '').trim();
  const normalizedStatus = normalizeAdminJobStatus(rawStatus);
  const commentText = isNonEmptyString(item.comment_text)
    ? item.comment_text
    : isNonEmptyString(item.comment_content)
      ? item.comment_content
      : null;

  return {
    ...item,
    id: item.id == null ? '' : String(item.id),
    status: normalizedStatus,
    ...(rawStatus && rawStatus !== normalizedStatus ? { raw_status: rawStatus } : {}),
    comment_text: commentText,
    comment_content: commentText,
    risk_flags: extractRiskFlagLabels(item.risk_flags),
    created_at: normalizeNullableIsoTimestamp(item.created_at as Date | string | null | undefined),
    updated_at: normalizeNullableIsoTimestamp(item.updated_at as Date | string | null | undefined),
    published_at: normalizeNullableIsoTimestamp(item.published_at as Date | string | null | undefined),
  };
}

export function getGroupCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = record._all;
    if (typeof nested === 'number' && Number.isFinite(nested)) {
      return nested;
    }
  }
  return 0;
}

export function normalizeAdminOverviewPayload(overview: Record<string, unknown>): Record<string, unknown> {
  const totals =
    overview.totals && typeof overview.totals === 'object' && !Array.isArray(overview.totals)
      ? (overview.totals as Record<string, unknown>)
      : {};

  const totalComments = Number(overview.total_comments ?? totals.comments ?? 0);
  const totalJobs = Number(overview.total_jobs ?? totals.jobs ?? 0);
  const totalPublished = Number(overview.total_published ?? totals.published ?? totals.published_jobs ?? 0);
  const pendingReview = Number(
    overview.pending_review ?? totals.pending_review ?? totals.comments_manual_queue_or_processing ?? 0,
  );
  const totalFailed = Number(overview.total_failed ?? totals.failed ?? totals.failed_jobs ?? 0);

  return {
    ...overview,
    total_comments: Number.isFinite(totalComments) ? totalComments : 0,
    total_jobs: Number.isFinite(totalJobs) ? totalJobs : 0,
    total_published: Number.isFinite(totalPublished) ? totalPublished : 0,
    pending_review: Number.isFinite(pendingReview) ? pendingReview : 0,
    total_failed: Number.isFinite(totalFailed) ? totalFailed : 0,
  };
}

export function normalizeAdminAuditSummaryPayload(summary: Record<string, unknown>): Record<string, unknown> {
  const totals =
    summary.totals && typeof summary.totals === 'object' && !Array.isArray(summary.totals)
      ? (summary.totals as Record<string, unknown>)
      : {};
  const byResult =
    summary.by_result && typeof summary.by_result === 'object' && !Array.isArray(summary.by_result)
      ? (summary.by_result as Record<string, unknown>)
      : {};

  const total = Number(summary.total ?? totals.audit_logs ?? 0);
  const okCount = Number(summary.ok_count ?? totals.ok ?? byResult.ok ?? byResult.success ?? 0);
  const failedCount = Number(summary.failed_count ?? totals.failed ?? byResult.failed ?? 0);

  return {
    ...summary,
    total: Number.isFinite(total) ? total : 0,
    ok_count: Number.isFinite(okCount) ? okCount : 0,
    failed_count: Number.isFinite(failedCount) ? failedCount : 0,
  };
}

export function normalizeStyleProfilePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const styleProfile = String(payload.style_profile ?? payload.style ?? '')
    .trim()
    .toLowerCase();
  return {
    ...payload,
    style_profile: styleProfile,
    style: styleProfile,
  };
}

export function normalizeRoleProfilePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const roleProfile = String(payload.role_profile ?? payload.role ?? '')
    .trim()
    .toLowerCase();
  return {
    ...payload,
    role_profile: roleProfile,
    role: roleProfile,
  };
}

export function normalizeBilibiliStatusPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const config =
    payload.config && typeof payload.config === 'object' && !Array.isArray(payload.config)
      ? (payload.config as Record<string, unknown>)
      : {};
  const videos =
    payload.videos && typeof payload.videos === 'object' && !Array.isArray(payload.videos)
      ? (payload.videos as Record<string, unknown>)
      : {};

  const enabled = Boolean(payload.enabled ?? config.enabled);
  const pollingEnabled = Boolean(
    payload.polling_enabled ?? payload.poll_enabled ?? config.polling_enabled ?? config.poll_enabled,
  );
  const publishEnabled = Boolean(payload.publish_enabled ?? config.publish_enabled);
  const videoCount = Number(
    payload.video_count ?? videos.video_count ?? videos.total ?? videos.poll_enabled_count ?? 0,
  );

  return {
    ...payload,
    enabled,
    polling_enabled: pollingEnabled,
    poll_enabled: pollingEnabled,
    publish_enabled: publishEnabled,
    video_count: Number.isFinite(videoCount) ? videoCount : 0,
  };
}

export function normalizeBilibiliVideoRecord(
  item: Record<string, unknown>,
  options: { commentCount?: number } = {},
): BilibiliVideo {
  return {
    id: Number(item.id ?? 0),
    bvid: String(item.bvid ?? ''),
    aid: typeof item.aid === 'number' ? item.aid : item.aid == null ? null : Number(item.aid),
    title: typeof item.title === 'string' ? item.title : item.title == null ? null : String(item.title),
    owner_mid:
      typeof item.owner_mid === 'number' ? item.owner_mid : item.owner_mid == null ? null : Number(item.owner_mid),
    poll_enabled: Boolean(item.poll_enabled),
    comment_count: options.commentCount ?? 0,
    last_polled_at: normalizeNullableIsoTimestamp(item.last_polled_at as Date | string | null | undefined),
    last_poll_status:
      typeof item.last_poll_status === 'string'
        ? item.last_poll_status
        : item.last_poll_status == null
          ? null
          : String(item.last_poll_status),
    last_poll_error:
      typeof item.last_poll_error === 'string'
        ? item.last_poll_error
        : item.last_poll_error == null
          ? null
          : String(item.last_poll_error),
    last_rpid:
      typeof item.last_rpid === 'number' ? item.last_rpid : item.last_rpid == null ? null : Number(item.last_rpid),
    created_at: normalizeNullableIsoTimestamp(item.created_at as Date | string | null | undefined),
    updated_at: normalizeNullableIsoTimestamp(item.updated_at as Date | string | null | undefined),
  };
}
