import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from '../src/server.js';
describe('douyin sidecar server', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });
    it('reports health', async () => {
        const app = createServer({});
        const response = await app.inject({ method: 'GET', url: '/health' });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            ok: true,
            service: 'douyin-sidecar',
            mode: 'mock',
        });
        await app.close();
    });
    it('rejects unauthorized publish requests when token is configured', async () => {
        const app = createServer({ DOUYIN_SIDECAR_TOKEN: 'secret-token' });
        const response = await app.inject({
            method: 'POST',
            url: '/publish',
            payload: {
                platform: 'douyin',
                comment_id: 'comment-1',
                reply_text: 'reply text',
                force_publish: false,
                trace_id: 'trace-1',
            },
        });
        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ published: false, reason: 'auth' });
        await app.close();
    });
    it('returns mock publish success by default', async () => {
        const app = createServer({ DOUYIN_SIDECAR_TOKEN: 'secret-token' });
        const response = await app.inject({
            method: 'POST',
            url: '/publish',
            headers: { authorization: 'Bearer secret-token' },
            payload: {
                platform: 'douyin',
                comment_id: 'comment-1',
                reply_text: 'reply text',
                force_publish: false,
                trace_id: 'trace-1',
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            published: true,
            reason: 'sidecar_publish_ok',
        });
        await app.close();
    });
    it('proxies to upstream when configured', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                published: true,
                reason: 'upstream_publish_ok',
                published_at: '2026-04-13T12:00:00.000Z',
            }),
        });
        vi.stubGlobal('fetch', fetchMock);
        const app = createServer({
            DOUYIN_DRIVER_MODE: 'webhook_proxy',
            DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
            DOUYIN_UPSTREAM_TOKEN: 'upstream-token',
        });
        const response = await app.inject({
            method: 'POST',
            url: '/publish',
            payload: {
                platform: 'douyin',
                comment_id: 'comment-1',
                reply_text: 'reply text',
                force_publish: false,
                trace_id: 'trace-1',
            },
        });
        expect(response.statusCode).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith('https://upstream.example.test/publish', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                Authorization: 'Bearer upstream-token',
            }),
        }));
        expect(response.json()).toEqual({
            published: true,
            reason: 'upstream_publish_ok',
            published_at: '2026-04-13T12:00:00.000Z',
        });
        await app.close();
    });
});
