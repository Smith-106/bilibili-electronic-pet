import './style.css';
import { requestJson } from './api/client.js';

// Page imports (lazy-loaded modules)
import { render as renderDashboard } from './pages/dashboard.js';
import { render as renderJobs } from './pages/jobs.js';
import { render as renderDailyMetrics } from './pages/daily-metrics.js';
import { render as renderKnowledge } from './pages/knowledge.js';
import { render as renderMemory } from './pages/memory.js';
import { render as renderRoleCards } from './pages/role-cards.js';
import { render as renderProfiles } from './pages/profiles.js';
import { render as renderPetCore } from './pages/pet-core.js';
import { render as renderConnections } from './pages/connections.js';
import { render as renderGateway } from './pages/gateway.js';
import { render as renderAudit } from './pages/audit.js';
import { render as renderBilibili } from './pages/bilibili.js';
import { render as renderQuery } from './pages/query.js';

const PAGES = {
  dashboard: { render: renderDashboard, title: '仪表盘' },
  jobs: { render: renderJobs, title: '任务管理' },
  'daily-metrics': { render: renderDailyMetrics, title: '每日指标' },
  knowledge: { render: renderKnowledge, title: '知识库' },
  memory: { render: renderMemory, title: 'Memory 管理' },
  'role-cards': { render: renderRoleCards, title: '角色卡' },
  profiles: { render: renderProfiles, title: '风格配置' },
  'pet-core': { render: renderPetCore, title: '宠物核心' },
  connections: { render: renderConnections, title: '平台连接' },
  gateway: { render: renderGateway, title: '网关' },
  audit: { render: renderAudit, title: '审计日志' },
  bilibili: { render: renderBilibili, title: 'B站集成' },
  query: { render: renderQuery, title: '查询' },
};

let currentPage = null;

function ensureApiKey() {
  const stored = sessionStorage.getItem('admin_api_key');
  if (stored) {
    window.__ADMIN_API_KEY__ = stored;
    return true;
  }
  return false;
}

function showLogin() {
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('logout-btn').style.display = 'none';
}

function hideLogin() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('logout-btn').style.display = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const input = document.getElementById('login-api-key');
  const errorEl = document.getElementById('login-error');
  const key = input.value.trim();
  if (!key) return;

  window.__ADMIN_API_KEY__ = key;
  try {
    await requestJson('/api/admin/overview');
    sessionStorage.setItem('admin_api_key', key);
    hideLogin();
    navigateTo('dashboard');
  } catch {
    errorEl.textContent = 'API Key 无效或服务不可用';
    errorEl.style.display = 'block';
    window.__ADMIN_API_KEY__ = '';
  }
}

function handleLogout() {
  sessionStorage.removeItem('admin_api_key');
  window.__ADMIN_API_KEY__ = '';
  document.getElementById('page-container').innerHTML = '';
  showLogin();
}

function navigateTo(page) {
  if (!PAGES[page]) return;
  currentPage = page;

  // Update nav active state
  document.querySelectorAll('#nav-list .nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update page title
  document.getElementById('page-title').textContent = PAGES[page].title;

  // Render page
  const container = document.getElementById('page-container');
  container.innerHTML = '<div class="page-loading">加载中...</div>';
  PAGES[page].render(container).catch(err => {
    container.innerHTML = `<div class="page-error">加载失败: ${err.message}</div>`;
  });
}

function setupSidebarNav() {
  document.querySelectorAll('#nav-list .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page && page !== currentPage) {
        navigateTo(page);
      }
    });
  });
}

function setupLayoutToggles() {
  const leftSidebar = document.getElementById('left-sidebar');
  const toggleLeftBtn = document.getElementById('toggle-left-btn');
  const expandLeftBtn = document.getElementById('expand-left-btn');

  if (toggleLeftBtn && expandLeftBtn && leftSidebar) {
    toggleLeftBtn.addEventListener('click', () => {
      leftSidebar.classList.add('collapsed');
      expandLeftBtn.style.display = 'block';
    });
    expandLeftBtn.addEventListener('click', () => {
      leftSidebar.classList.remove('collapsed');
      expandLeftBtn.style.display = 'none';
    });
  }
}

function setupTheme() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const themes = ['', 'dark', 'sepia'];
  let idx = 0;
  btn.addEventListener('click', () => {
    idx = (idx + 1) % themes.length;
    if (themes[idx]) {
      document.body.setAttribute('data-theme', themes[idx]);
    } else {
      document.body.removeAttribute('data-theme');
    }
  });
}

function bootstrap() {
  setupLayoutToggles();
  setupTheme();
  setupSidebarNav();

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  if (ensureApiKey()) {
    hideLogin();
    navigateTo('dashboard');
  } else {
    showLogin();
  }
}

bootstrap();
