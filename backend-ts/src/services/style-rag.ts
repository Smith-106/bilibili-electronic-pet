/**
 * D4 Style RAG (TASK-M3-002 G2, terminology.md StyleRag)
 *
 * M2 TASK-005 D4 三层角色 SpeakingStyle 是 JSON hints 全量塞 prompt. 现升级: 加纯 TS
 * BM25/TF-IDF 检索, 从 style 语料库检索 top-K 相关 style hints, 非全量塞.
 *
 * ## 非向量 DB 升级 (项目适配)
 *
 * 真实 BM25 + TF-IDF 计算 (纯 TS), 非 chromadb Docker 反模式. 语料库规模小 (单 RoleCard
 * 的 style_hints 数组, MVP 通常 <= 10 条), 无需外部索引服务. tokenize 复用
 * consistency-metrics pattern (CJK + ASCII word split, TASK-006 caveat: CJK 无分词器
 * MVP, 按字符级 + ASCII 词级混合 split).
 *
 * ## Backward-Compat (C-007 零 migration)
 *
 * - style_hints optional: 缺失 → retrieveTopKStyleHints 返回空 → 调用方走原单条
 *   SpeakingStyle byte-for-byte (three-layer-persona.renderThreeLayerPersonaSegment).
 * - query optional: 不传 → 不检索, 走原单条 SpeakingStyle byte-for-byte.
 *
 * ## 边界 (fail-open)
 *
 * - 空 corpus → 返回空数组 (不报错, 调用方 fallback).
 * - 单条 corpus + query → 返回该单条 (top-K=1, 唯一候选).
 * - k > corpus 长度 → 返回全量 corpus (按相关性排序).
 * - 空 query → 返回空数组 (无检索意图, 调用方 fallback 到 byte-for-byte).
 */

import type { SpeakingStyle } from './three-layer-persona.js';

// BM25 标准参数 (Robertson & Zaragoza, k1=1.5, b=0.75)
const BM25_K1 = 1.5;
const BM25_B = 0.75;

// ============================================================
// Tokenize (复用 consistency-metrics pattern)
// ============================================================

/**
 * 文本分词: 复用 consistency-metrics.tokenize pattern (lowercase + CJK/ASCII split).
 *
 * CJK caveat (TASK-006): MVP 无中文分词器, 按 CJK 字符级 + ASCII 词级混合 split.
 * 伪分词对 BM25 排序仍有效 (CJK 字符重叠即相关性信号).
 */
export function tokenize(text: string): string[] {
  if (typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9一-龥]+/u)
    .filter((t) => t.length > 0);
}

// ============================================================
// TF-IDF
// ============================================================

/**
 * TF-IDF score: 单 doc 对单 query 的累加得分.
 *
 * tf = term freq in doc / doc length
 * idf = log(1 + (N - n_t + 0.5) / (n_t + 0.5))  (Robertson IDF, 平滑, 避免除零)
 *
 * @param queryTokens 查询 token 数组
 * @param docTokens   doc token 数组
 * @param idf         每个 query token 的 idf 值 (Map<token, idf>)
 */
export function tfidfScore(
  queryTokens: string[],
  docTokens: string[],
  idf: Map<string, number>,
): number {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;
  const docLen = docTokens.length;
  const docFreq = new Map<string, number>();
  for (const t of docTokens) {
    docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  }
  let score = 0;
  for (const qt of queryTokens) {
    const tf = (docFreq.get(qt) ?? 0) / docLen;
    const idfVal = idf.get(qt) ?? 0;
    score += tf * idfVal;
  }
  return score;
}

/**
 * 计算 corpus 的 idf map (每个 token 在 corpus 中的 Robertson idf).
 */
export function computeIdf(corpusTokens: string[][]): Map<string, number> {
  const N = corpusTokens.length;
  const idf = new Map<string, number>();
  if (N === 0) return idf;
  const docFreq = new Map<string, number>();
  for (const tokens of corpusTokens) {
    const seen = new Set(tokens);
    for (const t of seen) {
      docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
    }
  }
  for (const [token, n_t] of docFreq) {
    // Robertson IDF (BM25-style, 平滑)
    idf.set(token, Math.log(1 + (N - n_t + 0.5) / (n_t + 0.5)));
  }
  return idf;
}

// ============================================================
// BM25
// ============================================================

/**
 * BM25 docStats (预计算, 避免重复计算).
 */
export type Bm25DocStats = {
  tokens: string[];
  length: number;
  termFreq: Map<string, number>;
};

/**
 * BM25 单 doc 对单 query 的得分 (Okapi BM25).
 *
 * score = Σ_q [ idf(q) * (tf(q,d) * (k1+1)) / (tf(q,d) + k1*(1 - b + b*|d|/avgdl)) ]
 *
 * @param queryTokens 查询 token 数组
 * @param doc         doc 预计算 stats
 * @param avgdl       corpus 平均 doc 长度
 * @param idf         token idf map (与 BM25 共用 Robertson idf)
 */
export function bm25Score(
  queryTokens: string[],
  doc: Bm25DocStats,
  avgdl: number,
  idf: Map<string, number>,
): number {
  if (queryTokens.length === 0 || doc.length === 0) return 0;
  let score = 0;
  for (const qt of queryTokens) {
    const tf = doc.termFreq.get(qt) ?? 0;
    if (tf === 0) continue;
    const idfVal = idf.get(qt) ?? 0;
    const denom = tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / (avgdl || 1)));
    score += (idfVal * (tf * (BM25_K1 + 1))) / (denom || 1);
  }
  return score;
}

/**
 * 预计算 doc stats (tokenize + length + termFreq).
 */
function buildDocStats(tokens: string[]): Bm25DocStats {
  const termFreq = new Map<string, number>();
  for (const t of tokens) {
    termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
  }
  return { tokens, length: tokens.length, termFreq };
}

// ============================================================
// Style Hint → Doc Text 拼接
// ============================================================

/**
 * 将 SpeakingStyle 拼接为 doc text (用于 BM25 索引/检索).
 *
 * 用 tone/formality/emoji_usage/sentence_length 字段组合 (非全量塞 prompt, 仅作 doc text
 * 供 BM25 计算 token 相似度). 缺失字段跳过.
 */
export function styleHintToDocText(hint: SpeakingStyle): string {
  const parts: string[] = [];
  if (hint.tone) parts.push(hint.tone);
  if (hint.formality !== undefined) parts.push(`formality${hint.formality}`);
  if (hint.emoji_usage !== undefined) parts.push(`emoji${hint.emoji_usage}`);
  if (hint.sentence_length) parts.push(hint.sentence_length);
  return parts.join(' ');
}

// ============================================================
// Top-K 检索
// ============================================================

/**
 * 从 style 语料库检索 top-K 相关 style hints (BM25 排序).
 *
 * 流程:
 *   1. 边界: 空 corpus / 空 query → 返回空数组 (fail-open, 调用方 fallback).
 *   2. tokenize query + 每条 hint (doc text = styleHintToDocText).
 *   3. 计算 corpus idf + avgdl.
 *   4. 每条 doc 算 BM25 score, 排序取 top-K.
 *   5. k > corpus 长度 → 返回全量 (按 score 排序).
 *
 * @param query  检索查询 (通常 user_comment)
 * @param corpus style hints 语料库
 * @param k      top-K, default 3
 * @returns BM25 top-K hints (按 score 降序), 空 query/corpus 返回空数组
 */
export function retrieveTopKStyleHints(
  query: string,
  corpus: SpeakingStyle[],
  k = 3,
): SpeakingStyle[] {
  if (!query || typeof query !== 'string') return [];
  if (!Array.isArray(corpus) || corpus.length === 0) return [];
  if (k <= 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const docTokensArr = corpus.map((h) => tokenize(styleHintToDocText(h)));
  const idf = computeIdf(docTokensArr);
  const avgdl = docTokensArr.reduce((sum, t) => sum + t.length, 0) / docTokensArr.length;

  const scored = corpus.map((hint, i) => {
    const stats = buildDocStats(docTokensArr[i]);
    const score = bm25Score(queryTokens, stats, avgdl, idf);
    return { hint, score, index: i };
  });

  // 排序: score 降序, 同分按原 index 升序 (稳定排序, 可复现)
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  // 过滤 score=0 (无 token 重叠), 仅返回有相关性的 hints. 若全部 score=0 → 返回空 (fail-open).
  const positive = scored.filter((s) => s.score > 0);
  if (positive.length === 0) return [];

  const effectiveK = Math.min(k, positive.length);
  return positive.slice(0, effectiveK).map((s) => s.hint);
}

// ============================================================
// 测试导出
// ============================================================

export const __StyleRagTesting = {
  BM25_K1,
  BM25_B,
  tokenize,
  tfidfScore,
  computeIdf,
  bm25Score,
  buildDocStats,
  styleHintToDocText,
  retrieveTopKStyleHints,
};
