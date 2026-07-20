import { describe, expect, it } from 'vitest';

import {
  __StyleRagTesting,
  retrieveTopKStyleHints,
  type Bm25DocStats,
} from '../src/services/style-rag.js';
import type { SpeakingStyle } from '../src/services/three-layer-persona.js';

// D4 style RAG (TASK-M3-002 G2) 测试.
// 纯 TS BM25/TF-IDF 检索, 非 chromadb Docker 反模式. backward-compat: 空 query/corpus 返回空.

const {
  BM25_K1,
  BM25_B,
  tokenize,
  tfidfScore,
  computeIdf,
  bm25Score,
  buildDocStats,
  styleHintToDocText,
} = __StyleRagTesting;

describe('style-rag: tokenize (CJK + ASCII split, consistency-metrics pattern)', () => {
  it('splits ASCII words by non-alphanumeric', () => {
    expect(tokenize('warm playful calm')).toEqual(['warm', 'playful', 'calm']);
  });

  it('lowercases tokens', () => {
    expect(tokenize('Warm PLAYFUL')).toEqual(['warm', 'playful']);
  });

  it('keeps CJK characters as char-level tokens (TASK-006 caveat, no segmenter)', () => {
    expect(tokenize('温暖活泼')).toEqual(['温暖活泼']);
  });

  it('splits CJK + ASCII mixed', () => {
    expect(tokenize('warm 温暖 short')).toEqual(['warm', '温暖', 'short']);
  });

  it('returns empty for empty/non-string input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
    expect(tokenize(null as unknown as string)).toEqual([]);
  });
});

describe('style-rag: styleHintToDocText (SpeakingStyle → doc text)', () => {
  it('joins all present fields', () => {
    const hint: SpeakingStyle = {
      tone: 'warm',
      formality: 0.2,
      emoji_usage: 0.8,
      sentence_length: 'short',
    };
    expect(styleHintToDocText(hint)).toBe('warm formality0.2 emoji0.8 short');
  });

  it('skips undefined fields', () => {
    const hint: SpeakingStyle = { tone: 'calm', sentence_length: 'long' };
    expect(styleHintToDocText(hint)).toBe('calm long');
  });

  it('returns empty for empty hint', () => {
    expect(styleHintToDocText({})).toBe('');
  });
});

describe('style-rag: computeIdf (Robertson IDF, smoothed)', () => {
  it('returns empty map for empty corpus', () => {
    expect(computeIdf([]).size).toBe(0);
  });

  it('computes idf (token in all docs → low/zero idf; rare token → higher)', () => {
    const corpus = [
      tokenize('warm calm'),
      tokenize('warm playful'),
    ];
    const idf = computeIdf(corpus);
    // "warm" in 2/2 docs → idf = log(1 + (2-2+0.5)/(2+0.5)) = log(1.2)
    const warmIdf = idf.get('warm');
    const calmIdf = idf.get('calm');
    expect(warmIdf).toBeCloseTo(Math.log(1.2), 5);
    // "calm" in 1/2 docs → idf = log(1 + (2-1+0.5)/(1+0.5)) = log(2)
    expect(calmIdf).toBeCloseTo(Math.log(2), 5);
    expect(calmIdf!).toBeGreaterThan(warmIdf!);
  });
});

describe('style-rag: tfidfScore', () => {
  it('returns 0 for empty query or empty doc', () => {
    const idf = new Map([['warm', 0.5]]);
    expect(tfidfScore([], ['warm'], idf)).toBe(0);
    expect(tfidfScore(['warm'], [], idf)).toBe(0);
  });

  it('shorter doc with same tf count → higher normalized tf score', () => {
    const idf = new Map([['warm', 0.5]]);
    // both docs have warm once; shorter doc → higher tf (tf = count/docLen)
    const scoreShort = tfidfScore(['warm'], ['warm'], idf);
    const scoreLong = tfidfScore(['warm'], ['warm', 'calm'], idf);
    expect(scoreShort).toBeGreaterThan(scoreLong);
  });

  it('idf weights query terms', () => {
    const idf = new Map([
      ['warm', 0.1],
      ['calm', 0.9],
    ]);
    const scoreWarm = tfidfScore(['warm'], ['warm', 'calm'], idf);
    const scoreCalm = tfidfScore(['calm'], ['warm', 'calm'], idf);
    // same tf (1/2), higher idf → higher score
    expect(scoreCalm).toBeGreaterThan(scoreWarm);
  });
});

describe('style-rag: bm25Score (Okapi BM25, k1=1.5 b=0.75)', () => {
  it('BM25 params are standard (k1=1.5, b=0.75)', () => {
    expect(BM25_K1).toBe(1.5);
    expect(BM25_B).toBe(0.75);
  });

  it('returns 0 for empty query or empty doc', () => {
    const idf = new Map([['warm', 0.5]]);
    const doc = buildDocStats(['warm']);
    expect(bm25Score([], doc, 1, idf)).toBe(0);
    expect(bm25Score(['warm'], buildDocStats([]), 1, idf)).toBe(0);
  });

  it('query hits doc → positive score; misses → 0', () => {
    const idf = new Map([['warm', 0.5]]);
    const doc = buildDocStats(['warm', 'calm']);
    const hit = bm25Score(['warm'], doc, 2, idf);
    const miss = bm25Score(['playful'], doc, 2, idf);
    expect(hit).toBeGreaterThan(0);
    expect(miss).toBe(0);
  });

  it('higher tf → higher score (saturation via k1)', () => {
    const idf = new Map([['warm', 0.5]]);
    const avgdl = 4;
    const doc1 = buildDocStats(['warm', 'calm', 'playful', 'mysterious']);
    const doc2 = buildDocStats(['warm', 'warm', 'warm', 'calm']);
    const s1 = bm25Score(['warm'], doc1, avgdl, idf);
    const s2 = bm25Score(['warm'], doc2, avgdl, idf);
    expect(s2).toBeGreaterThan(s1);
  });

  it('longer doc → score dampened (b=0.75 normalization)', () => {
    const idf = new Map([['warm', 0.5]]);
    const shortDoc = buildDocStats(['warm']);
    const longDoc = buildDocStats(['warm', 'calm', 'playful', 'mysterious', 'gentle', 'cold', 'loud', 'quiet']);
    const avgdl = 4;
    const sShort = bm25Score(['warm'], shortDoc, avgdl, idf);
    const sLong = bm25Score(['warm'], longDoc, avgdl, idf);
    // same tf (1), shorter doc → higher normalized score
    expect(sShort).toBeGreaterThan(sLong);
  });
});

describe('style-rag: retrieveTopKStyleHints', () => {
  const corpus: SpeakingStyle[] = [
    { tone: 'warm', sentence_length: 'short', emoji_usage: 0.8 },
    { tone: 'professional', formality: 0.9, sentence_length: 'long' },
    { tone: 'playful', emoji_usage: 0.9, sentence_length: 'short' },
    { tone: 'mysterious', formality: 0.7, sentence_length: 'long' },
  ];

  it('returns top-K sorted by BM25 score (query hits subset)', () => {
    const query = 'playful emoji short';
    const result = retrieveTopKStyleHints(query, corpus, 2);
    expect(result).toHaveLength(2);
    // playful/short hint matches playful + emoji + short → top
    expect(result[0].tone).toBe('playful');
    // warm/short hint matches short → second
    expect(result[1].tone).toBe('warm');
  });

  it('returns empty for empty query (fail-open)', () => {
    expect(retrieveTopKStyleHints('', corpus)).toEqual([]);
  });

  it('returns empty for non-string query', () => {
    expect(retrieveTopKStyleHints(null as unknown as string, corpus)).toEqual([]);
  });

  it('returns empty for empty corpus (fail-open)', () => {
    expect(retrieveTopKStyleHints('warm', [])).toEqual([]);
    expect(retrieveTopKStyleHints('warm', null as unknown as SpeakingStyle[])).toEqual([]);
  });

  it('returns empty for k <= 0', () => {
    expect(retrieveTopKStyleHints('warm', corpus, 0)).toEqual([]);
    expect(retrieveTopKStyleHints('warm', corpus, -1)).toEqual([]);
  });

  it('single corpus → returns single (top-K=1 unique candidate)', () => {
    const single: SpeakingStyle[] = [{ tone: 'warm' }];
    const result = retrieveTopKStyleHints('warm', single, 3);
    expect(result).toHaveLength(1);
    expect(result[0].tone).toBe('warm');
  });

  it('k > corpus size → returns all relevant hints (no overflow)', () => {
    const query = 'warm';
    const smallCorpus: SpeakingStyle[] = [
      { tone: 'warm' },
      { tone: 'calm' },
    ];
    const result = retrieveTopKStyleHints(query, smallCorpus, 10);
    // only warm matches (calm has 0 overlap → filtered)
    expect(result).toHaveLength(1);
    expect(result[0].tone).toBe('warm');
  });

  it('returns empty when no hints match query (all score=0 filtered)', () => {
    const result = retrieveTopKStyleHints('zzzznonexistent', corpus, 3);
    expect(result).toEqual([]);
  });

  it('default k=3', () => {
    const query = 'warm short';
    const result = retrieveTopKStyleHints(query, corpus);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('CJK query retrieves matching hint (char-level token overlap, TASK-006 caveat)', () => {
    const cjkCorpus: SpeakingStyle[] = [
      { tone: '温暖', sentence_length: 'short' },
      { tone: '冷漠', sentence_length: 'long' },
    ];
    const result = retrieveTopKStyleHints('温暖', cjkCorpus, 1);
    expect(result).toHaveLength(1);
    expect(result[0].tone).toBe('温暖');
  });

  it('stable sort: equal scores preserve original index order', () => {
    // two hints with identical tone 'warm' → equal score, original index preserved
    const dupCorpus: SpeakingStyle[] = [
      { tone: 'warm', sentence_length: 'short' },
      { tone: 'warm', sentence_length: 'long' },
    ];
    const result = retrieveTopKStyleHints('warm', dupCorpus, 2);
    expect(result[0].sentence_length).toBe('short');
    expect(result[1].sentence_length).toBe('long');
  });

  it('Bm25DocStats type is exported (buildDocStats accessible via testing)', () => {
    const stats: Bm25DocStats = buildDocStats(['warm', 'warm']);
    expect(stats.length).toBe(2);
    expect(stats.termFreq.get('warm')).toBe(2);
  });
});
