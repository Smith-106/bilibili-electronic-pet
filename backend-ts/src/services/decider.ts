/**
 * Decision services for reply and safety actions
 * Migrated from Python: app/services/decider.py
 */

import type {
  DecideSafetyActionService,
  InteractionDecisionInput,
  LegacyShouldReplyInput,
  ShouldReplyForInteractionService,
  ShouldReplyService,
} from './interfaces.js';
import { prisma as getPrisma } from './db-queries.js';

/**
 * Decision rules configuration
 */
interface ReplyRules {
  // Global cooldown settings
  globalCooldownEnabled: boolean;
  defaultCooldownMinutes: number;

  // Probability settings
  baseReplyProbability: number;
  keywordBoostProbability: number;
  lengthPenaltyThreshold: number;
  lengthPenaltyFactor: number;

  // Time window settings (hours in UTC+8)
  quietHoursStart: number; // e.g., 23 (11 PM)
  quietHoursEnd: number; // e.g., 7 (7 AM)
  quietHoursProbabilityFactor: number;

  // Content analysis
  minContentLength: number;
  maxContentLength: number;
  triggerKeywords: string[];
  blockKeywords: string[];

  // User state
  userCooldownMinutes: Record<string, number>; // user_id -> custom cooldown
}

/**
 * Default reply rules
 */
const DEFAULT_RULES: ReplyRules = {
  globalCooldownEnabled: true,
  defaultCooldownMinutes: 5,

  baseReplyProbability: 0.7,
  keywordBoostProbability: 0.2,
  lengthPenaltyThreshold: 200,
  lengthPenaltyFactor: 0.1,

  quietHoursStart: 23,
  quietHoursEnd: 7,
  quietHoursProbabilityFactor: 0.3,

  minContentLength: 1,
  maxContentLength: 1000,
  triggerKeywords: [
    '你好',
    '在吗',
    '问题',
    '求助',
    '请问',
    '怎么',
    '为什么',
    'help',
    '请问',
    '谢谢',
    '感谢',
    '大佬',
    '大神',
  ],
  blockKeywords: ['广告', '推广', '加群', '加微', '加QQ', '私聊'],

  userCooldownMinutes: {},
};

/**
 * Load rules from environment or use defaults
 */
function loadReplyRules(): ReplyRules {
  const rules = { ...DEFAULT_RULES };

  // Load from environment if available
  if (process.env.REPLY_BASE_PROBABILITY) {
    rules.baseReplyProbability = parseFloat(process.env.REPLY_BASE_PROBABILITY);
  }
  if (process.env.REPLY_GLOBAL_COOLDOWN_ENABLED) {
    rules.globalCooldownEnabled = process.env.REPLY_GLOBAL_COOLDOWN_ENABLED !== 'false';
  }
  if (process.env.REPLY_COOLDOWN_MINUTES) {
    rules.defaultCooldownMinutes = parseInt(process.env.REPLY_COOLDOWN_MINUTES, 10);
  }
  if (process.env.REPLY_QUIET_HOURS_START) {
    rules.quietHoursStart = parseInt(process.env.REPLY_QUIET_HOURS_START, 10);
  }
  if (process.env.REPLY_QUIET_HOURS_END) {
    rules.quietHoursEnd = parseInt(process.env.REPLY_QUIET_HOURS_END, 10);
  }

  return rules;
}

/**
 * Check if current time is within quiet hours (UTC+8 timezone)
 */
function isInQuietHours(rules: ReplyRules): boolean {
  const now = new Date();
  const utc8Hours = (now.getUTCHours() + 8) % 24;

  if (rules.quietHoursStart > rules.quietHoursEnd) {
    // Quiet hours cross midnight (e.g., 23:00 - 07:00)
    return utc8Hours >= rules.quietHoursStart || utc8Hours < rules.quietHoursEnd;
  } else {
    // Quiet hours within same day (e.g., 01:00 - 05:00)
    return utc8Hours >= rules.quietHoursStart && utc8Hours < rules.quietHoursEnd;
  }
}

/**
 * Check user cooldown from database
 */
async function checkUserCooldown(
  userId: string,
  rules: ReplyRules,
): Promise<{ inCooldown: boolean; remainingMinutes: number }> {
  try {
    const prisma = getPrisma();
    const userState = await prisma.userState.findUnique({
      where: { user_id: userId },
    });

    if (!userState || !userState.cooldown_enabled) {
      return { inCooldown: false, remainingMinutes: 0 };
    }

    const updatedAt = new Date(userState.updated_at);
    const cooldownMinutes = rules.userCooldownMinutes[userId] || rules.defaultCooldownMinutes;
    const cooldownEnd = new Date(updatedAt.getTime() + cooldownMinutes * 60 * 1000);
    const now = new Date();

    if (now < cooldownEnd) {
      const remainingMs = cooldownEnd.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      return { inCooldown: true, remainingMinutes };
    }

    return { inCooldown: false, remainingMinutes: 0 };
  } catch (error) {
    console.error('[shouldReply] Error checking user cooldown:', error);
    // On error, allow reply (fail open)
    return { inCooldown: false, remainingMinutes: 0 };
  }
}

/**
 * Analyze comment content
 */
function analyzeContent(
  content: string,
  rules: ReplyRules,
): {
  valid: boolean;
  hasTriggerKeywords: boolean;
  hasBlockKeywords: boolean;
  length: number;
  lengthPenalty: number;
} {
  const length = content.length;
  const normalizedContent = content.toLowerCase();

  // Check length bounds
  const valid = length >= rules.minContentLength && length <= rules.maxContentLength;

  // Check keywords
  const hasTriggerKeywords = rules.triggerKeywords.some((keyword) => normalizedContent.includes(keyword.toLowerCase()));

  const hasBlockKeywords = rules.blockKeywords.some((keyword) => normalizedContent.includes(keyword.toLowerCase()));

  // Calculate length penalty (reduces probability for very long comments)
  let lengthPenalty = 0;
  if (length > rules.lengthPenaltyThreshold) {
    const excess = length - rules.lengthPenaltyThreshold;
    lengthPenalty = Math.min((excess * rules.lengthPenaltyFactor) / 100, 0.5);
  }

  return {
    valid,
    hasTriggerKeywords,
    hasBlockKeywords,
    length,
    lengthPenalty,
  };
}

/**
 * Calculate reply probability based on all factors
 */
function calculateReplyProbability(
  contentAnalysis: ReturnType<typeof analyzeContent>,
  isQuietHours: boolean,
  rules: ReplyRules,
): number {
  let probability = rules.baseReplyProbability;

  // Apply keyword boost
  if (contentAnalysis.hasTriggerKeywords) {
    probability += rules.keywordBoostProbability;
  }

  // Apply length penalty
  probability -= contentAnalysis.lengthPenalty;

  // Apply quiet hours factor
  if (isQuietHours) {
    probability *= rules.quietHoursProbabilityFactor;
  }

  // Block keywords reduce probability to near zero
  if (contentAnalysis.hasBlockKeywords) {
    probability *= 0.05;
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, probability));
}

/**
 * Decide if reply should be generated
 * Migrated from: app.services.decider.should_reply
 *
 * Enhancement: Comprehensive decision logic with:
 * - User cooldown checking (database-backed)
 * - Reply probability calculation (rule-based)
 * - Content analysis (keywords, length)
 * - Time window checking (quiet hours)
 * - Force reply flag support
 *
 * Returns: [should_reply, style_mode, length_mode]
 */
export const shouldReply: ShouldReplyService = async (event) => {
  return shouldReplyForInteraction({
    interaction: legacyShouldReplyInputToInteraction(event),
    forceLong: event.force_long,
    styleProfile: event.style_profile,
    roleProfile: event.role_profile,
    roleCardKey: event.role_card_key,
  });
};

function legacyShouldReplyInputToInteraction(event: LegacyShouldReplyInput): InteractionDecisionInput['interaction'] {
  const platform = (event.platform ?? '').trim().toLowerCase() || 'unknown';

  return {
    platform,
    ingressSource: 'legacy-should-reply',
    traceId: event.trace_id,
    actor: event.user_id ? { platformUserId: event.user_id } : undefined,
    reference: {
      subjectKind: 'comment',
      externalId: event.comment_id,
      canonicalId: `${platform}:${event.comment_id}`,
      containerId: event.video_id,
      parentExternalId: event.parent_id,
    },
    content: {
      text: event.content,
    },
    legacyComment: {
      commentId: event.comment_id,
      videoId: event.video_id,
      parentId: event.parent_id,
    },
  };
}

export const shouldReplyForInteraction: ShouldReplyForInteractionService = async (input) => {
  const rules = loadReplyRules();
  const event = input.interaction;
  const styleProfile = input.styleProfile || 'doro';
  const actorUserId = event.actor?.platformUserId;
  const content = event.content.text || '';

  // 1. Check force flags first (highest priority)
  if (input.forceLong) {
    return [true, styleProfile, 'long'];
  }

  // 2. Check global cooldown toggle
  if (!rules.globalCooldownEnabled) {
    return [true, styleProfile, 'medium'];
  }

  // 3. Check user cooldown (if user_id provided)
  if (actorUserId) {
    const cooldown = await checkUserCooldown(actorUserId, rules);
    if (cooldown.inCooldown) {
      console.log(`[shouldReply] User ${actorUserId} in cooldown for ${cooldown.remainingMinutes} more minutes`);
      return [false, styleProfile, 'medium'];
    }
  }

  // 4. Analyze content
  const contentAnalysis = analyzeContent(content, rules);

  // Reject if content length invalid
  if (!contentAnalysis.valid) {
    console.log(
      `[shouldReply] Content length ${contentAnalysis.length} outside bounds [${rules.minContentLength}, ${rules.maxContentLength}]`,
    );
    return [false, styleProfile, 'medium'];
  }

  // 5. Check time window
  const isQuietHours = isInQuietHours(rules);

  // 6. Calculate probability
  const probability = calculateReplyProbability(contentAnalysis, isQuietHours, rules);

  // 7. Roll the dice
  const shouldReplyFlag = Math.random() < probability;

  // 8. Determine style and length
  const styleMode = styleProfile;
  const lengthMode = content.length > 100 ? 'long' : 'medium';

  console.log(
    `[shouldReply] Decision: ${shouldReplyFlag} (probability: ${(probability * 100).toFixed(1)}%, ` +
      `quiet hours: ${isQuietHours}, trigger keywords: ${contentAnalysis.hasTriggerKeywords}, ` +
      `block keywords: ${contentAnalysis.hasBlockKeywords})`,
  );

  return [shouldReplyFlag, styleMode, lengthMode];
};

/**
 * Decide safety action based on safety check result
 * Migrated from: app.services.decider.decide_safety_action
 *
 * Returns: 'ok' | 'blocked' | 'manual_queue'
 */
export const decideSafetyAction: DecideSafetyActionService = (safe, riskFlags) => {
  if (safe) {
    return 'ok';
  }

  // Check risk severity to determine action
  const decision = (riskFlags as Record<string, unknown>).decision as string | undefined;

  if (decision === 'blocked') {
    return 'blocked';
  }

  if (decision === 'manual_review') {
    return 'manual_queue';
  }

  // Default to manual queue for unsafe content
  return 'manual_queue';
};

export const __deciderTesting = {
  loadReplyRules,
};
