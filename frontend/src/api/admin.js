import { requestJson, downloadFile } from './client.js';

function qs(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function createAdminApi() {
  return {
    // Overview
    getOverview() {
      return requestJson('/api/admin/overview');
    },
    getMetricsOverview() {
      return requestJson('/api/admin/metrics/overview');
    },
    getObservabilitySummary({ windowMinutes, window_minutes } = {}) {
      return requestJson(`/api/admin/observability/summary${qs({ window_minutes: windowMinutes ?? window_minutes })}`);
    },

    // Jobs
    getJobs({ status, limit } = {}) {
      return requestJson(`/api/admin/jobs${qs({ status, limit })}`);
    },
    getJob(jobId) {
      return requestJson(`/api/jobs/${encodeURIComponent(jobId)}`);
    },
    approveJob(jobId) {
      return requestJson(`/api/jobs/${encodeURIComponent(jobId)}/approve`, { method: 'POST' });
    },
    retryJob(jobId, body = {}) {
      return requestJson(`/api/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    batchApprove(jobIds) {
      return requestJson('/api/jobs/approve-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: jobIds }),
      });
    },
    batchRetry(jobIds) {
      return requestJson('/api/jobs/retry-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: jobIds }),
      });
    },
    exportJobsCsv({ status, limit } = {}) {
      return downloadFile(`/export/jobs.csv${qs({ status, limit })}`, 'jobs.csv');
    },

    // Comments
    getComments({ limit, offset } = {}) {
      return requestJson(`/comments${qs({ limit, offset })}`);
    },
    getComment(commentId) {
      return requestJson(`/api/comments/${encodeURIComponent(commentId)}`);
    },

    // Gateway
    getGatewayLogs({ limit, commentId, comment_id } = {}) {
      return requestJson(`/api/admin/gateway/logs${qs({ limit, comment_id: commentId ?? comment_id })}`);
    },
    getGatewayPublishLogs({ limit, offset, status } = {}) {
      return requestJson(`/gateway/publish-logs${qs({ limit, offset, status })}`);
    },
    publishGatewayReply(body) {
      return requestJson('/gateway/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },

    // Audit
    getAuditSummary({ days, action, ok } = {}) {
      return requestJson(`/api/admin/audit/summary${qs({ days, action, ok })}`);
    },
    getAuditLogs({ limit, action, ok } = {}) {
      return requestJson(`/api/audit-log${qs({ limit, action, ok })}`);
    },
    exportAuditCsv({ limit, action, ok } = {}) {
      return downloadFile(`/export/audit-logs.csv${qs({ limit, action, ok })}`, 'audit-logs.csv');
    },

    // Daily Metrics
    getDailyMetrics({ days } = {}) {
      return requestJson(`/api/metrics/daily${qs({ days })}`);
    },

    // Knowledge
    getKnowledgeEntries({ limit, offset } = {}) {
      return requestJson(`/api/admin/knowledge${qs({ limit, offset })}`);
    },
    createKnowledgeEntry(entry) {
      return requestJson('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    },
    disableKnowledgeEntry(entryId) {
      return requestJson(`/api/admin/knowledge/${encodeURIComponent(entryId)}/disable`, { method: 'POST' });
    },

    // Memory
    getMemorySpaces({ limit, offset, space_type, subject_type, subject_id } = {}) {
      return requestJson(`/api/admin/memory/spaces${qs({ limit, offset, space_type, subject_type, subject_id })}`);
    },
    createMemorySpace(entry) {
      return requestJson('/api/admin/memory/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    },
    getMemoryItems({ limit, offset, space_id, item_key, content_type, source } = {}) {
      return requestJson(`/api/admin/memory/items${qs({ limit, offset, space_id, item_key, content_type, source })}`);
    },
    upsertMemoryItem(entry) {
      return requestJson('/api/admin/memory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    },
    getMemoryGrants({ limit, offset, space_id, subject_type, subject_id } = {}) {
      return requestJson(`/api/admin/memory/grants${qs({ limit, offset, space_id, subject_type, subject_id })}`);
    },
    grantMemorySpaceAccess(entry) {
      return requestJson('/api/admin/memory/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    },
    getMemoryIdentityLinks({ limit, offset, subject_type, subject_id, platform, external_id } = {}) {
      return requestJson(
        `/api/admin/memory/identity-links${qs({ limit, offset, subject_type, subject_id, platform, external_id })}`,
      );
    },
    linkMemoryIdentity(entry) {
      return requestJson('/api/admin/memory/identity-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    },

    // Role Cards
    getRoleCards({ limit, offset } = {}) {
      return requestJson(`/api/admin/role-cards${qs({ limit, offset })}`);
    },
    createRoleCard(card) {
      return requestJson('/api/admin/role-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
    },
    updateRoleCard(cardKey, card) {
      return requestJson(`/api/admin/role-cards/${encodeURIComponent(cardKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
    },
    disableRoleCard(cardKey) {
      return requestJson(`/api/admin/role-cards/${encodeURIComponent(cardKey)}/disable`, { method: 'POST' });
    },
    activateRoleCard(cardKey) {
      return requestJson(`/api/admin/role-cards/${encodeURIComponent(cardKey)}/activate`, { method: 'POST' });
    },

    // Profiles
    getStyleProfile() {
      return requestJson('/api/admin/style-profile');
    },
    setStyleProfile(style) {
      return requestJson('/api/admin/style-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      });
    },
    getRoleProfile() {
      return requestJson('/api/admin/role-profile');
    },
    setRoleProfile(role) {
      return requestJson('/api/admin/role-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
    },

    // Bilibili
    getBilibiliStatus() {
      return requestJson('/api/admin/bilibili/status');
    },
    getReadinessStatus() {
      return requestJson('/readiness');
    },
    getBilibiliVideos({ poll_enabled, limit, offset } = {}) {
      return requestJson(`/api/admin/bilibili/videos${qs({ poll_enabled, limit, offset })}`);
    },
    addBilibiliVideo(bvid) {
      return requestJson('/api/admin/bilibili/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bvid }),
      });
    },
    toggleBilibiliVideoPoll(videoId) {
      return requestJson(`/api/admin/bilibili/videos/${encodeURIComponent(videoId)}/toggle-poll`, { method: 'POST' });
    },
    syncBilibiliVideo(videoId) {
      return requestJson(`/api/admin/bilibili/videos/${encodeURIComponent(videoId)}/sync`, { method: 'POST' });
    },
    deleteBilibiliVideo(videoId) {
      return requestJson(`/api/admin/bilibili/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
    },
    triggerBilibiliPoll() {
      return requestJson('/api/admin/bilibili/poll', { method: 'POST' });
    },
    getBilibiliCredentials() {
      return requestJson('/api/admin/bilibili/credentials');
    },
    addBilibiliCredential(credential) {
      return requestJson('/api/admin/bilibili/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      });
    },
    activateBilibiliCredential(credentialId) {
      return requestJson(`/api/admin/bilibili/credentials/${encodeURIComponent(credentialId)}/activate`, { method: 'POST' });
    },
    deleteBilibiliCredential(credentialId) {
      return requestJson(`/api/admin/bilibili/credentials/${encodeURIComponent(credentialId)}`, { method: 'DELETE' });
    },
  };
}
