import { createAdminDashboardApi } from '../../api/admin.js';

/**
 * Renders the Admin Dashboard with a data snapshot.
 * Includes micro-UX improvements: loading states, refresh capability, and accessible error handling.
 */
export async function renderAdminDashboard(container) {
  if (!container) return;
  const api = createAdminDashboardApi();

  const load = async () => {
    container.innerHTML = `
      <div role="status" aria-live="polite">
        <h2>Admin Dashboard</h2>
        <p>⌛ Loading snapshot...</p>
      </div>
    `;
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
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2>Admin Dashboard</h2>
          <button id="ref-btn" aria-label="Refresh dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer;">Refresh</button>
        </div>
        <pre id="admin-dashboard-json" style="background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow: auto;">${JSON.stringify(snapshot, null, 2)}</pre>
      `;
      container.querySelector('#ref-btn').onclick = load;
    } catch (err) {
      container.innerHTML = `
        <h2>Admin Dashboard</h2>
        <div role="alert" style="border: 1px solid #ffcfcf; background: #fff5f5; padding: 1rem; border-radius: 4px;">
          <p style="color: #d32f2f; margin: 0 0 1rem 0;"><strong>❌ Error:</strong> ${err.message || err}</p>
          <button id="ret-btn" aria-label="Retry loading dashboard data" style="padding: 0.4rem 0.8rem; cursor: pointer;">Retry</button>
        </div>
      `;
      container.querySelector('#ret-btn').onclick = load;
    }
  };

  await load();
}
