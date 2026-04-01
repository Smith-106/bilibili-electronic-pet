import { createAdminApi } from '../api/admin.js';
import { escapeHtml } from '../utils/format.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header"><h2>风格配置</h2></div>

    <div class="section-grid">
      <div class="form-card">
        <h3>风格配置</h3>
        <p class="form-hint">选择回复生成风格</p>
        <div class="form-group">
          <select id="profile-style" class="form-input">
            <option value="auto">auto (自动)</option>
            <option value="empathy">empathy (共情)</option>
            <option value="meme">meme (热梗)</option>
            <option value="normal">normal (正常)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="profile-style-apply">应用</button>
        <div id="profile-style-current" class="form-hint" style="margin-top:8px;"></div>
      </div>

      <div class="form-card">
        <h3>角色配置</h3>
        <p class="form-hint">选择角色行为模式</p>
        <div class="form-group">
          <select id="profile-role" class="form-input">
            <option value="auto">auto (自动)</option>
            <option value="default">default (默认)</option>
            <option value="comfort">comfort (安慰)</option>
            <option value="playful">playful (活泼)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="profile-role-apply">应用</button>
        <div id="profile-role-current" class="form-hint" style="margin-top:8px;"></div>
      </div>
    </div>
  `;

  async function loadProfiles() {
    try {
      const [styleData, roleData] = await Promise.all([
        api.getStyleProfile().catch(() => null),
        api.getRoleProfile().catch(() => null),
      ]);

      if (styleData?.style) {
        container.querySelector('#profile-style').value = styleData.style;
        container.querySelector('#profile-style-current').textContent = `当前: ${styleData.style}`;
      }
      if (roleData?.role) {
        container.querySelector('#profile-role').value = roleData.role;
        container.querySelector('#profile-role-current').textContent = `当前: ${roleData.role}`;
      }
    } catch (err) {
      showToast(`加载配置失败: ${err.message}`, 'error');
    }
  }

  container.querySelector('#profile-style-apply').addEventListener('click', async () => {
    const style = container.querySelector('#profile-style').value;
    try {
      await api.setStyleProfile(style);
      container.querySelector('#profile-style-current').textContent = `当前: ${style}`;
      showToast('风格已更新', 'success');
    } catch (err) {
      showToast(`更新失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#profile-role-apply').addEventListener('click', async () => {
    const role = container.querySelector('#profile-role').value;
    try {
      await api.setRoleProfile(role);
      container.querySelector('#profile-role-current').textContent = `当前: ${role}`;
      showToast('角色配置已更新', 'success');
    } catch (err) {
      showToast(`更新失败: ${err.message}`, 'error');
    }
  });

  await loadProfiles();
}
