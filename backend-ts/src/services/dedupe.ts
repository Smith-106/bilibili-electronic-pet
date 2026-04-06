/**
 * Deduplication services for reply phrase tracking
 * Migrated from Python: app/services/dedupe.py
 */

import type { IsRecentDuplicateService, RememberReplyPhraseService } from './interfaces.js';
import { getUserState, updateUserState } from './db-queries.js';

/**
 * Check if phrase is recent duplicate
 * Migrated from: app.services.dedupe.is_recent_duplicate
 */
export const isRecentDuplicate: IsRecentDuplicateService = async (userId, replyText) => {
  try {
    const userState = await getUserState(userId);

    if (!userState) {
      return false;
    }

    const recentPhrases = userState.recent_phrases as Record<string, unknown>;
    if (!recentPhrases || typeof recentPhrases !== 'object') {
      return false;
    }

    // Check if reply text matches any recent phrase
    const phraseHash = hashPhrase(replyText);
    const recentPhrasesMap = recentPhrases as Record<string, { text: string; timestamp: number }>;

    if (recentPhrasesMap[phraseHash]) {
      // Check if it's within cooldown period (e.g., 24 hours)
      const phraseEntry = recentPhrasesMap[phraseHash];
      const now = Date.now();
      const phraseTime = phraseEntry.timestamp;
      const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

      if (now - phraseTime < cooldownMs) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking recent duplicate:', error);
    return false;
  }
};

/**
 * Remember reply phrase for user
 * Migrated from: app.services.dedupe.remember_reply_phrase
 */
export const rememberReplyPhrase: RememberReplyPhraseService = async (userId, replyText) => {
  try {
    const userState = await getUserState(userId);
    const recentPhrases = (userState?.recent_phrases || {}) as Record<string, { text: string; timestamp: number }>;

    // Add new phrase
    const phraseHash = hashPhrase(replyText);
    recentPhrases[phraseHash] = {
      text: replyText,
      timestamp: Date.now(),
    };

    // Limit phrase history (keep last 100 phrases)
    const entries = Object.entries(recentPhrases);
    if (entries.length > 100) {
      // Remove oldest entries
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sorted.slice(0, entries.length - 100);
      toRemove.forEach(([key]) => delete recentPhrases[key]);
    }

    // Update user state
    await updateUserState(userId, { recent_phrases: recentPhrases });
  } catch (error) {
    console.error('Error remembering reply phrase:', error);
  }
};

/**
 * Hash phrase for storage
 */
function hashPhrase(text: string): string {
  // Simple hash function for phrase deduplication
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `phrase_${Math.abs(hash)}`;
}
