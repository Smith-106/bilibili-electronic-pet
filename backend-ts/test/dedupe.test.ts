import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getUserStateMock, updateUserStateMock } = vi.hoisted(() => ({
  getUserStateMock: vi.fn(),
  updateUserStateMock: vi.fn(),
}));

vi.mock('../src/services/db-queries.js', () => ({
  getUserState: getUserStateMock,
  updateUserState: updateUserStateMock,
}));

import { isRecentDuplicate, rememberReplyPhrase } from '../src/services/dedupe.js';

describe('dedupe service', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-10T03:30:00.000Z'));
    getUserStateMock.mockReset();
    updateUserStateMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when user state or recent phrase storage is absent', async () => {
    getUserStateMock.mockResolvedValueOnce(null);
    await expect(isRecentDuplicate('user-1', 'hello')).resolves.toBe(false);

    getUserStateMock.mockResolvedValueOnce({ recent_phrases: 'bad-shape' });
    await expect(isRecentDuplicate('user-1', 'hello')).resolves.toBe(false);
  });

  it('remembers a phrase and detects it within the cooldown window', async () => {
    getUserStateMock.mockResolvedValueOnce({ recent_phrases: {} });
    await rememberReplyPhrase('user-1', 'hello world');

    const [, updatePayload] = updateUserStateMock.mock.calls[0];
    const storedPhrases = updatePayload.recent_phrases;

    expect(Object.values(storedPhrases)[0]).toMatchObject({
      text: 'hello world',
      timestamp: Date.parse('2026-04-10T03:30:00.000Z'),
    });

    getUserStateMock.mockResolvedValueOnce({ recent_phrases: storedPhrases });
    await expect(isRecentDuplicate('user-1', 'hello world')).resolves.toBe(true);
  });

  it('returns false when the matching phrase is outside the cooldown window', async () => {
    getUserStateMock.mockResolvedValueOnce({ recent_phrases: {} });
    await rememberReplyPhrase('user-1', 'old phrase');

    const storedPhrases = updateUserStateMock.mock.calls[0][1].recent_phrases;
    const key = Object.keys(storedPhrases)[0];
    storedPhrases[key].timestamp = Date.now() - 25 * 60 * 60 * 1000;

    getUserStateMock.mockResolvedValueOnce({ recent_phrases: storedPhrases });
    await expect(isRecentDuplicate('user-1', 'old phrase')).resolves.toBe(false);
  });

  it('returns false when recent phrase storage has no matching hash', async () => {
    getUserStateMock.mockResolvedValueOnce({
      recent_phrases: {
        phrase_123: { text: 'different phrase', timestamp: Date.now() },
      },
    });

    await expect(isRecentDuplicate('user-1', 'new phrase')).resolves.toBe(false);
  });

  it('initializes phrase history when user state is missing', async () => {
    getUserStateMock.mockResolvedValueOnce(null);

    await rememberReplyPhrase('user-1', 'first phrase');

    expect(updateUserStateMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        recent_phrases: expect.any(Object),
      }),
    );
  });

  it('trims phrase history to the latest 100 entries', async () => {
    const recent_phrases = Object.fromEntries(
      Array.from({ length: 101 }, (_, index) => [
        `phrase_${index}`,
        { text: `old-${index}`, timestamp: index },
      ]),
    );
    getUserStateMock.mockResolvedValueOnce({ recent_phrases });

    await rememberReplyPhrase('user-1', 'newest phrase');

    const updated = updateUserStateMock.mock.calls[0][1].recent_phrases;
    expect(Object.keys(updated)).toHaveLength(100);
    expect(updated.phrase_0).toBeUndefined();
    expect(Object.values(updated).some((entry) => entry.text === 'newest phrase')).toBe(true);
  });

  it('handles storage errors without throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getUserStateMock.mockRejectedValue(new Error('db down'));

    await expect(isRecentDuplicate('user-1', 'hello')).resolves.toBe(false);
    await expect(rememberReplyPhrase('user-1', 'hello')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });
});
