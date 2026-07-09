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

  // Poisson timing engine (B-layer): replaces fixed Math.random < probability
  // λ derived from baseReplyProbability via F1: λ = -ln(1 - baseReplyProbability)
  // Three-state machine active(λ高) / drowsy(λ中) / quiet(λ低) + state drift + transition jitter
  poissonStates: {
    active: { lambda: number };
    drowsy: { lambda: number };
    quiet: { lambda: number };
  };
  stateDriftIntervalMinutes: number;
  stateTransitionJitter: number;
}

/**
 * Reply state for the Poisson timing engine.
 * - active: high reply rate (daytime peak)
 * - drowsy: medium reply rate (transitional)
 * - quiet: low reply rate (maps to quiet hours)
 */
type ReplyState = 'active' | 'drowsy' | 'quiet';

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

  // F1 derivation: λ = -ln(1 - baseReplyProbability) = -ln(1 - 0.7) ≈ 1.204
  // Preserves the P(at least one event) = 1 - e^-λ = 0.7 semantic.
  poissonStates: {
    active: { lambda: 1.204 },
    drowsy: { lambda: 0.6 },
    quiet: { lambda: 0.2 },
  },
  stateDriftIntervalMinutes: 30,
  stateTransitionJitter: 0.1,
};

/**
 * Trigger keywords reused by the C-layer passive-response gate (TASK-003).
 * Single source of truth — derived from DEFAULT_RULES so the gate and the
 * shouldReply content analysis share the exact same keyword list. Exported
 * as a readonly view to prevent callers from mutating the shared list.
 */
export const TRIGGER_KEYWORDS: readonly string[] = DEFAULT_RULES.triggerKeywords;

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
 * Poisson process sampler (Knuth algorithm).
 * Returns the number of events k occurring in a unit interval with rate λ.
 * P(k) = (λ^k * e^-λ) / k!
 */
function samplePoisson(lambda: number): number {
  // Knuth's algorithm: L = e^-λ; k = 0; p = 1
  // do { k++; p *= uniform(0,1) } while p > L; return k - 1
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/**
 * Poisson-based reply decision: reply if at least one event occurs in the interval.
 * P(reply) = P(k >= 1) = 1 - e^-λ, preserving the baseReplyProbability semantic.
 */
function shouldReplyPoisson(lambda: number): boolean {
  return samplePoisson(lambda) >= 1;
}

/**
 * Determine the current reply state for the Poisson timing engine.
 *
 * State machine:
 * - quiet hours (reuse isInQuietHours — F-004 day/night basis) → 'quiet'
 * - otherwise drift between 'active' and 'drowsy' based on a periodic cycle
 *   (stateDriftIntervalMinutes) with transition jitter, so the state changes
 *   over time instead of being stuck on a fixed pattern.
 *
 * The deterministic cycle index uses wall-clock minutes since epoch divided by
 * the drift interval; jitter modulates the active/drowsy split threshold so the
 * boundary shifts, eliminating a fixed-pattern ban cause.
 */
function getCurrentReplyState(rules: ReplyRules, date: Date = new Date()): ReplyState {
  if (isInQuietHoursAt(rules, date)) {
    return 'quiet';
  }

  // Periodic drift: which drift-slot are we in?
  const slotMs = rules.stateDriftIntervalMinutes * 60 * 1000;
  const slotIndex = Math.floor(date.getTime() / slotMs);

  // Jitter: hash slotIndex into [0,1) deterministically so the active/drowsy
  // boundary shifts across slots. Combined with slotIndex this gives a stable
  // per-slot state that still drifts over time.
  const jitterSeed = Math.abs(Math.sin(slotIndex * 12.9898) * 43758.5453) % 1;
  const jitterThreshold = 0.5 + (jitterSeed - 0.5) * rules.stateTransitionJitter * 2;

  // Alternate active/drowsy by slot parity, with jitter shifting the boundary.
  return slotIndex % 2 === 0
    ? jitterSeed < jitterThreshold
      ? 'active'
      : 'drowsy'
    : jitterSeed < jitterThreshold
      ? 'drowsy'
      : 'active';
}

/**
 * Quiet-hours check pinned to an explicit date (testable).
 */
function isInQuietHoursAt(rules: ReplyRules, date: Date): boolean {
  const utc8Hours = (date.getUTCHours() + 8) % 24;
  if (rules.quietHoursStart > rules.quietHoursEnd) {
    return utc8Hours >= rules.quietHoursStart || utc8Hours < rules.quietHoursEnd;
  }
  return utc8Hours >= rules.quietHoursStart && utc8Hours < rules.quietHoursEnd;
}

/**
 * Feature flag for the B-layer Poisson timing engine (L8 isolation).
 * When off, falls back to the original Math.random < probability behavior so the
 * change can be rolled back independently of other antirisk layers.
 */
function isTimingEngineEnabled(): boolean {
  return process.env.TIMING_ENGINE_ENABLED !== 'false';
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

  // Apply quiet hours factor only when the Poisson timing engine is disabled.
  // When the timing engine is enabled, quiet hours map to the 'quiet' reply state
  // (low λ), so the probability scalar must not double-diminish the decision.
  if (isQuietHours && !isTimingEngineEnabled()) {
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

  // 7. Roll the dice — Poisson timing engine (L8 flag-gated)
  // When the timing engine is enabled, replace the fixed Math.random < probability
  // with a Poisson process sample keyed off the current reply state (active/drowsy/quiet),
  // preserving the P(reply) = 1 - e^-λ = baseReplyProbability semantic while eliminating
  // the fixed-pattern ban cause via state drift + transition jitter.
  let replyState: ReplyState | null = null;
  let poissonLambda: number | null = null;
  let shouldReplyFlag: boolean;
  if (isTimingEngineEnabled()) {
    replyState = getCurrentReplyState(rules);
    poissonLambda = rules.poissonStates[replyState].lambda;
    shouldReplyFlag = shouldReplyPoisson(poissonLambda);
  } else {
    shouldReplyFlag = Math.random() < probability;
  }

  // 8. Determine style and length
  const styleMode = styleProfile;
  const lengthMode = content.length > 100 ? 'long' : 'medium';

  const stateLog = replyState ? `, state: ${replyState}, λ: ${poissonLambda}` : '';
  console.log(
    `[shouldReply] Decision: ${shouldReplyFlag} (probability: ${(probability * 100).toFixed(1)}%, ` +
      `quiet hours: ${isQuietHours}, trigger keywords: ${contentAnalysis.hasTriggerKeywords}, ` +
      `block keywords: ${contentAnalysis.hasBlockKeywords}${stateLog})`,
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
  samplePoisson,
  shouldReplyPoisson,
  getCurrentReplyState,
  isTimingEngineEnabled,
};
