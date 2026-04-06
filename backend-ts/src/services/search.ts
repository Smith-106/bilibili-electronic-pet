/**
 * Web search services for context building
 * Migrated from Python: app/services/search_provider.py
 *
 * Enhanced: Multi-query expansion, result reranking, deduplication,
 * snippet truncation, and enriched SearchResult metadata.
 */

import type { SearchWebService, BuildSearchContextService } from './interfaces.js';

// ============================================================
// Configuration
// ============================================================

interface SearchConfig {
  provider: 'serpapi' | 'bing' | 'google';
  apiKey: string;
  baseUrl: string;
  maxResults: number;
  timeout: number;
}

function loadSearchConfig(): SearchConfig | null {
  const provider = (process.env.SEARCH_PROVIDER || 'serpapi') as SearchConfig['provider'];
  const apiKey = process.env.SEARCH_API_KEY || '';
  const maxResults = parseInt(process.env.SEARCH_MAX_RESULTS || '5', 10);
  const timeout = parseInt(process.env.SEARCH_TIMEOUT || '10000', 10);

  if (!apiKey) {
    return null;
  }

  switch (provider) {
    case 'serpapi':
      return {
        provider: 'serpapi',
        apiKey,
        baseUrl: 'https://serpapi.com/search.json',
        maxResults,
        timeout,
      };
    case 'bing':
      return {
        provider: 'bing',
        apiKey,
        baseUrl: 'https://api.bing.microsoft.com/v7.0/search',
        maxResults,
        timeout,
      };
    case 'google':
      return {
        provider: 'google',
        apiKey,
        baseUrl: 'https://www.googleapis.com/customsearch/v1',
        maxResults,
        timeout,
      };
    default:
      return null;
  }
}

// ============================================================
// Internal types
// ============================================================

interface RawSearchItem {
  source: string;
  title?: string;
  snippet?: string;
}

// ============================================================
// Query expansion (migrated from Python _expand_queries)
// ============================================================

function expandQueries(query: string): string[] {
  const cleaned = cleanQuery(query);
  if (!cleaned) return [];

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length <= 2) return [cleaned];

  // Original + first-half and second-half token groups for broader recall
  const queries = [cleaned];
  const mid = Math.ceil(tokens.length / 2);
  const firstHalf = tokens.slice(0, mid).join(' ');
  const secondHalf = tokens.slice(mid).join(' ');
  if (firstHalf !== cleaned) queries.push(firstHalf);
  if (secondHalf !== cleaned && secondHalf !== firstHalf) queries.push(secondHalf);

  return queries.slice(0, 3); // Max 3 expanded queries
}

// ============================================================
// Query cleaning (migrated from Python _clean_query)
// ============================================================

function cleanQuery(query: string): string {
  return query
    .trim()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// Reranking (migrated from Python _rerank_items)
// ============================================================

function rerankItems(items: RawSearchItem[], query: string): RawSearchItem[] {
  if (items.length === 0) return items;

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;

  const scored = items.map((item) => {
    const text = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (text.includes(token)) score += 1;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

// ============================================================
// Deduplication (migrated from Python _dedupe_items)
// ============================================================

function dedupeItems(items: RawSearchItem[]): RawSearchItem[] {
  const seen = new Set<string>();
  const result: RawSearchItem[] = [];

  for (const item of items) {
    const key = `${(item.title || '').trim()}::${item.source}::${(item.snippet || '').trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

// ============================================================
// Snippet truncation (migrated from Python)
// ============================================================

const MAX_SNIPPET_LENGTH = 220;

function truncateSnippet(snippet: string | undefined): string | undefined {
  if (!snippet || snippet.length <= MAX_SNIPPET_LENGTH) return snippet;
  return snippet.substring(0, MAX_SNIPPET_LENGTH) + '...';
}

// ============================================================
// Provider implementations
// ============================================================

async function searchSerpAPI(query: string, config: SearchConfig): Promise<RawSearchItem[]> {
  try {
    const url = `${config.baseUrl}?api_key=${config.apiKey}&q=${encodeURIComponent(query)}&num=${config.maxResults}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.organic_results || []).map((r: { link: string; title?: string; snippet?: string }) => ({
        source: r.link,
        title: r.title,
        snippet: r.snippet,
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('[search] SerpAPI error:', error);
    return [];
  }
}

async function searchBing(query: string, config: SearchConfig): Promise<RawSearchItem[]> {
  try {
    const url = `${config.baseUrl}?q=${encodeURIComponent(query)}&count=${config.maxResults}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return [];
      const data = await response.json();
      if (data.webPages?.value) {
        return data.webPages.value.map((item: { url: string; name?: string; snippet?: string }) => ({
          source: item.url,
          title: item.name,
          snippet: item.snippet,
        }));
      }
      return [];
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('[search] Bing error:', error);
    return [];
  }
}

async function searchGoogle(query: string, config: SearchConfig): Promise<RawSearchItem[]> {
  try {
    const cx = process.env.SEARCH_CX || '';
    const url = `${config.baseUrl}?key=${config.apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${config.maxResults}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return [];
      const data = await response.json();
      if (data.items) {
        return data.items.map((item: { link: string; title?: string; snippet?: string }) => ({
          source: item.link,
          title: item.title,
          snippet: item.snippet,
        }));
      }
      return [];
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('[search] Google error:', error);
    return [];
  }
}

// ============================================================
// Unified search dispatch
// ============================================================

async function dispatchSearch(query: string, config: SearchConfig): Promise<RawSearchItem[]> {
  switch (config.provider) {
    case 'serpapi':
      return searchSerpAPI(query, config);
    case 'bing':
      return searchBing(query, config);
    case 'google':
      return searchGoogle(query, config);
    default:
      return [];
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Search web for context
 * Enhanced: multi-query expansion, deduplication, reranking
 */
export const searchWeb: SearchWebService = async (query) => {
  const config = loadSearchConfig();
  if (!config) {
    return { items: [] };
  }

  try {
    // Expand queries for better recall
    const queries = expandQueries(query);
    let allItems: RawSearchItem[] = [];

    for (const q of queries) {
      const results = await dispatchSearch(q, config);
      allItems = allItems.concat(results);
    }

    // Deduplicate across expanded queries
    allItems = dedupeItems(allItems);

    // Rerank by relevance to original query
    allItems = rerankItems(allItems, query);

    // Truncate long snippets
    const items = allItems.slice(0, config.maxResults).map((item) => ({
      source: item.source,
      title: item.title,
      snippet: truncateSnippet(item.snippet),
    }));

    return { items };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      items: [],
      error_type: 'search_error',
      error_message: message,
    };
  }
};

/**
 * Build search context from results
 * Format matches Python: "- {title} ({url}): {snippet}"
 */
export const buildSearchContext: BuildSearchContextService = (items) => {
  if (!items || items.length === 0) {
    return '';
  }

  const contextParts: string[] = [];

  for (const item of items) {
    const title = item.title || '';
    const snippet = item.snippet || '';
    const url = item.source || '';

    if (title || snippet) {
      contextParts.push(`- ${title} (${url}): ${snippet}`);
    }
  }

  if (contextParts.length === 0) {
    return '';
  }

  return `Search Context:\n${contextParts.join('\n')}`;
};
