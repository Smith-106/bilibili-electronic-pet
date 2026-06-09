import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  escapeHtml,
  formatIsoDateTime,
  formatRouteContextLabel,
  getClampedInt,
  getErrorText,
  renderTimestamp,
  safeCount,
  safeCountNumber,
  timeAgo,
} from '../../src/utils/format.js';

describe('frontend formatting utilities', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-10T03:30:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escapes HTML and formats ISO date fallbacks', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(`A&B<>"'`)).toBe('A&amp;B&lt;&gt;&quot;&#39;');

    expect(formatIsoDateTime('')).toBe('-');
    expect(formatIsoDateTime('not-a-date')).toBe('not-a-date');
    expect(formatIsoDateTime(Symbol('bad-date'))).toBe('Symbol(bad-date)');
    expect(formatIsoDateTime('2026-04-10T03:30:00.000Z')).toContain('2026');
  });

  it('formats relative time ranges and timestamp markup', () => {
    expect(timeAgo('')).toBe('');
    expect(timeAgo('not-a-date')).toBe('');
    expect(timeAgo(Symbol('bad-date'))).toBe('');
    expect(timeAgo('2026-04-10T03:29:45.000Z')).toBeTruthy();
    expect(timeAgo('2026-04-10T03:00:00.000Z')).toContain('30');
    expect(timeAgo('2026-04-10T01:30:00.000Z')).toContain('2');
    expect(timeAgo('2026-04-08T03:30:00.000Z')).toContain('2');
    expect(timeAgo('2026-02-10T03:30:00.000Z')).toContain('1');
    expect(timeAgo('2024-04-10T03:30:00.000Z')).toContain('2');

    expect(renderTimestamp('not-a-date')).toContain('not-a-date');
    expect(renderTimestamp('2026-04-10T03:29:45.000Z')).toContain('<span');
  });

  it('normalizes counts, clamped integers, and error text', () => {
    expect(safeCount(null)).toBe('0');
    expect(safeCount('abc')).toBe('0');
    expect(safeCount(5)).toBe('5');
    expect(safeCountNumber(null)).toBe(0);
    expect(safeCountNumber('abc')).toBe(0);
    expect(safeCountNumber('7')).toBe(7);
    expect(getClampedInt('abc', 1, 10, 3)).toBe(3);
    expect(getClampedInt('0', 1, 10, 3)).toBe(1);
    expect(getClampedInt('99', 1, 10, 3)).toBe(10);
    expect(getClampedInt('5', 1, 10, 3)).toBe(5);

    expect(getErrorText(null, 'fallback')).toBe('fallback');
    expect(getErrorText('', 'fallback')).toBe('fallback');
    expect(getErrorText('plain', 'fallback')).toBe('plain');
    expect(getErrorText(new Error('boom'), 'fallback')).toBe('boom');
    let readCount = 0;
    expect(getErrorText({
      get message() {
        readCount += 1;
        return readCount === 1 ? 'first-read' : '';
      },
    }, 'fallback')).toBe('fallback');
    expect(getErrorText({ message: { text: 'structured' } }, 'fallback')).toEqual({ text: 'structured' });
    expect(getErrorText({ message: '' }, 'fallback')).toBe('fallback');
    expect(getErrorText({}, 'fallback')).toBe('fallback');
  });

  it('formats route context labels across QQ and generic platforms', () => {
    expect(formatRouteContextLabel(null)).toBe('-');
    expect(
      formatRouteContextLabel({
        platform: 'qq',
        chat_type: 'group',
        container_id: 'group-1',
        user_id: 'user-1',
        parent_external_id: 'parent-1',
      }),
    ).toContain('group-1');
    expect(
      formatRouteContextLabel({
        platform: 'qq',
        chat_type: 'private',
        user_id: 'user-2',
      }),
    ).toContain('user-2');
    expect(
      formatRouteContextLabel({
        platform: 'qq',
        container_id: 'container-1',
      }),
    ).toContain('container-1');
    expect(
      formatRouteContextLabel({
        platform: 'douyin',
        container_id: 'thread-1',
        user_id: 'user-3',
      }),
    ).toContain('thread-1');
    expect(formatRouteContextLabel({ user_id: 'user-only' })).toContain('user-only');
    expect(formatRouteContextLabel({})).toBe('-');
  });

  it('covers fallback route context branches', () => {
    expect(formatRouteContextLabel({
      platform: 'qq',
      chat_type: 'private',
      container_id: 'ignored-container',
      user_id: 'user-4',
      parent_external_id: 'parent-private',
    })).toContain('parent-private');

    expect(formatRouteContextLabel({
      platform: 'qq',
      chat_type: 'group',
      container_id: 'group-2',
      user_id: '',
      parent_external_id: 'parent-group',
    })).toContain('parent-group');

    expect(formatRouteContextLabel({
      platform: 'qq',
      chat_type: 'group',
      container_id: '',
      user_id: 'qq-user-fallback',
    })).toContain('qq-user-fallback');

    expect(getErrorText(new String(''), 'fallback')).toBe('fallback');
  });
});
