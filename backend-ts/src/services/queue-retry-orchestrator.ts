import { readFileSync, existsSync } from 'node:fs';

// ── Types ────────────────────────────────────────────────

export type FailureCategory = 'channel_failure' | 'conflict_blocked' | 'logic_failure';

const DISPATCH_ORDER: FailureCategory[] = [
  'channel_failure',
  'logic_failure',
  'conflict_blocked',
];

const CHANNEL_FAILURE_KEYWORDS = [
  '502', '503', '504',
  'bad gateway', 'gateway timeout', 'service unavailable',
  'connection reset', 'connection refused',
  'econn', 'etimedout', 'timeout', 'upstream', 'host', 'channel',
];

const CONFLICT_BLOCKED_KEYWORDS = [
  'conflict', 'uncommitted', 'overlap', 'working tree',
  'workspace', 'blocked', 'lock',
];

const DEFAULT_COMPLETED_STATUSES = new Set(['completed']);

interface TextOutputPattern {
  regex: RegExp;
}

const TEXT_FIELD_PATTERNS: Record<string, TextOutputPattern> = {
  status: { regex: /status\s*[:=]\s*([^\n\r]+)/i },
  error_type: { regex: /error_type\s*[:=]\s*([^\n\r]+)/i },
  message: { regex: /message\s*[:=]\s*([^\n\r]+)/i },
  summary: { regex: /summary\s*[:=]\s*([^\n\r]+)/i },
};

// ── Helpers ──────────────────────────────────────────────

function toLowerText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return [];
}

function resolveItemId(solution: Record<string, unknown>): string | null {
  const value = solution.item_id;
  if (value == null) return null;
  const id = String(value).trim();
  return id || null;
}

function extractOutputPath(solution: Record<string, unknown>): string | null {
  const candidates: unknown[] = [solution.output_path, solution.task_output_path];

  for (const sectionKey of ['result', 'failure_details'] as const) {
    const section = solution[sectionKey];
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      const sec = section as Record<string, unknown>;
      candidates.push(sec.output_path, sec.task_output_path, sec.output_file, sec.evidence_path);
    }
  }

  for (const candidate of candidates) {
    if (candidate == null) continue;
    const pathValue = String(candidate).trim();
    if (pathValue) return pathValue;
  }
  return null;
}

function extractKeyFieldsFromText(outputText: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, { regex }] of Object.entries(TEXT_FIELD_PATTERNS)) {
    const match = regex.exec(outputText);
    if (match) fields[key] = match[1].trim();
  }
  return fields;
}

function extractKeyFieldsFromJson(parsed: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const key of ['status', 'summary', 'error_type', 'message', 'queue_id', 'solution_id', 'completed_count', 'completed_count_delta']) {
    const value = parsed[key];
    if (value != null) fields[key] = value;
  }
  return fields;
}

// ── Public API ───────────────────────────────────────────

/**
 * Classify a failure reason into channel_failure, conflict_blocked, or logic_failure
 */
export function classifyFailureReason(
  failureReason: string | null | undefined,
  options?: { failureDetails?: Record<string, unknown> | null },
): FailureCategory {
  const textParts = [toLowerText(failureReason)];
  if (options?.failureDetails) {
    for (const key of ['message', 'error_type', 'status', 'code', 'host', 'detail']) {
      const value = options.failureDetails[key];
      if (value != null) textParts.push(toLowerText(value));
    }
  }
  const merged = textParts.filter(Boolean).join(' ');

  if (CONFLICT_BLOCKED_KEYWORDS.some((kw) => merged.includes(kw))) return 'conflict_blocked';
  if (CHANNEL_FAILURE_KEYWORDS.some((kw) => merged.includes(kw))) return 'channel_failure';
  return 'logic_failure';
}

/**
 * Classify failure from a solution record
 */
export function classifySolutionFailure(solution: Record<string, unknown>): FailureCategory {
  const details = solution.failure_details;
  return classifyFailureReason(
    solution.failure_reason as string | null | undefined,
    { failureDetails: details && typeof details === 'object' && !Array.isArray(details) ? details as Record<string, unknown> : null },
  );
}

/**
 * Build retry batches from a list of solution records.
 * Groups failed items by failure category, checks dependencies, and identifies blocked items.
 */
export function buildRetryBatches(
  solutions: Record<string, unknown>[],
  options?: { completedStatuses?: string[] },
): {
  dispatch_order: FailureCategory[];
  classified_items: Record<FailureCategory, string[]>;
  retry_batches: Record<FailureCategory, string[]>;
  blocked: Array<{ item_id: string; category: FailureCategory; blocked_by: string[] }>;
  executable_items: string[];
  stats: { failed_total: number; executable_total: number; blocked_total: number };
} {
  const completedSet = new Set(
    (options?.completedStatuses ?? ['completed']).map((s) => toLowerText(s)).filter(Boolean),
  );
  if (completedSet.size === 0) completedSet.add('completed');

  const statusesByItem = new Map<string, string>();
  const dependenciesByItem = new Map<string, string[]>();
  const classifiedItems: Record<FailureCategory, string[]> = {
    channel_failure: [],
    conflict_blocked: [],
    logic_failure: [],
  };

  for (const solution of solutions) {
    const itemId = resolveItemId(solution);
    if (itemId == null) continue;
    statusesByItem.set(itemId, toLowerText(solution.status));
    dependenciesByItem.set(itemId, asStringList(solution.depends_on));
  }

  for (const solution of solutions) {
    const itemId = resolveItemId(solution);
    if (itemId == null) continue;
    if (statusesByItem.get(itemId) !== 'failed') continue;
    const category = classifySolutionFailure(solution);
    classifiedItems[category].push(itemId);
  }

  const retryBatches: Record<FailureCategory, string[]> = {
    channel_failure: [],
    conflict_blocked: [],
    logic_failure: [],
  };
  const blocked: Array<{ item_id: string; category: FailureCategory; blocked_by: string[] }> = [];

  for (const category of DISPATCH_ORDER) {
    for (const itemId of classifiedItems[category]) {
      const blockReasons: string[] = [];
      if (category === 'conflict_blocked') blockReasons.push('workspace_conflict');

      for (const dep of dependenciesByItem.get(itemId) ?? []) {
        const depStatus = statusesByItem.get(dep);
        if (depStatus == null) {
          blockReasons.push(`dependency_missing:${dep}`);
          continue;
        }
        if (!completedSet.has(depStatus)) {
          blockReasons.push(`dependency_not_completed:${dep}`);
        }
      }

      if (blockReasons.length > 0) {
        blocked.push({ item_id: itemId, category, blocked_by: [...new Set(blockReasons)].sort() });
        continue;
      }
      retryBatches[category].push(itemId);
    }
  }

  const executableItems = DISPATCH_ORDER.flatMap((cat) => retryBatches[cat]);

  return {
    dispatch_order: [...DISPATCH_ORDER],
    classified_items: classifiedItems,
    retry_batches: retryBatches,
    blocked,
    executable_items: executableItems,
    stats: {
      failed_total: Object.values(classifiedItems).reduce((sum, arr) => sum + arr.length, 0),
      executable_total: executableItems.length,
      blocked_total: blocked.length,
    },
  };
}

/**
 * Collect task output records with file inspection and key field extraction
 */
export function collectTaskOutputRecords(
  solutions: Record<string, unknown>[],
  options?: { previewChars?: number },
): Record<string, unknown>[] {
  const previewChars = Math.max(32, options?.previewChars ?? 240);
  const records: Record<string, unknown>[] = [];

  for (const solution of solutions) {
    const itemId = resolveItemId(solution) || 'unknown';
    const outputPath = extractOutputPath(solution);
    const status = toLowerText(solution.status) || 'unknown';

    const record: Record<string, unknown> = {
      item_id: itemId,
      status,
      output_path: outputPath,
      output_exists: false,
      key_fields: {},
    };

    if (outputPath) {
      try {
        const { readFileSync, existsSync } = require('node:fs') as typeof import('node:fs');
        if (existsSync(outputPath)) {
          const outputText = readFileSync(outputPath, 'utf-8');
          let keyFields: Record<string, unknown> = {};

          if (outputPath.toLowerCase().endsWith('.json')) {
            try {
              const parsed = JSON.parse(outputText);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                keyFields = extractKeyFieldsFromJson(parsed as Record<string, unknown>);
              }
            } catch { /* not valid JSON */ }
          }

          if (Object.keys(keyFields).length === 0) {
            keyFields = extractKeyFieldsFromText(outputText);
          }

          record.output_exists = true;
          record.preview = outputText.substring(0, previewChars);
          record.key_fields = keyFields;
        }
      } catch { /* file read failed */ }
    }

    if (status === 'failed') {
      record.failure_category = classifySolutionFailure(solution);
    }

    records.push(record);
  }

  return records;
}

// Note: collectTaskOutputRecords uses dynamic import for fs since it may not be needed in all contexts.
// For synchronous usage, the function handles file operations inline.

/**
 * Attach writeback evidence to a result record
 */
export function attachWritebackEvidence(
  result: Record<string, unknown>,
  options: { queueId: string; solutionId: string },
): Record<string, unknown> {
  return {
    ...result,
    queue_id: options.queueId.trim(),
    solution_id: options.solutionId.trim(),
  };
}

/**
 * Queue consistency error
 */
export class QueueConsistencyError extends Error {
  readonly details: Record<string, unknown>;

  constructor(details: Record<string, unknown>) {
    super(String(details.message ?? 'queue_consistency_check_failed'));
    this.name = 'QueueConsistencyError';
    this.details = { ...details };
  }
}

/**
 * Validate queue consistency between active and target queue IDs
 */
export function validateQueueConsistency(options: {
  activeQueueId?: string | null;
  targetQueueId?: string | null;
  action: string;
}): { queue_id: string; action: string } {
  const active = (options.activeQueueId ?? '').trim();
  const target = (options.targetQueueId ?? '').trim();
  const action = (options.action || 'unknown').trim().toLowerCase() || 'unknown';

  if (!target) {
    throw new QueueConsistencyError({
      error_type: 'queue_id_missing',
      action,
      message: 'target_queue_id_required',
      active_queue_id: active,
      target_queue_id: target,
    });
  }

  if (active && active !== target) {
    throw new QueueConsistencyError({
      error_type: 'queue_id_mismatch',
      action,
      message: 'active_queue_id_mismatch',
      active_queue_id: active,
      target_queue_id: target,
    });
  }

  return { queue_id: target, action };
}

/**
 * Build a retry round summary
 */
export function buildRetryRoundSummary(options: {
  previousCompletedCount: number;
  currentCompletedCount: number;
  retryPlan: Record<string, unknown>;
  outputRecords: Record<string, unknown>[];
}): Record<string, unknown> {
  const previous = Math.floor(options.previousCompletedCount);
  const current = Math.floor(options.currentCompletedCount);
  const delta = current - previous;
  const blocked = Array.isArray(options.retryPlan.blocked)
    ? options.retryPlan.blocked
    : [];
  const progressState = delta > 0 ? 'progressed' : (blocked.length > 0 ? 'blocked' : 'stalled');

  const summary: Record<string, unknown> = {
    completed_count_before: previous,
    completed_count_after: current,
    completed_count_delta: delta,
    progress_state: progressState,
    retry_batches: options.retryPlan.retry_batches ?? {},
    blocked,
    evidence_records: options.outputRecords.map((r) => ({ ...r })),
  };

  if (delta <= 0) {
    summary.explanation = blocked.length > 0
      ? 'no_completed_increment_with_blocked_reasons'
      : 'no_completed_increment_detected';
  }

  return summary;
}

/**
 * Orchestrate a full retry round: build batches + collect output records + build summary
 */
export function orchestrateRetryRound(
  solutions: Record<string, unknown>[],
  options: {
    previousCompletedCount: number;
    currentCompletedCount: number;
  },
): Record<string, unknown> {
  const retryPlan = buildRetryBatches(solutions);
  const summary = buildRetryRoundSummary({
    previousCompletedCount: options.previousCompletedCount,
    currentCompletedCount: options.currentCompletedCount,
    retryPlan,
    outputRecords: [],
  });
  return summary;
}

/**
 * Detect workspace file conflicts between uncommitted files and solution target files
 */
export function detectWorkspaceConflicts(options: {
  uncommittedFiles: string[];
  solutionFiles: string[];
}): { blocking: boolean; conflicts: string[]; uncommitted_count: number; solution_file_count: number } {
  const uncommitted = new Set(options.uncommittedFiles.map((p) => p.trim()).filter(Boolean));
  const targets = new Set(options.solutionFiles.map((p) => p.trim()).filter(Boolean));
  const conflicts = [...uncommitted].filter((f) => targets.has(f)).sort();

  return {
    blocking: conflicts.length > 0,
    conflicts,
    uncommitted_count: uncommitted.size,
    solution_file_count: targets.size,
  };
}

/**
 * Plan execution mode based on conflict report
 */
export function planExecutionMode(options: {
  solutionId: string;
  conflictReport: Record<string, unknown>;
}): Record<string, unknown> {
  const blocking = Boolean(options.conflictReport.blocking);
  const mode = blocking ? 'isolated' : 'normal';
  const id = options.solutionId.trim();

  return {
    solution_id: id,
    mode,
    lock_key: blocking ? `solution:${id}` : null,
    conflicts: Array.isArray(options.conflictReport.conflicts)
      ? options.conflictReport.conflicts
      : [],
  };
}

/**
 * Evaluate channel health from a preflight check
 */
export function evaluateChannelHealth(
  preflight: Record<string, unknown>,
): Record<string, unknown> {
  const statusCode = Number(preflight.status_code ?? 0);
  const host = String(preflight.host ?? '').trim();
  const channel = String(preflight.channel ?? '').trim();
  const healthy = statusCode >= 200 && statusCode < 300;

  const result: Record<string, unknown> = { healthy, status_code: statusCode, host, channel };
  if (!healthy) {
    result.error_type = 'channel_unavailable';
  }
  return result;
}

/**
 * Select executor with fallback based on consecutive 5xx count
 */
export function selectExecutorWithFallback(options: {
  primaryExecutor: string;
  fallbackExecutor: string;
  consecutive5xx: number;
  threshold: number;
}): Record<string, unknown> {
  const useFallback = Math.floor(options.consecutive5xx) >= Math.floor(options.threshold);
  const selected = useFallback ? options.fallbackExecutor : options.primaryExecutor;

  return {
    selected_executor: selected.trim(),
    fallback_triggered: useFallback,
    primary_executor: options.primaryExecutor.trim(),
    fallback_executor: options.fallbackExecutor.trim(),
    consecutive_5xx: Math.floor(options.consecutive5xx),
    threshold: Math.floor(options.threshold),
  };
}

/**
 * Build structured failure log fields
 */
export function buildFailureLogFields(options: {
  errorType: string;
  channel: string;
  host: string;
  attempt: number;
}): Record<string, unknown> {
  return {
    error_type: options.errorType.trim(),
    channel: options.channel.trim(),
    host: options.host.trim(),
    attempt: Math.floor(options.attempt),
  };
}
