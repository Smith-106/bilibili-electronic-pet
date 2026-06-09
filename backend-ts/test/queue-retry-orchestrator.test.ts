import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  QueueConsistencyError,
  attachWritebackEvidence,
  buildFailureLogFields,
  buildRetryBatches,
  buildRetryRoundSummary,
  classifyFailureReason,
  classifySolutionFailure,
  detectWorkspaceConflicts,
  evaluateChannelHealth,
  orchestrateRetryRound,
  planExecutionMode,
  selectExecutorWithFallback,
  validateQueueConsistency,
} from '../src/services/queue-retry-orchestrator.js';

describe('queue retry orchestrator', () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-10T03:30:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('classifies failure reasons from text and structured details', () => {
    expect(classifyFailureReason('502 bad gateway')).toBe('channel_failure');
    expect(classifyFailureReason('workspace conflict')).toBe('conflict_blocked');
    expect(classifyFailureReason('logic only')).toBe('logic_failure');
    expect(
      classifyFailureReason('', {
        failureDetails: { message: 'timeout from upstream', error_type: 'timeout' },
      }),
    ).toBe('channel_failure');
  });

  it('classifies solution failures and builds retry batches with blocking reasons', () => {
    const plan = buildRetryBatches([
      { item_id: 'a', status: 'failed', failure_reason: '502 timeout', depends_on: [] },
      { item_id: 'b', status: 'failed', failure_reason: 'workspace conflict', depends_on: [] },
      { item_id: 'c', status: 'failed', failure_reason: 'logic issue', depends_on: ['missing'] },
      { item_id: 'd', status: 'completed', failure_reason: 'ignored', depends_on: [] },
    ]);

    expect(classifySolutionFailure({ failure_reason: 'timeout' })).toBe('channel_failure');
    expect(plan.stats.failed_total).toBe(3);
    expect(plan.retry_batches.channel_failure).toContain('a');
    expect(plan.blocked.some((item) => item.item_id === 'b')).toBe(true);
    expect(plan.blocked.some((item) => item.item_id === 'c')).toBe(true);
    expect(plan.executable_items).toContain('a');
  });

  it('collects output records and attaches evidence metadata', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'queue-orch-'));
    tempDirs.push(tempDir);
    const filePath = join(tempDir, 'result.json');
    writeFileSync(filePath, JSON.stringify({ status: 'done', summary: 'ok', message: 'fine' }), 'utf8');

    const { collectTaskOutputRecords } = await import('../src/services/queue-retry-orchestrator.js');
    const records = collectTaskOutputRecords([{ item_id: 'x', status: 'failed', output_path: filePath }], {
      previewChars: 64,
    });

    expect(records[0].output_exists).toBe(true);
    expect(records[0].key_fields).toHaveProperty('status', 'done');
    expect(records[0].failure_category).toBe('logic_failure');
    expect(attachWritebackEvidence({ ok: true }, { queueId: ' q-1 ', solutionId: ' s-1 ' })).toMatchObject({
      queue_id: 'q-1',
      solution_id: 's-1',
    });
  });

  it('collects text output fields from nested evidence paths and missing defaults', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'queue-orch-text-'));
    tempDirs.push(tempDir);
    const filePath = join(tempDir, 'result.txt');
    writeFileSync(
      filePath,
      ['status: failed', 'error_type = channel_timeout', 'message: upstream timed out', 'summary = retry later'].join(
        '\n',
      ),
      'utf8',
    );

    const { collectTaskOutputRecords } = await import('../src/services/queue-retry-orchestrator.js');
    const records = collectTaskOutputRecords(
      [
        {
          status: 'FAILED',
          failure_reason: 'host timeout',
          output_path: null,
          task_output_path: '   ',
          result: { output_file: filePath },
        },
        { item_id: 'no-output', status: undefined },
      ],
      { previewChars: 4 },
    );

    expect(records[0]).toMatchObject({
      item_id: 'unknown',
      status: 'failed',
      output_path: filePath,
      output_exists: true,
      failure_category: 'channel_failure',
      key_fields: {
        status: 'failed',
        error_type: 'channel_timeout',
        message: 'upstream timed out',
        summary: 'retry later',
      },
    });
    expect(String(records[0].preview).length).toBeGreaterThanOrEqual(32);
    expect(records[1]).toMatchObject({
      item_id: 'no-output',
      status: 'unknown',
      output_path: null,
      output_exists: false,
      key_fields: {},
    });
  });

  it('handles invalid json outputs and non-object failure detail fallbacks', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'queue-orch-invalid-json-'));
    tempDirs.push(tempDir);
    const filePath = join(tempDir, 'broken.json');
    writeFileSync(filePath, 'status: failed\nmessage: not json', 'utf8');

    const { collectTaskOutputRecords } = await import('../src/services/queue-retry-orchestrator.js');
    const records = collectTaskOutputRecords([
      {
        item_id: 'broken-json',
        status: 'failed',
        failure_reason: 'workspace lock',
        failure_details: ['ignored'],
        result: { evidence_path: filePath },
      },
    ]);

    expect(records[0]).toMatchObject({
      item_id: 'broken-json',
      output_exists: true,
      failure_category: 'conflict_blocked',
      key_fields: {
        status: 'failed',
        message: 'not json',
      },
    });
  });

  it('handles structured failure details, blank item ids, and missing output files', async () => {
    const { collectTaskOutputRecords } = await import('../src/services/queue-retry-orchestrator.js');
    const missingPath = join(tmpdir(), 'queue-orch-missing-output.txt');

    expect(
      classifySolutionFailure({
        failure_reason: '',
        failure_details: { message: 'upstream host unavailable', error_type: 'channel' },
      }),
    ).toBe('channel_failure');

    const records = collectTaskOutputRecords([
      { item_id: '   ', status: 'failed', failure_reason: 'logic', output_path: missingPath },
    ]);

    expect(records[0]).toMatchObject({
      item_id: 'unknown',
      status: 'failed',
      output_path: missingPath,
      output_exists: false,
      failure_category: 'logic_failure',
    });
  });

  it('validates queue consistency and builds summaries', () => {
    expect(() => validateQueueConsistency({ activeQueueId: 'a', targetQueueId: '', action: 'retry' })).toThrow(
      QueueConsistencyError,
    );
    expect(() => validateQueueConsistency({ activeQueueId: 'a', targetQueueId: 'b', action: 'retry' })).toThrow(
      'active_queue_id_mismatch',
    );
    expect(() =>
      validateQueueConsistency({ activeQueueId: 'a', targetQueueId: undefined, action: undefined as never }),
    ).toThrow('target_queue_id_required');
    expect(validateQueueConsistency({ activeQueueId: 'a', targetQueueId: 'a', action: 'retry' })).toEqual({
      queue_id: 'a',
      action: 'retry',
    });

    const summary = buildRetryRoundSummary({
      previousCompletedCount: 1,
      currentCompletedCount: 3,
      retryPlan: { blocked: [], retry_batches: { channel_failure: ['a'] } },
      outputRecords: [{ item_id: 'a' }],
    });

    expect(summary.progress_state).toBe('progressed');
    expect(summary.completed_count_delta).toBe(2);
    expect(summary.evidence_records).toHaveLength(1);
    expect(orchestrateRetryRound([{ item_id: 'a', status: 'failed', failure_reason: 'logic' }], {
      previousCompletedCount: 0,
      currentCompletedCount: 0,
    })).toHaveProperty('progress_state');
  });

  it('covers blocked and stalled retry summaries plus default queue consistency fields', () => {
    expect(new QueueConsistencyError({}).message).toBe('queue_consistency_check_failed');
    expect(validateQueueConsistency({ activeQueueId: undefined, targetQueueId: ' q-2 ', action: '' })).toEqual({
      queue_id: 'q-2',
      action: 'unknown',
    });
    expect(validateQueueConsistency({ activeQueueId: null, targetQueueId: ' q-3 ', action: null as never })).toEqual({
      queue_id: 'q-3',
      action: 'unknown',
    });
    expect(validateQueueConsistency({ activeQueueId: '', targetQueueId: ' q-4 ', action: '   ' })).toEqual({
      queue_id: 'q-4',
      action: 'unknown',
    });

    expect(
      buildRetryRoundSummary({
        previousCompletedCount: 2,
        currentCompletedCount: 2,
        retryPlan: { blocked: [{ item_id: 'a' }] },
        outputRecords: [],
      }),
    ).toMatchObject({
      progress_state: 'blocked',
      explanation: 'no_completed_increment_with_blocked_reasons',
      retry_batches: {},
    });

    expect(
      buildRetryRoundSummary({
        previousCompletedCount: 2.8,
        currentCompletedCount: 2.1,
        retryPlan: { retry_batches: undefined },
        outputRecords: [],
      }),
    ).toMatchObject({
      completed_count_before: 2,
      completed_count_after: 2,
      progress_state: 'stalled',
      explanation: 'no_completed_increment_detected',
      blocked: [],
      retry_batches: {},
    });
  });

  it('blocks retries for missing and incomplete dependencies while restoring default completed statuses', () => {
    const plan = buildRetryBatches(
      [
        { item_id: null, status: 'failed', failure_reason: 'logic' },
        { item_id: 'done', status: 'completed' },
        { item_id: 'pending', status: 'queued' },
        { item_id: 'wait-pending', status: 'failed', failure_reason: 'logic', depends_on: ['pending'] },
        { item_id: 'wait-missing', status: 'failed', failure_reason: 'logic', depends_on: ['ghost'] },
        { item_id: 'wait-done', status: 'failed', failure_reason: 'logic', depends_on: ['done'] },
      ],
      { completedStatuses: ['   '] },
    );

    expect(plan.retry_batches.logic_failure).toEqual(['wait-done']);
    expect(plan.blocked).toEqual(
      expect.arrayContaining([
        {
          item_id: 'wait-pending',
          category: 'logic_failure',
          blocked_by: ['dependency_not_completed:pending'],
        },
        {
          item_id: 'wait-missing',
          category: 'logic_failure',
          blocked_by: ['dependency_missing:ghost'],
        },
      ]),
    );
  });

  it('detects workspace conflicts and chooses fallback executors', () => {
    expect(detectWorkspaceConflicts({ uncommittedFiles: ['a', 'b'], solutionFiles: ['b', 'c'] })).toMatchObject({
      blocking: true,
      conflicts: ['b'],
    });

    expect(planExecutionMode({ solutionId: ' sol-1 ', conflictReport: { blocking: true, conflicts: ['a'] } })).toMatchObject({
      solution_id: 'sol-1',
      mode: 'isolated',
      lock_key: 'solution:sol-1',
    });

    expect(evaluateChannelHealth({ status_code: 200, host: 'example.com', channel: 'abc' })).toMatchObject({
      healthy: true,
      status_code: 200,
    });
    expect(evaluateChannelHealth({})).toMatchObject({
      healthy: false,
      status_code: 0,
      host: '',
      channel: '',
      error_type: 'channel_unavailable',
    });
    expect(planExecutionMode({ solutionId: ' sol-2 ', conflictReport: { blocking: false, conflicts: 'none' } })).toMatchObject({
      solution_id: 'sol-2',
      mode: 'normal',
      lock_key: null,
      conflicts: [],
    });
    expect(selectExecutorWithFallback({
      primaryExecutor: 'primary',
      fallbackExecutor: 'fallback',
      consecutive5xx: 3,
      threshold: 2,
    })).toMatchObject({
      selected_executor: 'fallback',
      fallback_triggered: true,
    });
    expect(selectExecutorWithFallback({
      primaryExecutor: ' primary ',
      fallbackExecutor: ' fallback ',
      consecutive5xx: 1.8,
      threshold: 2.2,
    })).toMatchObject({
      selected_executor: 'primary',
      fallback_triggered: false,
      consecutive_5xx: 1,
      threshold: 2,
    });
    expect(buildFailureLogFields({ errorType: 'timeout', channel: 'qq', host: 'host', attempt: 2 })).toMatchObject({
      error_type: 'timeout',
      channel: 'qq',
      host: 'host',
      attempt: 2,
    });
  });
});
