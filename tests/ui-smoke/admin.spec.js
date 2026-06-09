import { expect, test } from '@playwright/test';

const jsonHeaders = {
  'content-type': 'application/json',
};

function fulfillJson(route, body) {
  return route.fulfill({
    status: 200,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

const adminFixtures = {
  overview: {
    total_comments: 12,
    total_jobs: 7,
    total_published: 3,
    pending_review: 2,
    total_failed: 1,
  },
  jobs: {
    items: [
      {
        id: 'job-12345678',
        status: 'published',
        comment_text: 'Browser smoke comment',
        reply_text: 'Browser smoke reply',
        route_context: { platform: 'bilibili' },
        risk_flags: [],
        created_at: '2026-04-10T03:30:00.000Z',
      },
    ],
  },
  gatewayLogs: {
    items: [
      {
        id: 1,
        platform: 'bilibili',
        status: 'published',
        created_at: '2026-04-10T03:30:00.000Z',
      },
    ],
  },
  auditSummary: {
    total: 10,
    ok_count: 8,
    failed_count: 2,
  },
  metricsOverview: {
    llm_provider: 'openai',
    search_provider: 'serpapi',
    publisher_mode: 'native_bilibili',
    llm_api_key_configured: true,
    search_api_key_configured: true,
    bilibili_enabled: true,
    bilibili_publish_enabled: true,
    kill_switch: false,
  },
  observabilitySummary: {
    ok: true,
    summary: {
      window_minutes: 120,
      published_count: 3,
      failed_count: 1,
      latency_ms_p95: 420,
    },
  },
  readiness: {
    ready: true,
    product_ready: true,
    foundation_ready: true,
    delivery_ready: true,
    foundation_blockers: [],
    delivery_blockers: [],
    delivery_capability_blockers: [],
    delivery_capabilities: {
      summary: [
        {
          capability: 'llm_generation',
          status: 'configured',
          mode: 'openai',
          missing_inputs: [],
        },
      ],
    },
    bilibili_diagnostics: {
      ready: true,
      effective_publish_mode: 'native_bilibili',
      release_gates: {
        real_auth_ready: true,
        credential_present: true,
        credential_complete: true,
      },
    },
  },
  bilibiliStatus: {
    enabled: true,
    polling_enabled: true,
    publish_enabled: true,
    video_count: 1,
    videos: {
      poll_enabled_count: 1,
    },
    credential: {
      id: 1,
      name: 'Browser smoke credential',
      is_active: true,
      updated_at: '2026-04-10T03:30:00.000Z',
    },
    diagnostics: {
      ready: true,
      effective_publish_mode: 'native_bilibili',
      blocking_reasons: [],
      release_gates: {
        real_auth_ready: true,
        credential_present: true,
        credential_complete: true,
      },
      signals: {
        real_auth_ready: true,
        credential_present: true,
        credential_complete: true,
        auth_probe_reason: 'verified',
      },
    },
    config: {
      poll_interval_seconds: 300,
      rate_limit_per_minute: 30,
    },
  },
  bilibiliVideos: {
    total: 1,
    items: [
      {
        id: 1,
        bvid: 'BV1BrowserSmoke',
        title: 'Browser smoke video',
        poll_enabled: true,
        last_polled_at: '2026-04-10T03:30:00.000Z',
        last_poll_status: 'ok',
        comment_count: 12,
      },
    ],
  },
  bilibiliCredentials: {
    items: [
      {
        id: 1,
        name: 'Browser smoke credential',
        is_active: true,
        expires_at: '2026-12-31T00:00:00.000Z',
        updated_at: '2026-04-10T03:30:00.000Z',
      },
    ],
  },
  petOverview: {
    item: {
      snapshot: {
        relationship: {
          level: 'Growing',
          note: 'Browser smoke relationship note',
        },
        progress: {
          progressLabel: 'Starter loop',
          nextMilestone: 'Next smoke milestone',
        },
        needs: [{ key: 'energy', label: 'Energy', value: '76%' }],
        proactiveSignals: [{ key: 'pulse', label: 'Pulse', detail: 'Browser smoke signal' }],
      },
      companion: {
        petName: 'Mochi',
        loopMode: 'Backend V2',
        adapterLabel: 'Backend V2',
        statusLine: 'Browser smoke companion status',
        recentInteractions: [
          {
            kind: 'pat',
            title: 'Browser smoke pat',
            detail: 'Browser smoke interaction detail',
            timestamp: '2026-04-10T03:30:00.000Z',
            source: 'pet-core',
          },
        ],
      },
    },
  },
};

async function installAdminRoutes(page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('admin_session_token', 'ui-smoke-session');
  });

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/admin/overview') return fulfillJson(route, adminFixtures.overview);
    if (path === '/api/admin/jobs') return fulfillJson(route, adminFixtures.jobs);
    if (path === '/api/admin/gateway/logs') return fulfillJson(route, adminFixtures.gatewayLogs);
    if (path === '/api/admin/audit/summary') return fulfillJson(route, adminFixtures.auditSummary);
    if (path === '/api/admin/metrics/overview') return fulfillJson(route, adminFixtures.metricsOverview);
    if (path === '/api/admin/observability/summary') return fulfillJson(route, adminFixtures.observabilitySummary);
    if (path === '/readiness') return fulfillJson(route, adminFixtures.readiness);
    if (path === '/api/admin/bilibili/status') return fulfillJson(route, adminFixtures.bilibiliStatus);
    if (path === '/api/admin/bilibili/videos') return fulfillJson(route, adminFixtures.bilibiliVideos);
    if (path === '/api/admin/bilibili/credentials') return fulfillJson(route, adminFixtures.bilibiliCredentials);
    if (path === '/api/admin/pet/overview') return fulfillJson(route, adminFixtures.petOverview);
    if (path === '/api/admin/pet/actions') return fulfillJson(route, { ok: true });

    return route.continue();
  });
}

test.beforeEach(async ({ page }) => {
  await installAdminRoutes(page);
});

test('admin dashboard and primary navigation render in a real browser', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#login-overlay')).toBeHidden();
  await expect(page.locator('#page-container')).toContainText('12');
  await expect(page.locator('#page-container')).toContainText('Browser smoke comment');

  await page.getByRole('button', { name: /任务|浠诲姟/ }).click();
  await expect(page.locator('#page-container')).toContainText('Browser smoke reply');

  await page.getByRole('button', { name: /Bilibili|B绔|B/ }).click();
  await expect(page.locator('#page-container')).toContainText('BV1BrowserSmoke');
  await expect(page.locator('#page-container')).toContainText('Browser smoke credential');

  await page.getByRole('button', { name: /Pet|宠物|瀹犵墿/ }).click();
  await expect(page.locator('#page-container')).toContainText('Mochi');
  await expect(page.locator('#page-container')).toContainText('Browser smoke companion status');

  const pageBox = await page.locator('#page-container').boundingBox();
  expect(pageBox?.width ?? 0).toBeGreaterThan(300);
  expect(pageBox?.height ?? 0).toBeGreaterThan(200);
});
