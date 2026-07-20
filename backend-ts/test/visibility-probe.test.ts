import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// verifyReplyVisible imports fetchCommentsPage from bilibili-poller.js, which uses the
// global fetch. Stub fetch per-case to drive the probe's three verdicts. The poller module
// is NOT mocked — we exercise the real fetchCommentsPage parse path (replies[] → rpid match)
// so the probe's reuse of the poller logic is genuinely covered.

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { verifyReplyVisible } = await import('../src/services/bilibili-client.js');
const { checkPersonaRateLimit, __resetBucketsForTest, __getBucketForTest } = await import(
  '../src/services/persona-token-bucket.js'
);

const trackedEnvKeys = ['ANTIRISK_C_RATE_LIMIT_ENABLED'] as const;

function clearEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

const probeConfig = {
  sessdata: 'sess',
  biliJct: 'jct',
  buvid: 'buv',
  baseUrl: 'https://api.bilibili.com',
  userAgent: 'TestAgent/1.0',
  timeout: 5000,
};

function replyListResponse(replies: Array<{ rpid: number; mid: number; message?: string; parent?: number; ctime?: number }>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      code: 0,
      data: {
        replies: replies.map((r) => ({
          rpid: r.rpid,
          mid: r.mid,
          content: { message: r.message ?? 'hi' },
          parent: r.parent ?? 0,
          ctime: r.ctime ?? Math.floor(Date.now() / 1000),
        })),
      },
    }),
  };
}

function emptyReplyListResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ code: 0, data: { replies: [] } }),
  };
}

beforeEach(() => {
  clearEnv();
  fetchMock.mockReset();
  __resetBucketsForTest();
});

afterEach(() => {
  // Do NOT call vi.unstubAllGlobals() — the fetch stub is module-scoped and must persist
  // across cases (resetting the mock's call history via fetchMock.mockReset is enough;
  // unstubbing fetch would leave verifyReplyVisible's second view hitting the real fetch).
  vi.restoreAllMocks();
  clearEnv();
  __resetBucketsForTest();
});

describe('verifyReplyVisible (TASK-002/D1)', () => {
  it('returns visible when the sender_cookie view lists the rpid (probe_method=sender_cookie)', async () => {
    fetchMock.mockResolvedValueOnce(
      replyListResponse([
        { rpid: 1001, mid: 999 },
        { rpid: 2002, mid: 888 },
      ]),
    );

    const result = await verifyReplyVisible(2002, '12345', probeConfig);

    expect(result).toEqual({
      visible: true,
      status: 'visible',
      probe_method: 'sender_cookie',
    });
    // Only the sender_cookie fetch fired — visible short-circuits before the seek_rpid fallback.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/x/v2/reply?type=1&oid=12345&pn=1&ps=20&sort=1');
  });

  it('returns shadowbanned when both sender_cookie AND seek_rpid views succeed but the rpid is absent (fail-closed, C-004)', async () => {
    // sender_cookie view: rpid absent across all MAX_PROBE_PAGES pages (probe succeeded).
    for (let page = 1; page <= 5; page++) {
      fetchMock.mockResolvedValueOnce(
        replyListResponse([{ rpid: 1000 + page, mid: 900 + page }]),
      );
    }
    // seek_rpid anonymous fallback: rpid STILL absent across all pages → confirmed shadowban.
    for (let page = 1; page <= 5; page++) {
      fetchMock.mockResolvedValueOnce(emptyReplyListResponse());
    }

    const result = await verifyReplyVisible(9999, '12345', probeConfig);

    expect(result.visible).toBe(false);
    expect(result.status).toBe('shadowbanned');
    expect(result.probe_method).toBe('seek_rpid');
    expect(result.reason).toBe('rpid_absent_dual_view');
    // Both views fired across all MAX_PROBE_PAGES pages (sender_cookie 5 + seek_rpid 5).
    expect(fetchMock).toHaveBeenCalledTimes(10);
    // seek_rpid fallback passes an empty auth cookie (anonymous view).
    const seekCall = fetchMock.mock.calls[5];
    const seekHeaders = (seekCall[1] as { headers: Record<string, string> }).headers;
    expect(seekHeaders.Cookie).toBe('SESSDATA=; bili_jct=; BUVID3=;');
  });

  it('falls back to seek_rpid and returns visible when the anonymous view surfaces the rpid (sender-self-filter, not a shadowban)', async () => {
    // sender_cookie view: rpid absent across all MAX_PROBE_PAGES pages (Bilibili sometimes
    // filters the author's own reply from their own authenticated view).
    for (let page = 1; page <= 5; page++) {
      fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 1000 + page, mid: 999 }]));
    }
    // seek_rpid anonymous view page 1: rpid PRESENT → reply is publicly visible.
    fetchMock.mockResolvedValueOnce(
      replyListResponse([{ rpid: 5555, mid: 777 }]),
    );

    const result = await verifyReplyVisible(5555, '12345', probeConfig);

    expect(result).toEqual({
      visible: true,
      status: 'visible',
      probe_method: 'seek_rpid',
    });
    // 5 sender_cookie pages + 1 seek_rpid page (short-circuits on the hit).
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('returns probe_failed (fail-open) when the sender_cookie fetch rejects (C-004 network/5xx)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const result = await verifyReplyVisible(2002, '12345', probeConfig);

    expect(result.visible).toBe(false);
    expect(result.status).toBe('probe_failed');
    expect(result.probe_method).toBe('sender_cookie');
    expect(result.reason).toBe('fetch_failed');
    // Fail-open: seek_rpid fallback is NOT attempted when the primary fetch faults — a probe
    // infrastructure failure is classified probe_failed, never shadowbanned.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns probe_failed (fail-open) when the sender_cookie fetch returns HTTP 5xx', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const result = await verifyReplyVisible(2002, '12345', probeConfig);

    expect(result.status).toBe('probe_failed');
    expect(result.probe_method).toBe('sender_cookie');
    expect(result.reason).toBe('fetch_failed');
  });

  it('returns probe_failed when seek_rpid fallback faults after sender_cookie rpid-absent (still fail-open, C-004)', async () => {
    // sender_cookie view: rpid absent across all MAX_PROBE_PAGES pages (probe succeeded).
    for (let page = 1; page <= 5; page++) {
      fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 1000 + page, mid: 999 }]));
    }
    // seek_rpid fallback faults → probe_failed (NOT shadowbanned).
    fetchMock.mockRejectedValueOnce(new Error('seek timeout'));

    const result = await verifyReplyVisible(9999, '12345', probeConfig);

    expect(result.status).toBe('probe_failed');
    expect(result.probe_method).toBe('seek_rpid');
    expect(result.reason).toBe('seek_fetch_failed');
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('returns visible when rpid is on sender_cookie page 2 (WARN-1 pagination fix)', async () => {
    // page 1: rpid absent (other replies present, top-20-by-heat).
    fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 1001, mid: 999 }]));
    // page 2: rpid PRESENT → visible (a fresh reply that has not bubbled to page 1).
    fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 2002, mid: 888 }]));

    const result = await verifyReplyVisible(2002, '12345', probeConfig);

    expect(result).toEqual({
      visible: true,
      status: 'visible',
      probe_method: 'sender_cookie',
    });
    // Short-circuits on the page-2 hit — seek_rpid fallback NOT attempted.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urlPage1 = String(fetchMock.mock.calls[0][0]);
    const urlPage2 = String(fetchMock.mock.calls[1][0]);
    expect(urlPage1).toContain('pn=1&ps=20&sort=1');
    expect(urlPage2).toContain('pn=2&ps=20&sort=1');
  });

  it('returns visible when rpid is on seek_rpid page 3 (WARN-1: dual-view pagination)', async () => {
    // sender_cookie view: rpid absent across all 5 pages.
    for (let page = 1; page <= 5; page++) {
      fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 1000 + page, mid: 999 }]));
    }
    // seek_rpid: page 1 + 2 absent, page 3 PRESENT → visible.
    fetchMock.mockResolvedValueOnce(emptyReplyListResponse());
    fetchMock.mockResolvedValueOnce(emptyReplyListResponse());
    fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 3333, mid: 444 }]));

    const result = await verifyReplyVisible(3333, '12345', probeConfig);

    expect(result).toEqual({
      visible: true,
      status: 'visible',
      probe_method: 'seek_rpid',
    });
    // 5 sender_cookie pages + 3 seek_rpid pages (short-circuit on page 3 hit).
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('returns probe_failed (fail-open) when a mid-scan sender_cookie page faults (WARN-1: pagination fault ≠ shadowbanned)', async () => {
    // page 1: rpid absent (fetch succeeded).
    fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 1001, mid: 999 }]));
    // page 2: network fault → probe_failed (NOT shadowbanned, even though page 1 succeeded).
    fetchMock.mockRejectedValueOnce(new Error('page 2 network down'));

    const result = await verifyReplyVisible(9999, '12345', probeConfig);

    expect(result.status).toBe('probe_failed');
    expect(result.probe_method).toBe('sender_cookie');
    expect(result.reason).toBe('fetch_failed');
    // Did NOT proceed to view 2 — fail-open collapses immediately on the mid-scan fault.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns probe_failed (fail-open) when a mid-scan seek_rpid page faults (WARN-1: anon-view pagination fault ≠ shadowbanned)', async () => {
    // sender_cookie view: rpid absent across all 5 pages.
    for (let page = 1; page <= 5; page++) {
      fetchMock.mockResolvedValueOnce(replyListResponse([{ rpid: 1000 + page, mid: 999 }]));
    }
    // seek_rpid page 1: absent (succeeded).
    fetchMock.mockResolvedValueOnce(emptyReplyListResponse());
    // seek_rpid page 2: network fault → probe_failed (NOT shadowbanned).
    fetchMock.mockRejectedValueOnce(new Error('seek page 2 timeout'));

    const result = await verifyReplyVisible(9999, '12345', probeConfig);

    expect(result.status).toBe('probe_failed');
    expect(result.probe_method).toBe('seek_rpid');
    expect(result.reason).toBe('seek_fetch_failed');
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it('returns probe_failed for an invalid rpid (non-finite / non-positive) — fail-open, no fetch', async () => {
    const result = await verifyReplyVisible(NaN, '12345', probeConfig);
    expect(result.status).toBe('probe_failed');
    expect(result.reason).toBe('invalid_rpid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns probe_failed for an invalid oid (non-finite commentId) — fail-open, no fetch', async () => {
    const result = await verifyReplyVisible(2002, 'not-a-number', probeConfig);
    expect(result.status).toBe('probe_failed');
    expect(result.reason).toBe('invalid_oid');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('verifyReplyVisible token bucket integration (TASK-002/D1, C-008)', () => {
  // The probe itself does NOT call checkPersonaRateLimit (publisher.ts publishReal does, so the
  // probe shares the publish quota). This test verifies the shared-bucket contract the probe
  // relies on: a single checkPersonaRateLimit call consumes one token from the same bucket the
  // publish path uses, and a probe_failed verdict does NOT re-deduct (single deduction per
  // publish, C-008).

  it('checkPersonaRateLimit consumes one token per call from the shared publish bucket', () => {
    const persona = 'shared-bucket-persona';
    // Fresh bucket starts full (capacity 20). After 3 probe/publish checks, 3 tokens consumed.
    expect(checkPersonaRateLimit(persona)).toEqual({ allowed: true, reason: 'ok' });
    expect(checkPersonaRateLimit(persona)).toEqual({ allowed: true, reason: 'ok' });
    expect(checkPersonaRateLimit(persona)).toEqual({ allowed: true, reason: 'ok' });
    const bucket = __getBucketForTest(persona);
    expect(bucket).toBeDefined();
    // 20 capacity - 3 consumed = 17 remaining (within float tolerance).
    expect(bucket!.tokens).toBeGreaterThanOrEqual(16.99);
    expect(bucket!.tokens).toBeLessThanOrEqual(17.01);
  });

  it('probe + publish share the same bucket: a probe deduction lowers the budget for the next publish', () => {
    const persona = 'probe-then-publish';
    // Simulate the publishReal sequence: probe consumes 1 (C-008), then a publish consumes 1.
    expect(checkPersonaRateLimit(persona)).toEqual({ allowed: true, reason: 'ok' });
    expect(checkPersonaRateLimit(persona)).toEqual({ allowed: true, reason: 'ok' });
    const bucket = __getBucketForTest(persona);
    expect(bucket!.tokens).toBeLessThanOrEqual(18.01);
    expect(bucket!.tokens).toBeGreaterThanOrEqual(17.99);
  });

  it('checkPersonaRateLimit returns rate_limited when the shared bucket is exhausted', () => {
    const persona = 'exhausted-persona';
    // Drain the bucket: capacity 20, exhaust with 20 calls, 21st is rate_limited.
    for (let i = 0; i < 20; i++) {
      expect(checkPersonaRateLimit(persona).allowed).toBe(true);
    }
    const result = checkPersonaRateLimit(persona);
    expect(result).toEqual({ allowed: false, reason: 'rate_limited' });
  });

  it('a null persona never consumes a token (fail-open, L7 tuple contract)', () => {
    expect(checkPersonaRateLimit(null)).toEqual({ allowed: true, reason: 'ok' });
    expect(checkPersonaRateLimit(undefined)).toEqual({ allowed: true, reason: 'ok' });
    // No bucket created for null persona.
    expect(__getBucketForTest('null')).toBeUndefined();
  });

  it('checkPersonaRateLimit bypasses the bucket when ANTIRISK_C_RATE_LIMIT_ENABLED=false (L8 rollback)', () => {
    process.env.ANTIRISK_C_RATE_LIMIT_ENABLED = 'false';
    const persona = 'flag-off-persona';
    // Even after many calls, always allowed (bucket bypassed).
    for (let i = 0; i < 30; i++) {
      expect(checkPersonaRateLimit(persona)).toEqual({ allowed: true, reason: 'ok' });
    }
    // No bucket created (flag off → bypass).
    expect(__getBucketForTest(persona)).toBeUndefined();
  });
});
