import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadFile, requestJson, resolveAdminSessionToken, resolveApiKey } from '../../src/api/client.js';

function createJsonResponse({ ok = true, status = 200, statusText = 'OK', payload = {}, jsonError = null } = {}) {
  return {
    ok,
    status,
    statusText,
    json: vi.fn(async () => {
      if (jsonError) {
        throw jsonError;
      }
      return payload;
    }),
  };
}

describe('frontend api client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn();
    window.__ADMIN_API_KEY__ = '';
    window.__ADMIN_SESSION_TOKEN__ = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete globalThis.fetch;
    delete window.__ADMIN_API_KEY__;
    delete window.__ADMIN_SESSION_TOKEN__;
  });

  it('resolves trimmed global admin credentials', () => {
    window.__ADMIN_API_KEY__ = '  api-key  ';
    window.__ADMIN_SESSION_TOKEN__ = '  session-token  ';

    expect(resolveApiKey()).toBe('api-key');
    expect(resolveAdminSessionToken()).toBe('session-token');
  });

  it('attaches auth headers and preserves custom request options', async () => {
    window.__ADMIN_API_KEY__ = 'api-key';
    window.__ADMIN_SESSION_TOKEN__ = 'session-token';
    fetch.mockResolvedValueOnce(createJsonResponse({ payload: { ok: true } }));

    await expect(
      requestJson('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"ok":true}',
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: '{"ok":true}',
      }),
    );
    const headers = fetch.mock.calls[0][1].headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('x-admin-session')).toBe('session-token');
    expect(headers.get('x-api-key')).toBe('api-key');
  });

  it('throws sanitized API errors across detail, status text, and fallback branches', async () => {
    fetch
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: false,
          status: 409,
          statusText: 'Conflict',
          payload: { detail: 'job_retry:blocked' },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          payload: { detail: 'unsafe detail with spaces' },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: false,
          status: 503,
          statusText: 'Service Down',
          payload: { error: 'unsafe detail with spaces' },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: false,
          status: 418,
          statusText: '',
          payload: {},
          jsonError: new Error('invalid_json'),
        }),
      );

    await expect(requestJson('/detail')).rejects.toThrow('job_retry:blocked');
    await expect(requestJson('/status-text')).rejects.toThrow('bad_request');
    await expect(requestJson('/server')).rejects.toThrow('request_failed');
    await expect(requestJson('/fallback')).rejects.toThrow('request_failed');
  });

  it('downloads files with auth headers and revokes the generated object URL', async () => {
    window.__ADMIN_SESSION_TOKEN__ = 'session-token';
    const blob = new Blob(['csv'], { type: 'text/csv' });
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn(async () => blob),
    });
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-download');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadFile('/export/jobs.csv', 'jobs.csv');

    const headers = fetch.mock.calls[0][1].headers;
    expect(headers.get('x-admin-session')).toBe('session-token');
    expect(createObjectUrlSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test-download');
    expect(document.querySelector('a[download="jobs.csv"]')).toBeNull();
  });

  it('throws when file downloads fail', async () => {
    window.__ADMIN_API_KEY__ = 'api-key';
    fetch.mockResolvedValueOnce({
      ok: false,
      blob: vi.fn(),
    });

    await expect(downloadFile('/export/audit.csv', 'audit.csv')).rejects.toThrow('download_failed');
    expect(fetch.mock.calls[0][1].headers.get('x-api-key')).toBe('api-key');
  });
});
