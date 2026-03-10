import { requestJson } from './client.js';

export function createAdminApi() {
  return {
    getOverview() {
      return requestJson('/api/metrics/overview');
    },
    getJobs() {
      return requestJson('/api/jobs?limit=20');
    },
    getGatewayLogs() {
      return requestJson('/gateway/publish-logs?limit=20');
    },
    getAuditSummary(days = 7) {
      return requestJson(`/api/audit-logs/summary?days=${encodeURIComponent(String(days))}`);
    },
  };
}
