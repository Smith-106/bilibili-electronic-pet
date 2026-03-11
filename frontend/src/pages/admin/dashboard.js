import { createAdminDashboardApi } from '../../api/admin.js';

export async function renderAdminDashboard(container) {
  if (!container) return;
  const api = createAdminDashboardApi();
  container.innerHTML = '<h2>Admin Dashboard Data Snapshot</h2><pre id="admin-dashboard-json">loading...</pre>';
  const output = container.querySelector('#admin-dashboard-json');

  try {
    const [overview, jobs, gatewayLogs, auditSummary] = await Promise.all([
      api.getOverview(),
      api.getJobs(),
      api.getGatewayLogs(),
      api.getAuditSummary(7),
    ]);

    const snapshot = {
      overview,
      jobs_count: Array.isArray(jobs?.items) ? jobs.items.length : 0,
      gateway_logs_count: Array.isArray(gatewayLogs?.items) ? gatewayLogs.items.length : 0,
      audit_summary: auditSummary,
    };

    if (output) output.textContent = JSON.stringify(snapshot, null, 2);
  } catch (error) {
    if (output) output.textContent = String(error?.message || error || 'unknown_error');
  }
}
