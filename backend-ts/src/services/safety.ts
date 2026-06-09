/**
 * Safety service for content safety checks
 * Migrated from Python: app/services/safety.py
 *
 * Enhanced: Combines Python rule-chain (keyword_blacklist, PII detection, length_limit)
 * with risk-scoring content categorization and spam/URL checks.
 */

import type { SafetyCheckService } from './interfaces.js';

// ── PII Patterns (migrated from Python settings) ──────────────

const PII_PATTERNS: Record<string, RegExp> = {
  phone: /1[3-9]\d{2}(?:-?\d{4}){2}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  id_card: /[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
  bank_card: /(?:62|4\d|5[1-5])\d{14,17}/g,
};

// ── Keyword Blacklist (migrated from Python settings) ─────────

const DEFAULT_KEYWORD_BLACKLIST = ['政治', '仇恨', '身份证', '手机号', '去死'];

function loadKeywordBlacklist(): string[] {
  const envList = process.env.SAFETY_KEYWORD_BLACKLIST;
  if (envList) {
    return envList
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
  }
  return DEFAULT_KEYWORD_BLACKLIST;
}

function isKeywordBlacklistEnabled(): boolean {
  return process.env.SAFETY_ENABLE_KEYWORD_BLACKLIST !== 'false';
}

function isPiiDetectionEnabled(): boolean {
  return process.env.SAFETY_ENABLE_PII_DETECTION !== 'false';
}

function maxReplyChars(): number {
  const env = process.env.SAFETY_MAX_REPLY_CHARS;
  if (env) {
    const n = parseInt(env, 10);
    return Number.isFinite(n) && n > 0 ? n : 900;
  }
  return 900;
}

// ── Content Categories ──────────────────────────────────────

interface SafetyConfig {
  lowRiskThreshold: number;
  mediumRiskThreshold: number;
  highRiskThreshold: number;
  minContentLength: number;
  maxContentLength: number;
  sensitivityLevel: 'low' | 'medium' | 'high';
  enableProfanityCheck: boolean;
  enableSpamCheck: boolean;
  enableUrlCheck: boolean;
  enableRepetitionCheck: boolean;
}

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
  enableRepetitionCheck: true,
};

const CONTENT_CATEGORIES: Record<string, { keywords: string[]; weight: number }> = {
  politics: {
    keywords: [
      '政治',
      '政府',
      '领导',
      '党',
      '国家政策',
      '敏感',
      '六四',
      '天安门',
      '台独',
      '藏独',
      '疆独',
      '法轮功',
      '反华',
      '游行',
      '示威',
    ],
    weight: 0.8,
  },
  adult: {
    keywords: ['色情', '裸体', '性爱', '成人', '18+', 'porn', 'sex', 'nude', '情色', '约炮', '一夜情'],
    weight: 0.9,
  },
  advertising: {
    keywords: [
      '广告',
      '推广',
      '加群',
      '加微',
      '加QQ',
      '微信号',
      'QQ群',
      '优惠',
      '促销',
      '折扣',
      '代购',
      '兼职',
      '赚钱',
      '刷单',
    ],
    weight: 0.5,
  },
  violence: {
    keywords: ['暴力', '血腥', '杀人', '自杀', '恐怖', '炸弹', '袭击', '死亡', '尸体', '残忍'],
    weight: 0.85,
  },
  fraud: {
    keywords: ['诈骗', '骗局', '钓鱼', '中奖', '领奖', '免费领取', '点击链接', '验证码', '账号密码', '银行卡'],
    weight: 0.7,
  },
};

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
  /bitch/i,
];

const SPAM_PATTERNS = [/(.)\1{5,}/g, /(.{2,})\1{2,}/g, /[A-Z]{10,}/g, /[!！]{5,}/g, /[?？]{5,}/g];

// ── Internal helpers ────────────────────────────────────────

function loadSafetyConfig(): SafetyConfig {
  const config = { ...DEFAULT_CONFIG };
  if (process.env.SAFETY_SENSITIVITY_LEVEL) {
    const level = process.env.SAFETY_SENSITIVITY_LEVEL as 'low' | 'medium' | 'high';
    if (['low', 'medium', 'high'].includes(level)) {
      config.sensitivityLevel = level;
    }
  }
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

function detectCategories(text: string): Map<string, number> {
  const detected = new Map<string, number>();
  const lower = text.toLowerCase();
  for (const [category, { keywords, weight }] of Object.entries(CONTENT_CATEGORIES)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        detected.set(category, (detected.get(category) || 0) + weight);
      }
    }
  }
  return detected;
}

function checkProfanity(text: string, config: SafetyConfig): number {
  if (!config.enableProfanityCheck) return 0;
  let score = 0;
  for (const pattern of PROFANITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) score += 0.3 * matches.length;
  }
  return Math.min(score, 1.0);
}

function checkSpam(text: string, config: SafetyConfig): number {
  if (!config.enableSpamCheck) return 0;
  let score = 0;
  if (config.enableRepetitionCheck) {
    for (const pattern of SPAM_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) score += 0.2 * matches.length;
    }
  }
  return Math.min(score, 1.0);
}

function checkUrls(text: string, config: SafetyConfig): number {
  if (!config.enableUrlCheck) return 0;
  const matches = text.match(/https?:\/\/[^\s]+/gi);
  if (!matches) return 0;
  return Math.min(0.2 * matches.length, 0.8);
}

// ── Python-parity rules ────────────────────────────────────

function checkKeywordBlacklist(text: string): { blocked: boolean; words: string[] } {
  if (!isKeywordBlacklistEnabled()) return { blocked: false, words: [] };
  const blacklist = loadKeywordBlacklist();
  const found = blacklist.filter((word) => word && text.includes(word));
  return { blocked: found.length > 0, words: found };
}

function checkPii(text: string): { detected: boolean; matches: Array<{ type: string; value: string }> } {
  if (!isPiiDetectionEnabled()) return { detected: false, matches: [] };
  const matches: Array<{ type: string; value: string }> = [];
  const seen = new Set<string>();
  for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
    const findings = text.match(pattern);
    if (!findings) continue;
    for (const finding of findings) {
      const value = String(finding).trim();
      const key = `${piiType}:${value}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({ type: piiType, value });
      }
    }
  }
  return { detected: matches.length > 0, matches };
}

// ── Public API ─────────────────────────────────────────────

/**
 * Check content safety
 * Migrated from: app.services.safety.safety_check
 *
 * Enhanced: Combines Python rule-chain (keyword_blacklist → PII detection → length_limit)
 * with risk-scoring content categorization, profanity, spam, and URL checks.
 *
 * Returns: [safe, risk_flags]
 */
export const safetyCheck: SafetyCheckService = async (text) => {
  const config = loadSafetyConfig();
  const riskFlags: Record<string, unknown> & { triggered_rules: string[] } = {
    decision: 'allow',
    reason: '',
    blocked_words: [],
    pii_matches: [],
    triggered_rules: [] as string[],
    max_length: maxReplyChars(),
    actual_length: text.length,
  };

  // --- Rule 1: Keyword blacklist (Python parity) ---
  const blacklistResult = checkKeywordBlacklist(text);
  if (blacklistResult.blocked) {
    riskFlags.blocked_words = blacklistResult.words;
    riskFlags.triggered_rules.push('keyword_blacklist');
    riskFlags.decision = 'blocked';
    riskFlags.reason = 'contains_blocked_words';
    return [false, riskFlags];
  }

  // --- Rule 2: PII detection (Python parity) ---
  const piiResult = checkPii(text);
  if (piiResult.detected) {
    riskFlags.pii_matches = piiResult.matches;
    riskFlags.triggered_rules.push('pii_detection');
    const piiAction = process.env.SAFETY_PII_ACTION || 'manual_queue';
    riskFlags.decision = piiAction === 'blocked' ? 'blocked' : 'manual_queue';
    riskFlags.reason = 'contains_pii';
    return [false, riskFlags];
  }

  // --- Rule 3: Length limit (Python parity) ---
  const maxLen = maxReplyChars();
  if (text.length > maxLen) {
    riskFlags.triggered_rules.push('length_limit');
    riskFlags.decision = 'blocked';
    riskFlags.reason = 'too_long';
    return [false, riskFlags];
  }

  // --- Extended: Content categorization + risk scoring ---
  const categoryScores = detectCategories(text);
  const profanityScore = checkProfanity(text, config);
  const spamScore = checkSpam(text, config);
  const urlScore = checkUrls(text, config);

  const maxCategoryScore = Math.max(0, ...categoryScores.values());

  const weights = { categories: 0.5, profanity: 0.3, spam: 0.1, urls: 0.1 };
  const totalScore = Math.min(
    maxCategoryScore * weights.categories +
      profanityScore * weights.profanity +
      spamScore * weights.spam +
      urlScore * weights.urls,
    1.0,
  );

  const decision =
    totalScore >= config.mediumRiskThreshold
      ? 'blocked'
      : totalScore >= config.lowRiskThreshold
        ? 'manual_review'
        : 'ok';

  riskFlags.risk_score = totalScore;
  riskFlags.sensitivity_level = config.sensitivityLevel;

  if (categoryScores.size > 0) {
    riskFlags.detected_categories = Array.from(categoryScores.entries())
      .filter(([, score]) => score > 0)
      .map(([category, score]) => ({ category, score: Math.min(score, 1.0) }));
  }
  if (profanityScore > 0) riskFlags.profanity_detected = true;
  if (spamScore > 0) riskFlags.spam_detected = true;
  if (urlScore > 0) riskFlags.urls_detected = true;

  if (decision !== 'ok') {
    riskFlags.decision = decision;
    riskFlags.reason = decision === 'blocked' ? 'high_risk_content' : 'medium_risk_content';
  }

  return [decision === 'ok', riskFlags];
};

export const __safetyTesting = {
  checkKeywordBlacklist,
  checkPii,
  checkProfanity,
  checkSpam,
  checkUrls,
  detectCategories,
  isKeywordBlacklistEnabled,
  isPiiDetectionEnabled,
  loadKeywordBlacklist,
  loadSafetyConfig,
  maxReplyChars,
};
