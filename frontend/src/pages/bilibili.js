import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime, renderTimestamp } from '../utils/format.js';
import { renderBadge, renderBoolBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>B站集成</h2>
      <button class="btn" id="bili-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <!-- Status cards -->
    <div class="stat-grid" id="bili-status-cards">
      <div class="page-loading">加载中...</div>
    </div>

    <!-- Manual poll -->
    <div class="form-card" style="margin-top: 16px;">
      <h3>手动操作</h3>
      <button class="btn btn-primary" id="bili-poll-btn">触发轮询</button>
    </div>

    <!-- Videos -->
    <div class="section-card" style="margin-top: 16px;">
      <div class="section-card-header">
        <h3>视频监控</h3>
        <div class="form-group" style="margin:0;">
          <input type="text" id="bili-video-bvid" class="form-input" placeholder="输入 BVID" />
          <button class="btn btn-primary" id="bili-video-add">添加</button>
        </div>
      </div>
      <div class="table-wrapper" id="bili-videos-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>

    <!-- Credentials -->
    <div class="section-card" style="margin-top: 16px;">
      <div class="section-card-header"><h3>凭证管理</h3></div>
      <div class="form-card" style="border:none; box-shadow:none;">
        <div class="form-row">
          <div class="form-group"><label class="form-label">名称</label><input type="text" id="cred-name" class="form-input" /></div>
          <div class="form-group"><label class="form-label">SESSDATA</label><input type="text" id="cred-sessdata" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">bili_jct</label><input type="text" id="cred-bili-jct" class="form-input" /></div>
          <div class="form-group"><label class="form-label">buvid3</label><input type="text" id="cred-buvid3" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">buvid4</label><input type="text" id="cred-buvid4" class="form-input" /></div>
          <div class="form-group"><label class="form-label">过期时间</label><input type="datetime-local" id="cred-expires" class="form-input" /></div>
        </div>
        <button class="btn btn-primary" id="cred-add">添加凭证</button>
      </div>
      <div class="table-wrapper" id="bili-creds-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>
  `;

  async function loadStatus() {
    const el = container.querySelector('#bili-status-cards');
    try {
      const data = await api.getBilibiliStatus();
      el.innerHTML = `
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${data?.enabled ? '✅' : '❌'}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${data?.polling_enabled ? '✅' : '❌'}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${data?.publish_enabled ? '✅' : '❌'}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${data?.video_count ?? 0}</div>
        </div>
      `;
    } catch {
      el.innerHTML = '<div class="page-error">状态加载失败</div>';
    }
  }

  async function loadVideos() {
    const wrapper = container.querySelector('#bili-videos-wrapper');
    try {
      const data = await api.getBilibiliVideos({ limit: 50 });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

      if (items.length === 0) {
        wrapper.innerHTML = '<div class="table-empty">暂无视频</div>';
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>操作</th></tr></thead>
          <tbody>
            ${items.map(v => `<tr data-id="${escapeHtml(v.id || v.video_id)}">
              <td class="cell-id">${escapeHtml(v.bvid)}</td>
              <td class="cell-truncate">${escapeHtml(v.title || '-')}</td>
              <td>${renderBoolBadge(v.poll_enabled)}</td>
              <td>${v.comment_count ?? '-'}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${escapeHtml(v.id || v.video_id)}">${v.poll_enabled ? '禁用轮询' : '启用轮询'}</button>
                <button class="btn btn-sm bili-sync" data-id="${escapeHtml(v.id || v.video_id)}">同步</button>
                <button class="btn btn-sm btn-danger bili-delete" data-id="${escapeHtml(v.id || v.video_id)}">删除</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;

      wrapper.querySelectorAll('.bili-toggle-poll').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.toggleBilibiliVideoPoll(btn.dataset.id);
            showToast('操作成功', 'success');
            loadVideos();
          } catch (err) { showToast(`失败: ${err.message}`, 'error'); }
        });
      });

      wrapper.querySelectorAll('.bili-sync').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await api.syncBilibiliVideo(btn.dataset.id);
            showToast('同步完成', 'success');
            loadVideos();
          } catch (err) { showToast(`同步失败: ${err.message}`, 'error'); btn.disabled = false; }
        });
      });

      wrapper.querySelectorAll('.bili-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('确定删除此视频？')) return;
          try {
            await api.deleteBilibiliVideo(btn.dataset.id);
            showToast('已删除', 'success');
            loadVideos();
          } catch (err) { showToast(`删除失败: ${err.message}`, 'error'); }
        });
      });
    } catch (err) {
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function loadCredentials() {
    const wrapper = container.querySelector('#bili-creds-wrapper');
    try {
      const data = await api.getBilibiliCredentials();
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

      if (items.length === 0) {
        wrapper.innerHTML = '<div class="table-empty">暂无凭证</div>';
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期</th><th>操作</th></tr></thead>
          <tbody>
            ${items.map(c => `<tr data-id="${escapeHtml(c.id || c.credential_id)}">
              <td>${escapeHtml(c.name || '-')}</td>
              <td class="cell-id">${escapeHtml([
                c.has_sessdata ? 'SESSDATA' : '',
                c.has_bili_jct ? 'bili_jct' : '',
                c.buvid3 ? `buvid3:${c.buvid3}` : '',
              ].filter(Boolean).join(' / ') || '-')}</td>
              <td>${renderBoolBadge(c.is_active || c.active)}</td>
              <td class="cell-time">${escapeHtml(c.expires_at ? formatIsoDateTime(c.expires_at) : '-')}</td>
              <td class="cell-actions">
                ${!(c.is_active || c.active) ? `<button class="btn btn-sm cred-activate" data-id="${escapeHtml(c.id || c.credential_id)}">激活</button>` : ''}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${escapeHtml(c.id || c.credential_id)}">删除</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;

      wrapper.querySelectorAll('.cred-activate').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.activateBilibiliCredential(btn.dataset.id);
            showToast('已激活', 'success');
            loadCredentials();
          } catch (err) { showToast(`激活失败: ${err.message}`, 'error'); }
        });
      });

      wrapper.querySelectorAll('.cred-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('确定删除此凭证？')) return;
          try {
            await api.deleteBilibiliCredential(btn.dataset.id);
            showToast('已删除', 'success');
            loadCredentials();
          } catch (err) { showToast(`删除失败: ${err.message}`, 'error'); }
        });
      });
    } catch (err) {
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  // Add video
  container.querySelector('#bili-video-add').addEventListener('click', async () => {
    const bvid = container.querySelector('#bili-video-bvid').value.trim();
    if (!bvid) { showToast('BVID 不能为空', 'warning'); return; }
    try {
      await api.addBilibiliVideo(bvid);
      showToast('添加成功', 'success');
      container.querySelector('#bili-video-bvid').value = '';
      loadVideos();
    } catch (err) { showToast(`添加失败: ${err.message}`, 'error'); }
  });

  // Add credential
  container.querySelector('#cred-add').addEventListener('click', async () => {
    const payload = {
      name: container.querySelector('#cred-name').value.trim(),
      sessdata: container.querySelector('#cred-sessdata').value.trim(),
      bili_jct: container.querySelector('#cred-bili-jct').value.trim(),
      buvid3: container.querySelector('#cred-buvid3').value.trim(),
      buvid4: container.querySelector('#cred-buvid4').value.trim(),
      expires_at: container.querySelector('#cred-expires').value || undefined,
    };
    if (!payload.name || !payload.sessdata) {
      showToast('名称和 SESSDATA 不能为空', 'warning');
      return;
    }
    try {
      await api.addBilibiliCredential(payload);
      showToast('凭证添加成功', 'success');
      container.querySelector('#cred-name').value = '';
      container.querySelector('#cred-sessdata').value = '';
      container.querySelector('#cred-bili-jct').value = '';
      container.querySelector('#cred-buvid3').value = '';
      container.querySelector('#cred-buvid4').value = '';
      container.querySelector('#cred-expires').value = '';
      loadCredentials();
    } catch (err) { showToast(`添加失败: ${err.message}`, 'error'); }
  });

  // Manual poll
  container.querySelector('#bili-poll-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#bili-poll-btn');
    btn.disabled = true;
    btn.textContent = '轮询中...';
    try {
      await api.triggerBilibiliPoll();
      showToast('轮询完成', 'success');
      loadVideos();
    } catch (err) { showToast(`轮询失败: ${err.message}`, 'error'); }
    finally { btn.disabled = false; btn.textContent = '触发轮询'; }
  });

  // Refresh all
  container.querySelector('#bili-refresh').addEventListener('click', () => {
    loadStatus(); loadVideos(); loadCredentials();
  });

  await Promise.all([loadStatus(), loadVideos(), loadCredentials()]);
}
