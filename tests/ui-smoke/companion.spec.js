import { expect, test } from '@playwright/test';

const companionState = {
  petName: 'Mochi',
  statusLine: 'Browser smoke companion status',
  loopMode: 'Backend V2',
  lastCheckIn: '2026-04-10 03:30',
  adapterLabel: 'Backend V2',
  loopHint: 'Browser smoke loop hint',
  mood: {
    label: 'Curious',
    note: 'Browser smoke mood note',
  },
  memoryTitle: 'Browser smoke memory',
  memorySummary: 'Browser smoke memory summary',
  vitals: [
    { label: 'Energy', value: '76%' },
    { label: 'Bond', value: 'Growing' },
  ],
  recentSignals: ['Browser smoke signal'],
  recentInteractions: [
    {
      kind: 'pat',
      title: 'Browser smoke pat',
      detail: 'Browser smoke interaction detail',
      timestamp: '2026-04-10T03:30:00.000Z',
      source: 'Backend V2',
    },
    {
      kind: 'signal',
      title: 'Browser smoke signal',
      detail: 'Browser smoke signal detail',
      timestamp: '2026-04-10T03:31:00.000Z',
      source: 'Backend V2',
    },
  ],
};

async function installCompanionRoutes(page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('admin_session_token', 'ui-smoke-session');
  });

  await page.route('**/companion/state-v2', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(companionState),
    }),
  );

  await page.route('**/companion/actions', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await installCompanionRoutes(page);
});

test('companion surface renders and accepts an action in desktop and mobile browsers', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-surface="pet-companion"]')).toBeVisible();
  await expect(page.locator('#companion-name')).toHaveText('Mochi');
  await expect(page.locator('[data-role="content"]')).toContainText('Browser smoke companion status');
  await expect(page.locator('[data-role="content"]')).toContainText('Browser smoke interaction detail');

  await page.locator('[data-role="action-buttons"] [data-action="pat"]').click();
  await expect(page.locator('[data-role="action-note-status-label"]')).toBeVisible();

  const contentBox = await page.locator('[data-role="content"]').boundingBox();
  expect(contentBox?.width ?? 0).toBeGreaterThan(250);
  expect(contentBox?.height ?? 0).toBeGreaterThan(200);
});
