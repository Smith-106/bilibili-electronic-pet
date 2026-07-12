import { createAdminApi } from '../api/admin.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>风格配置</h2>
      <div class="page-actions">
        <button class="btn btn-secondary" id="profile-refresh">刷新配置</button>
      </div>
    </div>

    <div class="section-grid">
      <div class="form-card">
        <h3>风格配置</h3>
        <p class="form-hint">选择回复生成风格</p>
        <div class="form-group">
          <select id="profile-style" class="form-input" aria-label="回复风格">
            <option value="auto">auto (自动)</option>
            <option value="empathy">empathy (共情)</option>
            <option value="meme">meme (热梗)</option>
            <option value="normal">normal (正常)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="profile-style-apply" disabled>应用</button>
        <div id="profile-style-current" class="form-hint" style="margin-top:8px;"></div>
      </div>

      <div class="form-card">
        <h3>角色配置</h3>
        <p class="form-hint">选择角色行为模式</p>
        <div class="form-group">
          <select id="profile-role" class="form-input" aria-label="角色模式">
            <option value="auto">auto (自动)</option>
            <option value="default">default (默认)</option>
            <option value="comfort">comfort (安慰)</option>
            <option value="playful">playful (活泼)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="profile-role-apply" disabled>应用</button>
        <div id="profile-role-current" class="form-hint" style="margin-top:8px;"></div>
      </div>
    </div>
    <div id="profile-pending-state" class="form-hint" style="margin-top:10px;"></div>
  `;

  const styleSelect = container.querySelector('#profile-style');
  const roleSelect = container.querySelector('#profile-role');
  const styleCurrent = container.querySelector('#profile-style-current');
  const roleCurrent = container.querySelector('#profile-role-current');
  const styleApply = container.querySelector('#profile-style-apply');
  const roleApply = container.querySelector('#profile-role-apply');
  const pendingState = container.querySelector('#profile-pending-state');

  let currentStyle = styleSelect.value;
  let currentRole = roleSelect.value;

  function syncDirtyState() {
    const styleDirty = styleSelect.value !== currentStyle;
    const roleDirty = roleSelect.value !== currentRole;

    styleApply.disabled = !styleDirty;
    roleApply.disabled = !roleDirty;

    if (styleDirty && roleDirty) {
      pendingState.textContent = '检测到风格与角色配置均有未应用变更';
      return;
    }
    if (styleDirty) {
      pendingState.textContent = '检测到风格配置有未应用变更';
      return;
    }
    if (roleDirty) {
      pendingState.textContent = '检测到角色配置有未应用变更';
      return;
    }
    pendingState.textContent = '当前配置与服务端已同步';
  }

  async function loadProfiles({ showSuccessToast = false } = {}) {
    const [styleResult, roleResult] = await Promise.allSettled([
      api.getStyleProfile(),
      api.getRoleProfile(),
    ]);

    const errors = [];
    if (styleResult.status === 'fulfilled' && styleResult.value?.style) {
      currentStyle = styleResult.value.style;
      styleSelect.value = currentStyle;
      styleCurrent.textContent = `当前: ${currentStyle}`;
    } else if (styleResult.status === 'rejected') {
      errors.push(styleResult.reason?.message || '风格配置加载失败');
    }

    if (roleResult.status === 'fulfilled' && roleResult.value?.role) {
      currentRole = roleResult.value.role;
      roleSelect.value = currentRole;
      roleCurrent.textContent = `当前: ${currentRole}`;
    } else if (roleResult.status === 'rejected') {
      errors.push(roleResult.reason?.message || '角色配置加载失败');
    }

    syncDirtyState();
    if (errors.length > 0) {
      showToast(`加载配置失败: ${errors.join('；')}`, 'error');
      return;
    }
    if (showSuccessToast) {
      showToast('已从服务端刷新配置', 'success');
    }
  }

  styleSelect.addEventListener('change', syncDirtyState);
  roleSelect.addEventListener('change', syncDirtyState);

  styleApply.addEventListener('click', async () => {
    const style = styleSelect.value;
    if (style === currentStyle) {
      showToast('风格未发生变化，无需应用', 'warning');
      return;
    }
    try {
      await api.setStyleProfile(style);
      currentStyle = style;
      styleCurrent.textContent = `当前: ${style}`;
      syncDirtyState();
      showToast('风格已更新', 'success');
    } catch (err) {
      showToast(`更新失败: ${err.message}`, 'error');
      syncDirtyState();
    }
  });

  roleApply.addEventListener('click', async () => {
    const role = roleSelect.value;
    if (role === currentRole) {
      showToast('角色配置未发生变化，无需应用', 'warning');
      return;
    }
    try {
      await api.setRoleProfile(role);
      currentRole = role;
      roleCurrent.textContent = `当前: ${role}`;
      syncDirtyState();
      showToast('角色配置已更新', 'success');
    } catch (err) {
      showToast(`更新失败: ${err.message}`, 'error');
      syncDirtyState();
    }
  });

  container.querySelector('#profile-refresh').addEventListener('click', async () => {
    await loadProfiles({ showSuccessToast: true });
  });

  await loadProfiles({ showSuccessToast: false });
}
