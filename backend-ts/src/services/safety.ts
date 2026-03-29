/**
 * Safety service for content safety checks
 * Migrated from Python: app/services/safety.py
 */

import type { SafetyCheckService } from './interfaces.js';

/**
 * Safety check configuration
 */
interface SafetyConfig {
  // Risk thresholds
  lowRiskThreshold: number;    // 0.0 - 0.3: safe
  mediumRiskThreshold: number; // 0.3 - 0.6: manual review
  highRiskThreshold: number;   // 0.6 - 1.0: blocked

  // Content length limits
  minContentLength: number;
  maxContentLength: number;

  // Sensitivity levels
  sensitivityLevel: 'low' | 'medium' | 'high';

  // Enable/disable specific checks
  enableProfanityCheck: boolean;
  enableSpamCheck: boolean;
  enableUrlCheck: boolean;
  enableRepetitionCheck: boolean;
}

/**
 * Default safety configuration
 */
const DEFAULT_CONFIG: SafetyConfig = {
  lowRiskThreshold: 0.3,
  mediumRiskThreshold: 0.6,
  highRiskThreshold: 1.0,

  minContentLength: 2,
  maxContentLength: 2000,

  sensitivityLevel: 'medium',

  enableProfanityCheck: true,
  enableSpamCheck: true,
  enableUrlCheck: true,
  enableRepetitionCheck: true
};

/**
 * Content categories with keywords
 */
const CONTENT_CATEGORIES = {
  politics: {
    keywords: [
      '政治', '政府', '领导', '党', '国家政策', '敏感', '六四', '天安门',
      '台独', '藏独', '疆独', '法轮功', '反华', '游行', '示威'
    ],
    weight: 0.8
  },
  adult: {
    keywords: [
      '色情', '裸体', '性爱', '成人', '18+', 'porn', 'sex', 'nude',
      '情色', '约炮', '一夜情'
    ],
    weight: 0.9
  },
  advertising: {
    keywords: [
      '广告', '推广', '加群', '加微', '加QQ', '微信号', 'QQ群',
      '优惠', '促销', '折扣', '代购', '兼职', '赚钱', '刷单'
    ],
    weight: 0.5
  },
  violence: {
    keywords: [
      '暴力', '血腥', '杀人', '自杀', '恐怖', '炸弹', '袭击',
      '死亡', '尸体', '残忍'
    ],
    weight: 0.85
  },
  fraud: {
    keywords: [
      '诈骗', '骗局', '钓鱼', '中奖', '领奖', '免费领取',
      '点击链接', '验证码', '账号密码', '银行卡'
    ],
    weight: 0.7
  }
};

/**
 * Profanity patterns (partial list for demonstration)
 */
const PROFANITY_PATTERNS = [
  /傻[比逼笔B]/i,
  /操[你那]/i,
  /妈的/i,
  /他妈/i,
  /草泥马/i,
  /王八蛋/i,
  /滚蛋/i,
  /废物/i,
  /智障/i,
  /脑残/i,
  /fuck/i,
  /shit/i,
  /damn/i,
  /bitch/i
];

/**
 * Spam patterns
 */
const SPAM_PATTERNS = [
  /(.)\1{5,}/g,          // Repeated characters (e.g., "!!!!!!")
  /(.{2,})\1{2,}/g,      // Repeated phrases
  /[A-Z]{10,}/g,         // Excessive uppercase
  /[\!！]{5,}/g,         // Excessive exclamation marks
  /[\?？]{5,}/g          // Excessive question marks
];

/**
 * Load safety configuration from environment
 */
function loadSafetyConfig(): SafetyConfig {
  const config = { ...DEFAULT_CONFIG };

  if (process.env.SAFETY_SENSITIVITY_LEVEL) {
    const level = process.env.SAFETY_SENSITIVITY_LEVEL as 'low' | 'medium' | 'high';
    if (['low', 'medium', 'high'].includes(level)) {
      config.sensitivityLevel = level;
    }
  }

  // Adjust thresholds based on sensitivity level
  switch (config.sensitivityLevel) {
    case 'low':
      config.lowRiskThreshold = 0.4;
      config.mediumRiskThreshold = 0.7;
      break;
    case 'high':
      config.lowRiskThreshold = 0.2;
      config.mediumRiskThreshold = 0.5;
      break;
  }

  return config;
}

/**
 * Detect content categories
 */
function detectCategories(text: string): Map<string, number> {
  const detectedCategories = new Map<string, number>();
  const lowerText = text.toLowerCase();

  for (const [category, config] of Object.entries(CONTENT_CATEGORIES)) {
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        // Add weighted score for this category
        const currentScore = detectedCategories.get(category) || 0;
        detectedCategories.set(category, currentScore + config.weight);
      }
    }
  }

  return detectedCategories;
}

/**
 * Check profanity
 */
function checkProfanity(text: string, config: SafetyConfig): number {
  if (!config.enableProfanityCheck) return 0;

  let profanityScore = 0;
  for (const pattern of PROFANITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      profanityScore += 0.3 * matches.length;
    }
  }

  return Math.min(profanityScore, 1.0);
}

/**
 * Check spam patterns
 */
function checkSpam(text: string, config: SafetyConfig): number {
  if (!config.enableSpamCheck) return 0;

  let spamScore = 0;

  // Check repetition patterns
  if (config.enableRepetitionCheck) {
    for (const pattern of SPAM_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        spamScore += 0.2 * matches.length;
      }
    }
  }

  return Math.min(spamScore, 1.0);
}

/**
 * Check URLs
 */
function checkUrls(text: string, config: SafetyConfig): number {
  if (!config.enableUrlCheck) return 0;

  const urlPattern = /https?:\/\/[^\s]+/gi;
  const matches = text.match(urlPattern);

  if (!matches) return 0;

  // Multiple URLs increase suspicion
  return Math.min(0.2 * matches.length, 0.8);
}

/**
 * Calculate overall risk score
 */
function calculateRiskScore(
  categoryScores: Map<string, number>,
  profanityScore: number,
  spamScore: number,
  urlScore: number,
  config: SafetyConfig
): { score: number; breakdown: Record<string, number | string> } {
  // Weight different risk factors
  const weights = {
    categories: 0.5,
    profanity: 0.3,
    spam: 0.1,
    urls: 0.1
  };

  // Aggregate category scores
  let maxCategoryScore = 0;
  let dominantCategory = '';
  for (const [category, score] of categoryScores.entries()) {
    if (score > maxCategoryScore) {
      maxCategoryScore = score;
      dominantCategory = category;
    }
  }

  // Calculate weighted total
  const totalScore =
    maxCategoryScore * weights.categories +
    profanityScore * weights.profanity +
    spamScore * weights.spam +
    urlScore * weights.urls;

  // Build breakdown
  const breakdown: Record<string, number | string> = {
    total: Math.min(totalScore, 1.0),
    categories: maxCategoryScore,
    profanity: profanityScore,
    spam: spamScore,
    urls: urlScore
  };

  if (dominantCategory) {
    breakdown.dominant_category = dominantCategory;
  }

  return { score: breakdown.total as number, breakdown };
}

/**
 * Determine safety decision
 */
function determineDecision(riskScore: number, config: SafetyConfig): 'ok' | 'manual_review' | 'blocked' {
  if (riskScore >= config.mediumRiskThreshold) {
    return 'blocked';
  } else if (riskScore >= config.lowRiskThreshold) {
    return 'manual_review';
  }
  return 'ok';
}

/**
 * Check content safety
 * Migrated from: app.services.safety.safety_check
 *
 * Enhancement: Comprehensive safety analysis with:
 * - Extended sensitive keyword libraries
 * - Content categorization (politics, adult, ads, violence, fraud)
 * - Risk level assessment (low/medium/high)
 * - Sensitivity scoring with configurable thresholds
 * - Custom rule support via environment variables
 *
 * Returns: [safe, risk_flags]
 */
export const safetyCheck: SafetyCheckService = async (text) => {
  const config = loadSafetyConfig();
  const riskFlags: Record<string, unknown> = {};

  // 1. Check content length
  const textLength = text.length;
  if (textLength < config.minContentLength) {
    riskFlags.decision = 'blocked';
    riskFlags.reason = 'content_too_short';
    riskFlags.length = textLength;
    return [false, riskFlags];
  }

  if (textLength > config.maxContentLength) {
    riskFlags.decision = 'blocked';
    riskFlags.reason = 'content_too_long';
    riskFlags.length = textLength;
    return [false, riskFlags];
  }

  // 2. Detect content categories
  const categoryScores = detectCategories(text);

  // 3. Check profanity
  const profanityScore = checkProfanity(text, config);

  // 4. Check spam patterns
  const spamScore = checkSpam(text, config);

  // 5. Check URLs
  const urlScore = checkUrls(text, config);

  // 6. Calculate overall risk score
  const { score, breakdown } = calculateRiskScore(
    categoryScores,
    profanityScore,
    spamScore,
    urlScore,
    config
  );

  // 7. Determine decision
  const decision = determineDecision(score, config);
  const safe = decision === 'ok';

  // 8. Build risk flags
  riskFlags.risk_score = score;
  riskFlags.breakdown = breakdown;
  riskFlags.sensitivity_level = config.sensitivityLevel;

  if (categoryScores.size > 0) {
    riskFlags.detected_categories = Array.from(categoryScores.entries())
      .filter(([, score]) => score > 0)
      .map(([category, score]) => ({ category, score: Math.min(score, 1.0) }));
  }

  if (profanityScore > 0) {
    riskFlags.profanity_detected = true;
    riskFlags.profanity_score = profanityScore;
  }

  if (spamScore > 0) {
    riskFlags.spam_detected = true;
    riskFlags.spam_score = spamScore;
  }

  if (urlScore > 0) {
    riskFlags.urls_detected = true;
    riskFlags.url_score = urlScore;
  }

  if (!safe) {
    riskFlags.decision = decision;
    riskFlags.reason = decision === 'blocked' ? 'high_risk_content' : 'medium_risk_content';
  }

  console.log(
    `[safetyCheck] Decision: ${decision} (risk score: ${(score * 100).toFixed(1)}%, ` +
    `categories: ${categoryScores.size}, profanity: ${profanityScore.toFixed(2)}, ` +
    `spam: ${spamScore.toFixed(2)}, urls: ${urlScore.toFixed(2)})`
  );

  return [safe, riskFlags];
};
