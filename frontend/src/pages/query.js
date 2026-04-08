import { createAdminApi } from '../api/admin.js';
import { escapeHtml, renderTimestamp } from '../utils/format.js';
import { showToast } from '../components/toast.js';
import { renderTable } from '../components/table.js';

const api = createAdminApi();
const COMMENT_HISTORY_KEY = 'query_recent_comment_ids';
const JOB_HISTORY_KEY = 'query_recent_job_ids';
const HISTORY_LIMIT = 5;

function getHistory(key) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === 'string' && value.trim() !== '');
  } catch {
    return [];
  }
}

function pushHistory(key, value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return;
  const entries = getHistory(key).filter((item) => item !== trimmed);
  entries.unshift(trimmed);
  sessionStorage.setItem(key, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
}

async function copyJsonPayload(payload) {
  const text = JSON.stringify(payload, null, 2);
  const clipboard = globalThis.navigator?.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    await clipboard.writeText(text);
    return true;
  }
  return false;
}

function renderDetailRows(data) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) {
    return '<div class="table-empty">未返回可展示字段</div>';
  }
  return `
    <div class="detail-card">
      ${entries.map(([k, v]) => `
        <div class="detail-row">
          <span class="detail-key">${escapeHtml(k)}</span>
          <span class="detail-value">${escapeHtml(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '-'))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function resolveCommentLookupId(item) {
  return String(item?.canonical_comment_id || item?.comment_id || item?.id || '').trim();
}

export async function render(container) {
  container.innerHTML = `
    <div class="page-header"><h2>查询 / 评论浏览</h2></div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>评论详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <input type="text" id="query-comment-id" class="form-input" placeholder="输入 Comment ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-comment-btn">查询评论</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-comment-clear">清空</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-comment-copy" disabled>复制JSON</button>
            </div>
          </div>
          <div id="query-comment-meta" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-comment-recent" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-comment-result"></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-card-header"><h3>任务详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <input type="text" id="query-job-id" class="form-input" placeholder="输入 Job ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-job-btn">查询任务</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-job-clear">清空</button>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" id="query-job-copy" disabled>复制JSON</button>
            </div>
          </div>
          <div id="query-job-meta" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-job-recent" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-job-result"></div>
        </div>
      </div>

      <div class="section-card" style="grid-column: 1 / -1;">
        <div class="section-card-header"><h3>最近评论浏览</h3></div>
        <div style="padding: 16px;">
          <div class="filter-bar" style="margin-bottom: 12px; padding: 0; background: transparent; box-shadow: none;">
            <div class="form-group">
              <label class="form-label">数量</label>
              <input type="number" id="query-comments-limit" class="form-input" value="10" min="1" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">偏移</label>
              <input type="number" id="query-comments-offset" class="form-input" value="0" min="0" max="10000" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-comments-load">刷新评论列表</button>
            </div>
          </div>
          <div id="query-comments-meta" class="form-hint" style="margin-bottom:8px;"></div>
          <div id="query-comments-wrapper"><div class="page-loading">加载中...</div></div>
        </div>
      </div>
    </div>
  `;

  const commentInput = container.querySelector('#query-comment-id');
  const commentResult = container.querySelector('#query-comment-result');
  const commentMeta = container.querySelector('#query-comment-meta');
  const commentRecent = container.querySelector('#query-comment-recent');
  const commentCopyBtn = container.querySelector('#query-comment-copy');
  let commentPayload = null;

  const jobInput = container.querySelector('#query-job-id');
  const jobResult = container.querySelector('#query-job-result');
  const jobMeta = container.querySelector('#query-job-meta');
  const jobRecent = container.querySelector('#query-job-recent');
  const jobCopyBtn = container.querySelector('#query-job-copy');
  let jobPayload = null;

  const commentsMeta = container.querySelector('#query-comments-meta');
  const commentsWrapper = container.querySelector('#query-comments-wrapper');

  function renderRecent(containerEl, key, clickHandler) {
    const items = getHistory(key);
    if (items.length === 0) {
      containerEl.textContent = '';
      return;
    }
    containerEl.innerHTML = `
      最近查询：
      ${items.map((item) => `<button class="btn btn-link" data-query-id="${escapeHtml(item)}" type="button">${escapeHtml(item)}</button>`).join('')}
    `;
    containerEl.querySelectorAll('[data-query-id]').forEach((btn) => {
      btn.addEventListener('click', () => clickHandler(btn.dataset.queryId || ''));
    });
  }

  async function runCommentQuery(prefilledId = '') {
    const id = (prefilledId || commentInput.value).trim();
    commentInput.value = id;
    if (!id) { showToast('请输入 Comment ID', 'warning'); return; }

    commentResult.innerHTML = '<div class="page-loading">查询中...</div>';
    commentCopyBtn.disabled = true;
    try {
      const data = await api.getComment(id);
      commentPayload = data || {};
      commentCopyBtn.disabled = false;
      commentResult.innerHTML = renderDetailRows(commentPayload);
      commentMeta.textContent = `查询成功，共 ${Object.keys(commentPayload).length} 个字段`;
      pushHistory(COMMENT_HISTORY_KEY, id);
      renderRecent(commentRecent, COMMENT_HISTORY_KEY, runCommentQuery);
    } catch (err) {
      commentPayload = null;
      commentResult.innerHTML = `<div class="page-error">查询失败: ${escapeHtml(err.message)}</div>`;
      commentMeta.textContent = '';
    }
  }

  async function runJobQuery(prefilledId = '') {
    const id = (prefilledId || jobInput.value).trim();
    jobInput.value = id;
    if (!id) { showToast('请输入 Job ID', 'warning'); return; }

    jobResult.innerHTML = '<div class="page-loading">查询中...</div>';
    jobCopyBtn.disabled = true;
    try {
      const data = await api.getJob(id);
      jobPayload = data || {};
      jobCopyBtn.disabled = false;
      jobResult.innerHTML = `
        ${renderDetailRows(jobPayload)}
        ${jobPayload?.comment_id ? `<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${escapeHtml(jobPayload.comment_id)}">查看关联评论 →</a></div>` : ''}
      `;
      jobMeta.textContent = `查询成功，共 ${Object.keys(jobPayload).length} 个字段`;
      pushHistory(JOB_HISTORY_KEY, id);
      renderRecent(jobRecent, JOB_HISTORY_KEY, runJobQuery);

      const linkBtn = jobResult.querySelector('#query-goto-comment');
      if (linkBtn) {
        linkBtn.addEventListener('click', () => {
          runCommentQuery(linkBtn.dataset.id);
        });
      }
    } catch (err) {
      jobPayload = null;
      jobResult.innerHTML = `<div class="page-error">查询失败: ${escapeHtml(err.message)}</div>`;
      jobMeta.textContent = '';
    }
  }

  async function loadCommentsList() {
    const limit = container.querySelector('#query-comments-limit').value;
    const offset = container.querySelector('#query-comments-offset').value;
    commentsWrapper.innerHTML = '<div class="page-loading">加载中...</div>';
    commentsMeta.textContent = '';

    try {
      const data = await api.getComments({ limit, offset });
      const items = Array.isArray(data?.items) ? data.items : [];
      const total = Number(data?.total ?? items.length) || items.length;
      commentsMeta.textContent = `返回 ${items.length} / ${total} 条评论`;

      if (items.length === 0) {
        commentsWrapper.innerHTML = '<div class="table-empty">暂无评论</div>';
        return;
      }

      commentsWrapper.innerHTML = renderTable({
        columns: [
          {
            key: 'comment_id',
            label: 'Comment ID',
            class: 'cell-id',
            render: (row) => escapeHtml(resolveCommentLookupId(row).substring(0, 18) || '-'),
          },
          {
            key: 'platform',
            label: '平台',
            render: (row) => escapeHtml(row.platform || '-'),
          },
          {
            key: 'source',
            label: '来源',
            render: (row) => escapeHtml(row.source || '-'),
          },
          {
            key: 'content',
            label: '评论内容',
            class: 'cell-truncate',
            render: (row) => escapeHtml((row.content || '-').toString().substring(0, 80)),
          },
          {
            key: 'created_at',
            label: '时间',
            class: 'cell-time',
            render: (row) => renderTimestamp(row.created_at),
          },
          {
            key: 'actions',
            label: '操作',
            class: 'cell-actions',
            render: (row) => {
              const commentId = resolveCommentLookupId(row);
              if (!commentId) {
                return '<span class="form-hint">缺少 ID</span>';
              }
              return `<button class="btn btn-sm query-comment-open" data-comment-id="${escapeHtml(commentId)}" type="button">查看详情</button>`;
            },
          },
        ],
        rows: items,
      });

      commentsWrapper.querySelectorAll('.query-comment-open').forEach((button) => {
        button.addEventListener('click', () => {
          const commentId = button.dataset.commentId || '';
          commentInput.value = commentId;
          runCommentQuery(commentId);
        });
      });
    } catch (err) {
      commentsWrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  container.querySelector('#query-comment-btn').addEventListener('click', () => { runCommentQuery(); });
  container.querySelector('#query-job-btn').addEventListener('click', () => { runJobQuery(); });
  container.querySelector('#query-comments-load').addEventListener('click', loadCommentsList);

  commentInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runCommentQuery();
  });
  jobInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runJobQuery();
  });

  container.querySelector('#query-comment-clear').addEventListener('click', () => {
    commentInput.value = '';
    commentPayload = null;
    commentCopyBtn.disabled = true;
    commentMeta.textContent = '';
    commentResult.innerHTML = '';
  });
  container.querySelector('#query-job-clear').addEventListener('click', () => {
    jobInput.value = '';
    jobPayload = null;
    jobCopyBtn.disabled = true;
    jobMeta.textContent = '';
    jobResult.innerHTML = '';
  });

  commentCopyBtn.addEventListener('click', async () => {
    if (!commentPayload) {
      showToast('暂无可复制的评论查询结果', 'warning');
      return;
    }
    const ok = await copyJsonPayload(commentPayload);
    showToast(ok ? '评论查询结果已复制' : '当前环境不支持复制，请手动复制', ok ? 'success' : 'warning');
  });
  jobCopyBtn.addEventListener('click', async () => {
    if (!jobPayload) {
      showToast('暂无可复制的任务查询结果', 'warning');
      return;
    }
    const ok = await copyJsonPayload(jobPayload);
    showToast(ok ? '任务查询结果已复制' : '当前环境不支持复制，请手动复制', ok ? 'success' : 'warning');
  });

  renderRecent(commentRecent, COMMENT_HISTORY_KEY, runCommentQuery);
  renderRecent(jobRecent, JOB_HISTORY_KEY, runJobQuery);
  await loadCommentsList();
}
