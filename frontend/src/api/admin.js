import { requestJson } from './client.js';

export function createAdminDashboardApi() {
  return {
    getOverview() {
      return requestJson('/api/admin/overview');
    },
    getJobs() {
      return requestJson('/api/admin/jobs?limit=20');
    },
    getGatewayLogs() {
      return requestJson('/api/admin/gateway/logs?limit=20');
    },
    getAuditSummary(days = 7) {
      return requestJson(`/api/admin/audit/summary?days=${encodeURIComponent(String(days))}`);
    },
  };
}
