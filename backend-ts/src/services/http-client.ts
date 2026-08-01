/**
 * Shared HTTP client with default timeout
 * Usage: const client = createHttpClient({ timeout: 30_000 }); const resp = await client.get(url);
 */

export class HttpClientError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export interface HttpClientConfig {
  baseUrl?: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

export function createAbortController(timeoutMs: number) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

export async function safeFetch(
  url: string,
  config: HttpClientConfig & FetchOptions = {},
): Promise<Response> {
  const { timeout = 30_000, ...fetchOptions } = config;
  
  const controller = createAbortController(timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    
    if (!response.ok) {
      throw new HttpClientError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        'HTTP_ERROR',
      );
    }
    
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('abort')) {
      throw new HttpClientError(`Request timeout after ${timeout}ms`, undefined, 'TIMEOUT');
    }
    throw error;
  }
}

// Convenience methods for GET requests
export async function get(
  url: string,
  config: HttpClientConfig & FetchOptions = {},
): Promise<Response> {
  return safeFetch(url, { ...config, method: 'GET' });
}

export async function post<T>(
  url: string,
  body: T,
  config: HttpClientConfig = {},
): Promise<Response> {
  return safeFetch(url, {
    ...config,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...config.defaultHeaders },
    body: JSON.stringify(body),
  });
}

export async function put<T>(
  url: string,
  body: T,
  config: HttpClientConfig = {},
): Promise<Response> {
  return safeFetch(url, {
    ...config,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...config.defaultHeaders },
    body: JSON.stringify(body),
  });
}

export async function del(url: string, config: HttpClientConfig = {}): Promise<Response> {
  return safeFetch(url, { ...config, method: 'DELETE' });
}
