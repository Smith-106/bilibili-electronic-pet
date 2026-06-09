import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flushPromises } from '../utils/dom.js';

const { pageIds, mockRequestJson, renderSpies } = vi.hoisted(() => {
  const ids = [
    'dashboard',
    'jobs',
    'daily-metrics',
    'knowledge',
    'memory',
    'role-cards',
    'profiles',
    'pet-core',
    'connections',
    'gateway',
    'audit',
    'bilibili',
    'query',
  ];
  const spies = Object.fromEntries(ids.map((id) => [id, vi.fn(async (container) => {
    container.innerHTML = `<div>${id} rendered</div>`;
  })]));
  return {
    pageIds: ids,
    mockRequestJson: vi.fn(),
    renderSpies: spies,
  };
});

vi.mock('../../src/api/client.js', () => ({
  requestJson: mockRequestJson,
}));

vi.mock('../../src/pages/dashboard.js', () => ({ render: renderSpies.dashboard }));
vi.mock('../../src/pages/jobs.js', () => ({ render: renderSpies.jobs }));
vi.mock('../../src/pages/daily-metrics.js', () => ({ render: renderSpies['daily-metrics'] }));
vi.mock('../../src/pages/knowledge.js', () => ({ render: renderSpies.knowledge }));
vi.mock('../../src/pages/memory.js', () => ({ render: renderSpies.memory }));
vi.mock('../../src/pages/role-cards.js', () => ({ render: renderSpies['role-cards'] }));
vi.mock('../../src/pages/profiles.js', () => ({ render: renderSpies.profiles }));
vi.mock('../../src/pages/pet-core.js', () => ({ render: renderSpies['pet-core'] }));
vi.mock('../../src/pages/connections.js', () => ({ render: renderSpies.connections }));
vi.mock('../../src/pages/gateway.js', () => ({ render: renderSpies.gateway }));
vi.mock('../../src/pages/audit.js', () => ({ render: renderSpies.audit }));
vi.mock('../../src/pages/bilibili.js', () => ({ render: renderSpies.bilibili }));
vi.mock('../../src/pages/query.js', () => ({ render: renderSpies.query }));

function mountShell() {
  document.body.innerHTML = `
    <div class="app-shell">
      <div class="top-bar">
        <span id="page-title">仪表盘</span>
        <button id="theme-toggle-btn" type="button">theme</button>
        <button id="logout-btn" type="button" style="display:none;">logout</button>
      </div>
      <div class="layout-shell">
        <aside id="left-sidebar">
          <button id="toggle-left-btn" type="button">collapse</button>
          <div id="nav-list">
            ${pageIds.map((id) => `<button type="button" class="nav-item" data-page="${id}">${id}</button>`).join('')}
          </div>
        </aside>
        <button id="expand-left-btn" type="button" style="display:none;">expand</button>
        <div id="page-container"></div>
      </div>
      <div id="login-overlay" style="display:none;">
        <form id="login-form">
          <input id="login-api-key" />
          <div id="login-error" style="display:none;"></div>
          <button type="submit">submit</button>
        </form>
      </div>
    </div>
  `;
}

async function loadMain() {
  vi.resetModules();
  await import('../../src/main.js');
}

describe('admin app shell regression tests', () => {
  beforeEach(() => {
    mockRequestJson.mockReset();
    for (const spy of Object.values(renderSpies)) {
      spy.mockClear();
    }
    delete window.__ADMIN_API_KEY__;
    delete window.__ADMIN_SESSION_TOKEN__;
    sessionStorage.clear();
    mountShell();
  });

  it('shows login error when admin auth validation fails', async () => {
    mockRequestJson
      .mockRejectedValueOnce(new Error('unauthorized'))
      .mockRejectedValueOnce(new Error('unauthorized'));

    await loadMain();

    expect(document.getElementById('login-overlay').style.display).toBe('flex');

    document.getElementById('login-api-key').value = 'bad-key';
    document.getElementById('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(mockRequestJson).toHaveBeenNthCalledWith(1, '/api/admin/session/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ api_key: 'bad-key' }),
    });
    expect(mockRequestJson).toHaveBeenNthCalledWith(2, '/api/admin/overview');
    expect(document.getElementById('login-error').textContent).toContain('API Key 无效或服务不可用');
    expect(document.getElementById('login-error').style.display).toBe('block');
    expect(window.__ADMIN_API_KEY__).toBe('');
    expect(window.__ADMIN_SESSION_TOKEN__).toBe('');
  });

  it('stores admin session token after successful login', async () => {
    mockRequestJson.mockResolvedValueOnce({
      ok: true,
      session_token: 'session-token-1',
      expires_at: '2026-06-08T10:00:00.000Z',
    });

    await loadMain();

    document.getElementById('login-api-key').value = 'good-key';
    document.getElementById('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(window.__ADMIN_SESSION_TOKEN__).toBe('session-token-1');
    expect(window.__ADMIN_API_KEY__).toBe('');
    expect(sessionStorage.getItem('admin_session_token')).toBe('session-token-1');
    expect(sessionStorage.getItem('admin_api_key')).toBeNull();
    expect(renderSpies.dashboard).toHaveBeenCalledTimes(1);
  });

  it('falls back to legacy api key login when session endpoint fails', async () => {
    mockRequestJson
      .mockRejectedValueOnce(new Error('not_found'))
      .mockResolvedValueOnce({ ok: true });

    await loadMain();

    document.getElementById('login-api-key').value = 'legacy-key';
    document.getElementById('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(window.__ADMIN_SESSION_TOKEN__).toBe('');
    expect(window.__ADMIN_API_KEY__).toBe('legacy-key');
    expect(sessionStorage.getItem('admin_api_key')).toBe('legacy-key');
    expect(renderSpies.dashboard).toHaveBeenCalledTimes(1);
  });

  it('ignores empty login submissions', async () => {
    await loadMain();

    document.getElementById('login-api-key').value = '   ';
    document.getElementById('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(mockRequestJson).not.toHaveBeenCalled();
    expect(renderSpies.dashboard).not.toHaveBeenCalled();
    expect(document.getElementById('login-overlay').style.display).toBe('flex');
  });

  it('falls back to legacy login when the session response has no token', async () => {
    mockRequestJson
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });

    await loadMain();

    document.getElementById('login-api-key').value = 'legacy-after-empty-session';
    document.getElementById('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(window.__ADMIN_SESSION_TOKEN__).toBe('');
    expect(window.__ADMIN_API_KEY__).toBe('legacy-after-empty-session');
    expect(sessionStorage.getItem('admin_api_key')).toBe('legacy-after-empty-session');
    expect(renderSpies.dashboard).toHaveBeenCalledTimes(1);
  });

  it('bootstraps from stored admin session token before legacy api key', async () => {
    sessionStorage.setItem('admin_session_token', 'stored-session');
    sessionStorage.setItem('admin_api_key', 'stored-key');

    await loadMain();
    await flushPromises();

    expect(window.__ADMIN_SESSION_TOKEN__).toBe('stored-session');
    expect(window.__ADMIN_API_KEY__).toBe('');
    expect(document.getElementById('login-overlay').style.display).toBe('none');
    expect(document.getElementById('logout-btn').style.display).toBe('');
    expect(renderSpies.dashboard).toHaveBeenCalledTimes(1);
    expect(document.getElementById('page-title').textContent).toBe('仪表盘');
    expect(document.querySelector('.nav-item[data-page="dashboard"]').classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-item[data-page="dashboard"]').getAttribute('aria-current')).toBe('page');
  });

  it('bootstraps from legacy api key when no session token is stored', async () => {
    sessionStorage.setItem('admin_api_key', 'stored-key');

    await loadMain();
    await flushPromises();

    expect(window.__ADMIN_SESSION_TOKEN__).toBe('');
    expect(window.__ADMIN_API_KEY__).toBe('stored-key');
    expect(renderSpies.dashboard).toHaveBeenCalledTimes(1);
  });

  it('switches pages when a nav item is clicked', async () => {
    sessionStorage.setItem('admin_session_token', 'stored-session');

    await loadMain();
    await flushPromises();

    document.querySelector('.nav-item[data-page="jobs"]').click();
    await flushPromises();

    expect(renderSpies.jobs).toHaveBeenCalledTimes(1);
    expect(document.getElementById('page-title').textContent).toBe('任务管理');
    expect(document.querySelector('.nav-item[data-page="jobs"]').classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-item[data-page="jobs"]').getAttribute('aria-current')).toBe('page');
    expect(document.querySelector('.nav-item[data-page="dashboard"]').hasAttribute('aria-current')).toBe(false);
  });

  it('ignores current and unknown nav targets', async () => {
    sessionStorage.setItem('admin_session_token', 'stored-session');
    document.getElementById('nav-list').insertAdjacentHTML(
      'beforeend',
      '<button type="button" class="nav-item" data-page="unknown">unknown</button>',
    );

    await loadMain();
    await flushPromises();

    document.querySelector('.nav-item[data-page="dashboard"]').click();
    document.querySelector('.nav-item[data-page="unknown"]').click();
    await flushPromises();

    expect(renderSpies.dashboard).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.nav-item[data-page="dashboard"]').classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-item[data-page="unknown"]').classList.contains('active')).toBe(false);
  });

  it('shows a page error when a page renderer rejects', async () => {
    sessionStorage.setItem('admin_session_token', 'stored-session');
    renderSpies.jobs.mockRejectedValueOnce(new Error('jobs render down'));

    await loadMain();
    await flushPromises();

    document.querySelector('.nav-item[data-page="jobs"]').click();
    await flushPromises();

    expect(document.getElementById('page-container').textContent).toContain('jobs render down');
  });

  it('clears both session token and api key on logout', async () => {
    sessionStorage.setItem('admin_session_token', 'stored-session');
    sessionStorage.setItem('admin_api_key', 'stored-key');

    await loadMain();
    await flushPromises();

    document.getElementById('logout-btn').click();

    expect(sessionStorage.getItem('admin_session_token')).toBeNull();
    expect(sessionStorage.getItem('admin_api_key')).toBeNull();
    expect(window.__ADMIN_SESSION_TOKEN__).toBe('');
    expect(window.__ADMIN_API_KEY__).toBe('');
    expect(document.getElementById('login-overlay').style.display).toBe('flex');
    expect(document.getElementById('page-container').innerHTML).toBe('');
  });

  it('cycles themes and toggles the sidebar layout', async () => {
    await loadMain();

    const themeButton = document.getElementById('theme-toggle-btn');
    const leftSidebar = document.getElementById('left-sidebar');
    const collapseButton = document.getElementById('toggle-left-btn');
    const expandButton = document.getElementById('expand-left-btn');

    themeButton.click();
    expect(document.body.getAttribute('data-theme')).toBe('dark');
    themeButton.click();
    expect(document.body.getAttribute('data-theme')).toBe('sepia');
    themeButton.click();
    expect(document.body.hasAttribute('data-theme')).toBe(false);

    collapseButton.click();
    expect(leftSidebar.classList.contains('collapsed')).toBe(true);
    expect(expandButton.style.display).toBe('block');

    expandButton.click();
    expect(leftSidebar.classList.contains('collapsed')).toBe(false);
    expect(expandButton.style.display).toBe('none');
  });

  it('boots without optional theme and sidebar toggle controls', async () => {
    sessionStorage.setItem('admin_session_token', 'stored-session');
    document.getElementById('theme-toggle-btn').remove();
    document.getElementById('toggle-left-btn').remove();
    document.getElementById('expand-left-btn').remove();

    await loadMain();
    await flushPromises();

    expect(renderSpies.dashboard).toHaveBeenCalledTimes(1);
    expect(document.getElementById('login-overlay').style.display).toBe('none');
  });
});
