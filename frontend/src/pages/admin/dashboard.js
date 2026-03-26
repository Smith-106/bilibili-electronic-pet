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

      const snapshot = {
        overview: ov,
        jobs_count: Array.isArray(jb?.items) ? jb.items.length : 0,
        gateway_logs_count: Array.isArray(gl?.items) ? gl.items.length : 0,
        audit_summary: as,
        last_updated: new Date().toLocaleTimeString(),
      };

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="margin: 0;">Admin Dashboard</h2>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 0.875rem; color: #666;" aria-live="polite">Last updated: ${snapshot.last_updated}</span>
            <button id="copy-btn" type="button" aria-label="Copy JSON data to clipboard" style="padding: 0.4rem 0.8rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;">Copy JSON</button>
            <button id="ref-btn" type="button" aria-label="Refresh dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;">Refresh</button>
          </div>
        </div>
        <pre id="admin-dashboard-json" tabindex="0" aria-label="Dashboard JSON data snapshot" style="margin: 0; background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow: auto;"></pre>
      `;
      const dashboardJsonEl = container.querySelector('#admin-dashboard-json');
      if (dashboardJsonEl) {
        dashboardJsonEl.textContent = JSON.stringify(snapshot, null, 2);
      }
      const refreshBtn = container.querySelector('#ref-btn');
      if (refreshBtn) {
        refreshBtn.onclick = load;
      }
      const copyBtn = container.querySelector('#copy-btn');
      if (copyBtn) {
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.setAttribute('aria-label', 'JSON data copied successfully');
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.setAttribute('aria-label', 'Copy JSON data to clipboard');
            }, 2000);
          } catch (err) {
            console.error('Failed to copy', err);
            copyBtn.textContent = 'Failed';
          }
        };
      }
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
