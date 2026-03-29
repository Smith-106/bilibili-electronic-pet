/**
 * Web search services for context building
 * Migrated from Python: app/services/search_provider.py
 *
 * Enhanced: Phase 4 - Search integration with configurable provider
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
// SerpAPI implementation
// ============================================================

async function searchSerpAPI(
  query: string,
  config: SearchConfig
): Promise<Array<{ source: string; title?: string; snippet?: string }>> {
  try {
    const url = `${config.baseUrl}?api_key=${config.apiKey}&q=${encodeURIComponent(query)}&num=${config.maxResults}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return (data.organic_results || []).map(
        (r: { link: string; title?: string; snippet?: string }) => ({
          source: r.link,
          title: r.title,
          snippet: r.snippet,
        })
      );
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('[search] SerpAPI error:', error);
    return [];
  }
}

// ============================================================
// Bing Search implementation
// ============================================================

async function searchBing(
  query: string,
  config: SearchConfig
): Promise<Array<{ source: string; title?: string; snippet?: string }>> {
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
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      if (data.webPages?.value) {
        return data.webPages.value.map(
          (item: { url: string; name?: string; snippet?: string }) => ({
            source: item.url,
            title: item.name,
            snippet: item.snippet,
          })
        );
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

// ============================================================
// Google Custom Search implementation
// ============================================================

async function searchGoogle(
  query: string,
  config: SearchConfig
): Promise<Array<{ source: string; title?: string; snippet?: string }>> {
  try {
    const cx = process.env.SEARCH_CX || '';
    const url = `${config.baseUrl}?key=${config.apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${config.maxResults}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      if (data.items) {
        return data.items.map(
          (item: { link: string; title?: string; snippet?: string }) => ({
            source: item.link,
            title: item.title,
            snippet: item.snippet,
          })
        );
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
// Public API
// ============================================================

/**
 * Search web for context
 */
export const searchWeb: SearchWebService = async (query) => {
  const config = loadSearchConfig();
  if (!config) {
    return { items: [] };
  }

  switch (config.provider) {
    case 'serpapi':
      return { items: await searchSerpAPI(query, config) };
    case 'bing':
      return { items: await searchBing(query, config) };
    case 'google':
      return { items: await searchGoogle(query, config) };
    default:
      console.warn(`[search] Unsupported provider: ${config.provider}`);
      return { items: [] };
  }
};

/**
 * Build search context from results
 */
export const buildSearchContext: BuildSearchContextService = (items) => {
  if (!items || items.length === 0) {
    return '';
  }

  const contextParts: string[] = [];

  for (const item of items) {
    let part = '';
    if (item.title) {
      part += `[${item.title}]`;
    }
    if (item.snippet) {
      part += ` ${item.snippet}`;
    }
    if (item.source) {
      part += ` (来源: ${item.source})`;
    }
    if (part) {
      contextParts.push(part);
    }
  }

  if (contextParts.length === 0) {
    return '';
  }

  return `Search Context:\n${contextParts.join('\n')}`;
};
