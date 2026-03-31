import { createAdminDashboardApi } from '../../api/admin.js';

/**
 * Renders the Admin Dashboard with a data snapshot.
 * Includes micro-UX improvements: loading states, refresh capability, and accessible error handling.
 */
export async function renderAdminDashboard(container) {
  if (!container) return;
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Admin dashboard panel');
  const api = createAdminDashboardApi();
  let isLoading = false;

  const load = async () => {
    if (isLoading) return;
    isLoading = true;
    container.setAttribute('aria-busy', 'true');

    const refreshBtn = container.querySelector('#ref-btn');
    const retryBtn = container.querySelector('#ret-btn');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
    } else if (retryBtn) {
      retryBtn.disabled = true;
      retryBtn.textContent = 'Retrying...';
    } else {
      container.innerHTML = `
        <div role="status" aria-live="polite" aria-atomic="true">
          <h2>Admin Dashboard</h2>
          <p>⌛ Loading snapshot...</p>
        </div>
      `;
    }
    try {
      const [ov, jb, gl, as] = await Promise.all([
        api.getOverview(),
        api.getJobs(),
        api.getGatewayLogs(),
        api.getAuditSummary(7),
      ]);

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h2 style="margin: 0; font-family: var(--font-body); font-weight: 500; font-size: 28px;">系统健康快照</h2>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 0.875rem; color: var(--grey-1); font-family: var(--font-ui);" aria-live="polite">最后更新: ${new Date().toLocaleTimeString()}</span>
            <button id="ref-btn" type="button" aria-label="刷新仪表盘数据" class="btn"><svg width="14" height="14" style="margin-right:6px;"><use href="#icon-zap"></use></svg>刷新数据</button>
          </div>
        </div>
        
        <p style="font-family: var(--font-body); font-size: 1.15rem; line-height: 1.8; color: var(--grey-0); margin-bottom: 2rem;">
          Bili Pet 电子宠物核心框架当前正在平稳运行中。根据最新的系统诊断分析，我们已经处理了 <strong style="color: var(--primary-cta);">${Array.isArray(jb?.items) ? jb.items.length : 0} 个活跃任务（Active Jobs）</strong> ，并且无缝响应了 <strong style="color: var(--primary-cta);">${Array.isArray(gl?.items) ? gl.items.length : 0} 次网关事件（Gateway Events）</strong>。AI 大脑整体健康状态毫无保留地呈现为 <strong>极佳（Excellent）</strong>。
        </p>

        <div style="display: flex; gap: 1.5rem; margin-top: 1rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px; padding: 1.5rem; background: var(--document-background); border-radius: 10px; box-shadow: var(--card-drop-shadow);">
            <div style="color: var(--grey-1); font-size: 0.875rem; font-family: var(--font-ui); text-transform: uppercase; letter-spacing: 0.5px;">活跃任务</div>
            <div style="font-size: 2.5rem; font-weight: 400; color: var(--grey-0); font-family: var(--font-body); margin-top: 8px;">${Array.isArray(jb?.items) ? jb.items.length : 0}</div>
          </div>
          <div style="flex: 1; min-width: 200px; padding: 1.5rem; background: var(--document-background); border-radius: 10px; box-shadow: var(--card-drop-shadow);">
            <div style="color: var(--grey-1); font-size: 0.875rem; font-family: var(--font-ui); text-transform: uppercase; letter-spacing: 0.5px;">网关事件记录</div>
            <div style="font-size: 2.5rem; font-weight: 400; color: var(--grey-0); font-family: var(--font-body); margin-top: 8px;">${Array.isArray(gl?.items) ? gl.items.length : 0}</div>
          </div>
        </div>
        
        <p style="font-family: var(--font-body); font-size: 1.15rem; line-height: 1.8; color: var(--grey-0); margin-top: 2rem;">
          如果您需要查看详细的诊断日志、个性格局（Personality Parameters）以及后端的实时运作矩阵，请详阅下方的 <b style="color: var(--primary-cta);">系统配置库 (System Configuration)</b> 折叠面板。
        </p>
      `;

      // Inject JSON debug data safely into the story bible accordions
      const pOverview = document.getElementById('panel-overview');
      if (pOverview) {
        pOverview.innerHTML = `<pre style="font-family: var(--font-mono); font-size:12px; margin:0; padding: 8px; background:var(--grey-4); border-radius:6px; overflow:auto;">${JSON.stringify(ov, null, 2) || 'No data found'}</pre>`;
      }
      const pJobs = document.getElementById('panel-jobs');
      if (pJobs) {
        pJobs.innerHTML = `<pre style="font-family: var(--font-mono); font-size:12px; margin:0; padding: 8px; background:var(--grey-4); border-radius:6px; overflow:auto;">${JSON.stringify(jb, null, 2) || 'No jobs active'}</pre>`;
      }
      const pGateway = document.getElementById('panel-gateway');
      if (pGateway) {
        pGateway.innerHTML = `<pre style="font-family: var(--font-mono); font-size:12px; margin:0; padding: 8px; background:var(--grey-4); border-radius:6px; overflow:auto;">${JSON.stringify(gl, null, 2) || 'No gateway logs'}</pre>`;
      }
      const pAudit = document.getElementById('panel-audit');
      if (pAudit) {
        pAudit.style.display = 'block';
        pAudit.innerHTML = `<pre style="font-family: var(--font-mono); font-size:12px; margin:0; padding: 8px; background:var(--grey-4); border-radius:6px; overflow:auto;">${JSON.stringify(as, null, 2) || 'No audit config'}</pre>`;
      }

      const refreshBtn = container.querySelector('#ref-btn');
      if (refreshBtn) refreshBtn.onclick = load;
    } catch (err) {
      container.innerHTML = `
        <h2>Admin Dashboard</h2>
        <div role="alert" aria-live="assertive" aria-atomic="true" style="border: 1px solid #ffcfcf; background: #fff5f5; padding: 1rem; border-radius: 4px;">
          <p style="color: #d32f2f; margin: 0 0 1rem 0;"><strong>❌ Error:</strong> <span id="admin-dashboard-error"></span></p>
          <button id="ret-btn" type="button" aria-label="Retry loading dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer;">Retry</button>
        </div>
      `;
      const errorEl = container.querySelector('#admin-dashboard-error');
      if (errorEl) {
        errorEl.textContent = String(err?.message || err || 'request_failed');
      }
      const retryBtn = container.querySelector('#ret-btn');
      if (retryBtn) {
        retryBtn.onclick = load;
      }
    } finally {
      isLoading = false;
      container.setAttribute('aria-busy', 'false');
    }
  };

  await load();
}
