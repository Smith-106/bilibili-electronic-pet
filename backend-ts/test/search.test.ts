import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __searchTesting, buildSearchContext, searchWeb } from '../src/services/search.js';

const fetchMock = vi.fn();
const trackedEnvKeys = ['SEARCH_PROVIDER', 'SEARCH_API_KEY', 'SEARCH_CX', 'SEARCH_MAX_RESULTS', 'SEARCH_TIMEOUT'] as const;
const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function clearSearchEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function restoreSearchEnv(): void {
  clearSearchEnv();
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    }
  }
}

function jsonResponse(body: unknown, ok = true, status = 200, statusText = 'OK') {
  return {
    ok,
    status,
    statusText,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

beforeEach(() => {
  clearSearchEnv();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  restoreSearchEnv();
});

describe('search service', () => {
  it('returns empty results when the search api key is missing', async () => {
    const result = await searchWeb('alpha beta');

    expect(result).toEqual({ items: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty results for unsupported providers and cleaned-empty queries', async () => {
    process.env.SEARCH_PROVIDER = 'duckduckgo';
    process.env.SEARCH_API_KEY = 'search-key';

    await expect(searchWeb('alpha beta')).resolves.toEqual({ items: [] });
    expect(fetchMock).not.toHaveBeenCalled();

    process.env.SEARCH_PROVIDER = 'serpapi';
    await expect(searchWeb('!!! ???')).resolves.toEqual({ items: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches serpapi, dedupes expanded queries, reranks, and truncates snippets', async () => {
    process.env.SEARCH_PROVIDER = 'serpapi';
    process.env.SEARCH_API_KEY = 'serp-key';
    process.env.SEARCH_MAX_RESULTS = '3';
    process.env.SEARCH_TIMEOUT = '5';

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          organic_results: [
            { link: 'https://a.example', title: 'alpha beta gamma', snippet: 'alpha snippet' },
            { link: 'https://c.example', title: 'noise', snippet: 'x'.repeat(240) },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          organic_results: [
            { link: 'https://a.example', title: 'alpha beta gamma', snippet: 'alpha snippet' },
            { link: 'https://b.example', title: 'beta result', snippet: 'beta snippet' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          organic_results: [{ link: 'https://c.example', title: 'noise', snippet: 'x'.repeat(240) }],
        }),
      );

    const result = await searchWeb('alpha beta gamma');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ source: 'https://a.example', title: 'alpha beta gamma' });
    expect(result.items[1]).toMatchObject({ source: 'https://b.example', title: 'beta result' });
    expect(result.items[2].snippet).toContain('...');
    expect(new Set(result.items.map((item) => item.source)).size).toBe(3);
  });

  it('searches a short serpapi query once and preserves undefined snippets', async () => {
    process.env.SEARCH_PROVIDER = 'serpapi';
    process.env.SEARCH_API_KEY = 'serp-key';
    process.env.SEARCH_MAX_RESULTS = '5';

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        organic_results: [{ link: 'https://short.example', title: 'Short result' }],
      }),
    );

    const result = await searchWeb('short');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([
      {
        source: 'https://short.example',
        title: 'Short result',
        snippet: undefined,
      },
    ]);
  });

  it('searches bing and google providers with provider-specific payloads', async () => {
    process.env.SEARCH_PROVIDER = 'bing';
    process.env.SEARCH_API_KEY = 'bing-key';
    process.env.SEARCH_MAX_RESULTS = '2';
    process.env.SEARCH_TIMEOUT = '5';

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        webPages: {
          value: [{ url: 'https://bing.example', name: 'Bing result', snippet: 'bing snippet' }],
        },
      }),
    );

    const bingResult = await searchWeb('bing query');
    expect(bingResult.items).toHaveLength(1);
    expect(bingResult.items[0]).toMatchObject({
      source: 'https://bing.example',
      title: 'Bing result',
      snippet: 'bing snippet',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('count=2');

    process.env.SEARCH_PROVIDER = 'google';
    process.env.SEARCH_API_KEY = 'google-key';
    process.env.SEARCH_CX = 'search-cx';
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [{ link: 'https://google.example', title: 'Google result', snippet: 'google snippet' }],
      }),
    );

    const googleResult = await searchWeb('google query');
    expect(googleResult.items).toHaveLength(1);
    expect(googleResult.items[0]).toMatchObject({
      source: 'https://google.example',
      title: 'Google result',
      snippet: 'google snippet',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('cx=search-cx');
  });

  it('returns empty results for provider non-ok and missing result payloads', async () => {
    process.env.SEARCH_PROVIDER = 'serpapi';
    process.env.SEARCH_API_KEY = 'serp-key';
    process.env.SEARCH_MAX_RESULTS = '2';
    process.env.SEARCH_TIMEOUT = '5';

    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'rate limited' }, false, 429, 'Too Many Requests'));
    await expect(searchWeb('serpapi')).resolves.toEqual({ items: [] });

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(searchWeb('serpapi')).resolves.toEqual({ items: [] });

    process.env.SEARCH_PROVIDER = 'bing';
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'bad gateway' }, false, 502, 'Bad Gateway'));
    await expect(searchWeb('bing')).resolves.toEqual({ items: [] });

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(searchWeb('bing')).resolves.toEqual({ items: [] });

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ webPages: {} }));
    await expect(searchWeb('bing')).resolves.toEqual({ items: [] });

    process.env.SEARCH_PROVIDER = 'google';
    delete process.env.SEARCH_CX;
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'forbidden' }, false, 403, 'Forbidden'));
    await expect(searchWeb('google')).resolves.toEqual({ items: [] });

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(searchWeb('google')).resolves.toEqual({ items: [] });
    expect(String(fetchMock.mock.calls[0][0])).toContain('cx=');
  });

  it('returns empty results when provider fetch fails internally', async () => {
    process.env.SEARCH_PROVIDER = 'serpapi';
    process.env.SEARCH_API_KEY = 'serp-key';
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const result = await searchWeb('error query');

    expect(result).toEqual({ items: [] });
  });

  it('treats invalid max result configuration as an empty result slice', async () => {
    process.env.SEARCH_PROVIDER = 'serpapi';
    process.env.SEARCH_API_KEY = 'serp-key';
    process.env.SEARCH_MAX_RESULTS = 'not-a-number';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        organic_results: [{ link: 'https://unexpected.example', title: 'unexpected' }],
      }),
    });

    const result = await searchWeb('unexpected failure');

    expect(result).toEqual({ items: [] });
  });

  it('returns empty results when bing and google providers fail internally', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    process.env.SEARCH_PROVIDER = 'bing';
    process.env.SEARCH_API_KEY = 'bing-key';
    fetchMock.mockRejectedValueOnce(new Error('bing network down'));
    await expect(searchWeb('bing error')).resolves.toEqual({ items: [] });

    process.env.SEARCH_PROVIDER = 'google';
    process.env.SEARCH_API_KEY = 'google-key';
    fetchMock.mockRejectedValueOnce(new Error('google network down'));
    await expect(searchWeb('google error')).resolves.toEqual({ items: [] });

    expect(errorSpy).toHaveBeenCalledWith('[search] Bing error:', expect.any(Error));
    expect(errorSpy).toHaveBeenCalledWith('[search] Google error:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('clears provider timeouts and logs errors when response parsing fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    process.env.SEARCH_PROVIDER = 'serpapi';
    process.env.SEARCH_API_KEY = 'serp-key';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('serp parse failed');
      },
    });
    await expect(searchWeb('serp parse')).resolves.toEqual({ items: [] });

    process.env.SEARCH_PROVIDER = 'bing';
    process.env.SEARCH_API_KEY = 'bing-key';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('bing parse failed');
      },
    });
    await expect(searchWeb('bing parse')).resolves.toEqual({ items: [] });

    process.env.SEARCH_PROVIDER = 'google';
    process.env.SEARCH_API_KEY = 'google-key';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('google parse failed');
      },
    });
    await expect(searchWeb('google parse')).resolves.toEqual({ items: [] });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[search] SerpAPI error:', expect.any(Error));
    expect(errorSpy).toHaveBeenCalledWith('[search] Bing error:', expect.any(Error));
    expect(errorSpy).toHaveBeenCalledWith('[search] Google error:', expect.any(Error));
  });

  it('builds search context text only from items with a title or snippet', () => {
    expect(buildSearchContext([])).toBe('');
    expect(buildSearchContext([{ source: '', title: '', snippet: '' }])).toBe('');
    expect(
      buildSearchContext([
        { source: 'https://example.test', title: 'Title', snippet: 'Snippet' },
        { source: '', title: '', snippet: '' },
      ]),
    ).toBe('Search Context:\n- Title (https://example.test): Snippet');
  });

  it('covers search internal helper edge cases directly', async () => {
    expect(__searchTesting.cleanQuery('  hello!!!   世界  ')).toBe('hello 世界');
    expect(__searchTesting.expandQueries('!!! ???')).toEqual([]);
    expect(__searchTesting.expandQueries('alpha beta')).toEqual(['alpha beta']);
    expect(__searchTesting.expandQueries('alpha beta gamma delta')).toEqual([
      'alpha beta gamma delta',
      'alpha beta',
      'gamma delta',
    ]);
    expect(__searchTesting.expandQueries('same same same same')).toEqual([
      'same same same same',
      'same same',
    ]);
    expect(
      __searchTesting.dedupeItems([
        { source: 'https://a.example', title: 'A', snippet: 'one' },
        { source: 'https://a.example', title: ' A ', snippet: 'one' },
        { source: 'https://b.example', title: 'B', snippet: undefined },
        { source: 'https://c.example' },
        { source: 'https://c.example' },
      ]),
    ).toHaveLength(3);
    expect(
      __searchTesting.rerankItems(
        [
          { source: 'https://b.example', title: 'noise', snippet: '' },
          { source: 'https://a.example', title: 'alpha beta', snippet: '' },
        ],
        '',
       )[0].source,
    ).toBe('https://b.example');
    expect(__searchTesting.rerankItems([{ source: 'https://missing-fields.example' }], 'alpha')).toEqual([
      { source: 'https://missing-fields.example' },
    ]);
    expect(__searchTesting.truncateSnippet(undefined)).toBeUndefined();
    expect(__searchTesting.truncateSnippet('x'.repeat(221))).toBe(`${'x'.repeat(220)}...`);

    process.env.SEARCH_PROVIDER = 'unsupported';
    process.env.SEARCH_API_KEY = 'key';
    expect(__searchTesting.loadSearchConfig()).toBeNull();

    await expect(
      __searchTesting.dispatchSearch('query', {
        provider: 'unknown',
        apiKey: 'key',
        baseUrl: 'https://search.example',
        maxResults: 3,
        timeout: 10,
      } as never),
    ).resolves.toEqual([]);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce('plain serp failure');
    await expect(
      __searchTesting.searchSerpAPI('query', {
        provider: 'serpapi',
        apiKey: 'key',
        baseUrl: 'https://serp.example',
        maxResults: 2,
        timeout: 10,
      }),
    ).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('[search] SerpAPI error:', 'plain serp failure');
  });

  it('returns structured errors when the search orchestration fails outside providers', async () => {
    await expect(
      __searchTesting.searchWebWithConfig(
        'alpha beta',
        {
          provider: 'serpapi',
          apiKey: 'key',
          baseUrl: 'https://serp.example',
          maxResults: 2,
          timeout: 10,
        },
        async () => {
          throw 'dispatcher exploded';
        },
      ),
    ).resolves.toEqual({
      items: [],
      error_type: 'search_error',
      error_message: 'dispatcher exploded',
    });

    await expect(
      __searchTesting.searchWebWithConfig(
        'alpha beta',
        {
          provider: 'serpapi',
          apiKey: 'key',
          baseUrl: 'https://serp.example',
          maxResults: 2,
          timeout: 10,
        },
        async () => {
          throw new Error('dispatcher boom');
        },
      ),
    ).resolves.toEqual({
      items: [],
      error_type: 'search_error',
      error_message: 'dispatcher boom',
    });
  });

  it('covers bing and google timeout abort callbacks', async () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockImplementation(
      async (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    );

    const bing = __searchTesting.searchBing('query', {
      provider: 'bing',
      apiKey: 'key',
      baseUrl: 'https://bing.example',
      maxResults: 2,
      timeout: 5,
    });
    await vi.advanceTimersByTimeAsync(5);
    await expect(bing).resolves.toEqual([]);

    const google = __searchTesting.searchGoogle('query', {
      provider: 'google',
      apiKey: 'key',
      baseUrl: 'https://google.example',
      maxResults: 2,
      timeout: 5,
    });
    await vi.advanceTimersByTimeAsync(5);
    await expect(google).resolves.toEqual([]);

    expect(errorSpy).toHaveBeenCalledWith('[search] Bing error:', expect.any(DOMException));
    expect(errorSpy).toHaveBeenCalledWith('[search] Google error:', expect.any(DOMException));
  });
});
