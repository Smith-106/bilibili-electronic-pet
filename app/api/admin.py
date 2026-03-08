from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api.auth import require_api_key
from app.db import get_db
from app.models.entities import KnowledgeEntry, RoleCard
from app.settings import settings

router = APIRouter(tags=["admin"], dependencies=[Depends(require_api_key)])


@router.get("/admin", response_class=HTMLResponse)
def admin_page():
    html = """
<!doctype html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>Bili Pet Admin</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1020;
      --bg-elevated: #121a2e;
      --panel: #141f36;
      --text: #e5ecff;
      --muted: #9fb0d8;
      --line: #243456;
      --line-strong: #315089;
      --primary: #5b8cff;
      --primary-hover: #729dff;
      --success: #26c281;
      --warning: #f8b84e;
      --danger: #ff6f7d;
      --shadow: 0 14px 30px rgba(2, 8, 24, 0.35);
      --radius: 14px;
      --focus: 0 0 0 2px rgba(91, 140, 255, 0.45);
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      font-family: var(--sans);
      margin: 0;
      background: radial-gradient(circle at top right, #16284a 0%, var(--bg) 44%);
      color: var(--text);
      min-height: 100vh;
      padding: 20px;
      line-height: 1.5;
    }

    h1 { margin: 0 0 6px; font-size: 30px; }
    .page-subtitle { margin: 0 0 14px; color: var(--muted); font-size: 14px; }

    .shell {
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(20, 31, 54, 0.94), rgba(16, 26, 44, 0.95));
      border-radius: 18px;
      padding: 16px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
      margin-bottom: 14px;
    }

    .toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
    .quick-nav { margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 8px; }

    .quick-nav a {
      text-decoration: none;
      color: #cfe0ff;
      border: 1px solid #314e85;
      background: rgba(91, 140, 255, 0.14);
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 13px;
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      transition: background-color 160ms ease, border-color 160ms ease;
    }

    .quick-nav a:hover,
    .quick-nav a:focus-visible {
      background: rgba(91, 140, 255, 0.25);
      border-color: #4f79c9;
      outline: none;
    }

    .panel {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: 14px;
      box-shadow: inset 0 1px 0 rgba(158, 180, 230, 0.06);
    }

    .section-title { margin: 16px 0 10px; font-size: 17px; color: #dbe7ff; }
    label { color: var(--muted); font-size: 13px; }

    input, button, select, textarea {
      border-radius: 10px;
      border: 1px solid var(--line-strong);
      background: #0f1a30;
      color: var(--text);
      min-height: 36px;
      padding: 6px 10px;
      font-size: 13px;
    }

    textarea { width: 100%; min-height: 90px; resize: vertical; line-height: 1.45; }

    button {
      background: linear-gradient(180deg, #355da8, #2f4f8e);
      border-color: #496ebb;
      cursor: pointer;
      font-weight: 600;
      transition: transform 150ms ease, filter 150ms ease;
    }

    button:hover:not(:disabled) { filter: brightness(1.06); }
    button:active:not(:disabled) { transform: translateY(1px); }
    button:disabled { cursor: not-allowed; opacity: 0.62; filter: grayscale(0.25); }

    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    button:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    table {
      border-collapse: separate;
      border-spacing: 0;
      width: 100%;
      font-size: 13px;
      background: #0f1a2e;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }

    th, td {
      border-bottom: 1px solid #1f2e4d;
      padding: 8px;
      vertical-align: top;
      word-break: break-word;
    }

    th {
      background: #12203a;
      color: #c5d7ff;
      text-align: left;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    tr:last-child td { border-bottom: 0; }

    .mono { font-family: var(--mono); }
    .comment-box { max-width: 420px; white-space: pre-wrap; word-break: break-word; line-height: 1.4; }

    .section-title { margin: 18px 0 10px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 14px; }

    .card {
      border: 1px solid #30446c;
      border-radius: 12px;
      padding: 10px;
      background: linear-gradient(180deg, rgba(37, 54, 89, 0.44), rgba(18, 32, 57, 0.62));
    }

    .card-title { font-size: 12px; color: #b6c7ed; margin-bottom: 6px; }
    .card-value { font-size: 24px; font-weight: 700; }

    .help-panel {
      display: none;
      border: 1px dashed #45639d;
      background: rgba(18, 31, 54, 0.92);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .help-panel ul { margin: 6px 0 0 18px; }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      border: 1px solid transparent;
    }

    .status-badge-published { background: rgba(38, 194, 129, 0.2); color: #a4f0cf; border-color: rgba(38, 194, 129, 0.45); }
    .status-badge-manual { background: rgba(248, 184, 78, 0.2); color: #ffd79a; border-color: rgba(248, 184, 78, 0.45); }
    .status-badge-blocked { background: rgba(255, 111, 125, 0.2); color: #ffc2ca; border-color: rgba(255, 111, 125, 0.45); }
    .status-badge-neutral { background: rgba(145, 163, 200, 0.16); color: #d4def4; border-color: rgba(145, 163, 200, 0.35); }

    .status-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 10px;
      border: 1px solid #2f4674;
      background: #12203a;
      font-size: 12px;
      min-height: 36px;
    }

    .status-idle { color: #c7dafd; }
    .status-loading { background: rgba(91, 140, 255, 0.2); color: #cfe0ff; border-color: #4f79c9; }
    .status-success { background: rgba(38, 194, 129, 0.2); color: #aff1d4; border-color: rgba(38, 194, 129, 0.55); }
    .status-error { background: rgba(255, 111, 125, 0.2); color: #ffc9cf; border-color: rgba(255, 111, 125, 0.55); }
    .status-partial { background: rgba(248, 184, 78, 0.2); color: #ffe1ab; border-color: rgba(248, 184, 78, 0.55); }

    .mode-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 10px;
      border: 1px solid #3c5e9c;
      background: rgba(91, 140, 255, 0.14);
      color: #d9e6ff;
      font-size: 12px;
      min-height: 28px;
    }

    .mode-chip-active {
      border-color: rgba(38, 194, 129, 0.58);
      background: rgba(38, 194, 129, 0.17);
      color: #b7f3d6;
      font-weight: 600;
    }

    .mode-note {
      color: #b7c8ee;
      font-size: 12px;
    }

    .mode-note code {
      font-family: var(--mono);
      font-size: 12px;
      background: rgba(16, 27, 50, 0.7);
      border: 1px solid #2d426d;
      border-radius: 6px;
      padding: 2px 6px;
      color: #d9e8ff;
    }

    .table-wrap { overflow-x: auto; border-radius: 12px; }


    .toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: min(640px, calc(100vw - 32px));
      max-height: min(62vh, 520px);
      overflow: auto;
      background: #111c31;
      color: #eaf0ff;
      border: 1px solid #345184;
      border-radius: 12px;
      box-shadow: var(--shadow);
      padding: 12px;
      display: none;
      z-index: 9999;
    }

    .toast.show { display: block; }
    .toast-info { border-color: #3e5f9c; }
    .toast-success { border-color: rgba(38, 194, 129, 0.7); }
    .toast-error { border-color: rgba(255, 111, 125, 0.75); }
    .toast-title { font-weight: 600; margin-bottom: 6px; }
    .toast pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.4; }
    .toast-actions { display: flex; gap: 8px; margin-top: 8px; }
    .toast-btn { background: #1f2937; color: #f9fafb; border: 1px solid #374151; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px; }
    .toast-btn:hover { background: #374151; }

    @media (max-width: 900px) {
      body { padding: 12px; }
      .shell { padding: 12px; }
      h1 { font-size: 25px; }
      .card-value { font-size: 22px; }
      th, td { padding: 7px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <h1>Bili Pet 管理页</h1>
    <p class="page-subtitle">统一工作台：系统概览、角色卡、知识库、任务队列、发布网关与审计全链路可视化。</p>

    <div class="quick-nav mono">
      <a href="#section-overview">系统概览</a>
      <a href="#section-role-cards">角色卡</a>
      <a href="#section-knowledge">知识库</a>
      <a href="#section-daily">趋势</a>
      <a href="#section-jobs">任务</a>
      <a href="#section-gateway">发布网关</a>
      <a href="#section-audit">审计</a>
    </div>

    <div class="toolbar" id="publisher-mode-toolbar">
      <span class="mode-chip" id="mode-chip-manual">manual_queue</span>
      <span class="mode-chip" id="mode-chip-simulated">simulated</span>
      <span class="mode-chip" id="mode-chip-webhook">webhook</span>
      <span class="mode-chip" id="mode-chip-real-publish">real_publish</span>
      <span id="publisher-mode-current" class="mono">当前发布模式: -</span>
      <span class="mode-note">推荐稳态路径：<code>manual_queue / simulated</code></span>
    </div>

    <div class="toolbar">
      <label><input id="auto-refresh" type="checkbox" onchange="toggleAutoRefresh()" /> 自动刷新</label>
      <input id="auto-refresh-seconds" type="number" min="3" max="300" value="15" onchange="onAutoRefreshSecondsChange()" />
      <button id="full-refresh-btn" onclick="queueFullRefresh()">立即全量刷新</button>
      <select id="style-profile-select">
        <option value="auto">auto</option>
        <option value="empathy">empathy</option>
        <option value="meme">meme</option>
        <option value="normal">normal</option>
      </select>
      <button id="style-profile-apply-btn" onclick="applyStyleProfile()">应用风格</button>
      <button id="style-profile-refresh-btn" onclick="refreshStyleProfile()">读取风格</button>
      <span id="style-profile-current" class="mono">风格: -</span>
      <select id="role-profile-select">
        <option value="auto">auto</option>
        <option value="default">default</option>
        <option value="comfort">comfort</option>
        <option value="playful">playful</option>
      </select>
      <button id="role-profile-apply-btn" onclick="applyRoleProfile()">应用角色卡</button>
      <button id="role-profile-refresh-btn" onclick="refreshRoleProfile()">读取角色卡</button>
      <span id="role-profile-current" class="mono">角色卡: -</span>
      <button onclick="toggleHelpPanel()">帮助 (?)</button>
      <button id="prefs-reset-btn" onclick="resetUiPrefs()">重置偏好</button>
      <button id="prefs-export-btn" onclick="exportUiPrefs()">导出偏好</button>
      <button id="prefs-import-btn" onclick="triggerImportUiPrefs()">导入偏好</button>
      <input id="ui-prefs-file" type="file" accept="application/json" style="display:none;" onchange="importUiPrefsFromFile(event)" />
      <span id="refresh-status" class="mono status-pill status-idle" onclick="showRefreshErrorDetail()" style="cursor:pointer;" title="点击查看详细错误（仅在失败/部分失败时有内容）">状态: 未刷新</span>
    </div>

    <div id="help-panel" class="help-panel">
      <strong>操作说明</strong>
      <ul>
        <li><span class="mono">r</span>：全量刷新（输入框聚焦时不触发）</li>
        <li><span class="mono">?</span>：显示/隐藏本面板</li>
        <li><span class="mono">Esc</span>：关闭帮助面板/关闭提示框</li>
        <li>状态标签为“部分失败”时，表示仅部分模块刷新失败，可点击状态查看详情</li>
        <li>自动刷新开启后会锁定秒数输入框</li>
        <li>秒数输入框按回车：触发全量刷新（仅自动刷新关闭时）</li>
        <li>支持偏好导入/导出 JSON，导入时自动做版本兼容迁移</li>
      </ul>
      <div style="margin-top:8px;">
        <div style="margin-bottom:6px;"><strong>当前偏好快照</strong></div>
        <pre id="prefs-snapshot" class="mono" style="background:#0f1a2f; color:#d7e4ff; padding:8px; border:1px solid #2a406d; overflow:auto;">{}</pre>
      </div>
      <div style="margin-top:8px;"><button onclick="toggleHelpPanel()">关闭</button></div>
    </div>
  </div>


  <h2 id="section-overview" class="section-title">系统概览</h2>
  <div class="cards">
    <div class="card"><div class="card-title">评论总数</div><div id="card-comments" class="card-value">-</div></div>
    <div class="card"><div class="card-title">任务总数</div><div id="card-jobs" class="card-value">-</div></div>
    <div class="card"><div class="card-title">已发布</div><div id="card-published" class="card-value">-</div></div>
    <div class="card"><div class="card-title">待人工处理</div><div id="card-manual" class="card-value">-</div></div>
  </div>

  <h2 id="section-role-cards" class="section-title">角色卡工作台</h2>
  <div class="panel">
    <div class="toolbar">
      <button id="role-cards-refresh-btn" onclick="refreshRoleCards()">刷新角色卡</button>
      <button id="role-card-new-btn" onclick="newRoleCardDraft()">新建角色卡</button>
      <button id="role-card-clone-btn" onclick="cloneRoleCard()">复制当前</button>
      <button id="role-card-save-btn" onclick="saveRoleCard()">保存角色卡</button>
      <button id="role-card-disable-btn" onclick="disableRoleCard()">禁用当前</button>
      <button id="role-card-activate-btn" onclick="activateRoleCard()">激活当前</button>
      <span id="active-role-card-current" class="mono">激活角色卡: -</span>
      <span class="mono">兼容档位请继续使用上方“应用角色卡(旧)”。</span>
    </div>
    <div class="toolbar">
      <label class="mono">列表</label>
      <select id="role-card-select"></select>
      <label class="mono">key</label>
      <input id="role-card-key" type="text" placeholder="comfort_plus" />
      <label class="mono">name</label>
      <input id="role-card-name" type="text" placeholder="安抚陪伴增强" />
      <label><input id="role-card-enabled" type="checkbox" checked /> enabled</label>
    </div>
    <div class="toolbar" style="align-items:flex-start;">
      <div style="flex:1; min-width:280px;">
        <div class="mono" style="margin-bottom:4px;">description</div>
        <textarea id="role-card-description" style="height:70px;"></textarea>
      </div>
      <div style="flex:2; min-width:320px;">
        <div class="mono" style="margin-bottom:4px;">system_prompt</div>
        <textarea id="role-card-system-prompt" style="height:120px;"></textarea>
      </div>
    </div>
    <div class="toolbar" style="align-items:flex-start;">
      <div style="flex:1; min-width:280px;">
        <div class="mono" style="margin-bottom:4px;">tone (JSON)</div>
        <textarea id="role-card-tone" style="height:90px;">{}</textarea>
      </div>
      <div style="flex:1; min-width:280px;">
        <div class="mono" style="margin-bottom:4px;">constraints (JSON)</div>
        <textarea id="role-card-constraints" style="height:90px;">{}</textarea>
      </div>
    </div>
  </div>

  <h2 id="section-knowledge" class="section-title">知识库管理</h2>
  <div class="panel">
    <div class="toolbar">
      <button id="knowledge-refresh-btn" onclick="refreshKnowledgeEntries()">刷新知识库</button>
      <input id="knowledge-category" type="text" placeholder="分类，如 safety" />
      <input id="knowledge-title" type="text" placeholder="标题" />
      <button id="knowledge-create-btn" onclick="createKnowledgeEntry()">新增知识条目</button>
    </div>
    <div class="toolbar" style="align-items:flex-start;">
      <div style="flex:1; min-width:320px;">
        <div class="mono" style="margin-bottom:4px;">content</div>
        <textarea id="knowledge-content" style="height:90px;"></textarea>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>category</th><th>title</th><th>enabled</th><th>content</th><th>updated_at</th><th>操作</th>
          </tr>
        </thead>
        <tbody id="knowledge-entries"></tbody>
      </table>
    </div>
  </div>

  <h2 id="section-daily" class="section-title">近 7 天趋势</h2>
  <div class=\"toolbar\">
    <input id=\"daily-days\" type=\"number\" min=\"1\" max=\"60\" value=\"7\" />
    <label><input id=\"daily-simple\" type=\"checkbox\" onchange=\"onDailySimpleChange()\" /> 简版视图</label>
    <button id=\"daily-refresh-btn\" onclick=\"refreshDailyMetrics()\">刷新趋势</button>
  </div>

  <div class=\"table-wrap\">
    <table>
      <thead>
        <tr id="daily-head-full">
          <th>日期</th><th>总量</th><th>published</th><th>manual_queue</th><th>blocked</th><th>dedupe_skipped</th><th>skipped</th>
        </tr>
        <tr id="daily-head-simple" style="display:none;">
          <th>日期</th><th>published</th><th>manual_queue</th>
        </tr>
      </thead>
      <tbody id=\"daily-metrics\"></tbody>
    </table>
  </div>

  <h2 id=\"section-jobs\" class=\"section-title\">任务列表</h2>
  <div class=\"toolbar\">
    <select id=\"status\">
      <option value=\"\">全部状态</option>
      <option value=\"manual_queue\">manual_queue</option>
      <option value=\"blocked\">blocked</option>
      <option value=\"dedupe_skipped\">dedupe_skipped</option>
      <option value=\"published\">published</option>
      <option value=\"skipped\">skipped</option>
    </select>
    <input id=\"limit\" type=\"number\" min=\"1\" max=\"200\" value=\"30\" />
    <button id=\"jobs-refresh-btn\" onclick=\"refreshJobs()\">刷新</button>
    <button id=\"batch-approve-btn\" onclick=\"batchApprove()\" disabled>批量 Approve</button>
    <button id=\"batch-retry-btn\" onclick=\"batchRetry()\" disabled>批量 Retry</button>
    <span id=\"batch-selected-count\" class=\"mono\">已选 0</span>
    <button id=\"jobs-export-btn\" onclick=\"exportCsv()\">导出 CSV</button>
  </div>

  <div class=\"table-wrap\">
    <table>
      <thead>
        <tr>
          <th><input id=\"job-check-all\" type=\"checkbox\" onchange=\"toggleAllJobChecks(this.checked)\" title=\"全选/取消全选\" /> 选中</th><th>ID</th><th>状态</th><th>comment_id</th><th>原评论</th><th>回复内容</th><th>风险信息</th><th>操作</th>
        </tr>
      </thead>
      <tbody id=\"jobs\"></tbody>
    </table>
  </div>

  <h2 id=\"section-single-diagnostics\" class=\"section-title\">单项诊断 / 操作</h2>
  <div class=\"panel\">
    <div class=\"toolbar\">
      <input id=\"comment-detail-id\" type=\"text\" placeholder=\"comment_id\" />
      <button id=\"comment-detail-query-btn\" onclick=\"queryCommentDetail()\">查询评论详情</button>
      <button id=\"comment-detail-clear-btn\" onclick=\"clearCommentDetailResult()\">清空</button>
      <span class=\"mono\">GET /api/comments/{comment_id}</span>
    </div>
    <div id=\"comment-detail-result\" class=\"mono\">未查询评论详情</div>
    <div id=\"comment-detail-meta\" class=\"mono\">上次查询: -</div>

    <div class=\"toolbar\" style=\"margin-top:12px;\">
      <input id=\"job-detail-id\" type=\"number\" min=\"1\" placeholder=\"job_id\" />
      <button id=\"job-detail-query-btn\" onclick=\"queryJobDetail()\">查询任务详情</button>
      <button id=\"job-detail-clear-btn\" onclick=\"clearJobDetailResult()\">清空</button>
      <span class=\"mono\">GET /api/jobs/{job_id}</span>
    </div>
    <div id=\"job-detail-result\" class=\"mono\">未查询任务详情</div>
    <div id=\"job-detail-meta\" class=\"mono\">上次查询: -</div>

    <div class=\"toolbar\" style=\"margin-top:12px;\">
      <input id=\"single-retry-job-id\" type=\"number\" min=\"1\" placeholder=\"job_id\" />
      <label><input id=\"single-retry-force-long\" type=\"checkbox\" /> force_long</label>
      <label><input id=\"single-retry-auto-reset-force\" type=\"checkbox\" checked /> 成功后重置 force_long</label>
      <button id=\"single-retry-btn\" onclick=\"retrySingleJob()\">单任务重试</button>
      <span class=\"mono\">POST /api/jobs/{job_id}/retry</span>
    </div>
  </div>

  <h2 id=\"section-gateway\" class=\"section-title\">发布网关日志</h2>
  <div class=\"panel\">
    <div class=\"toolbar\" style=\"align-items:flex-start;\">
      <input id=\"gateway-publish-comment-id\" type=\"text\" placeholder=\"comment_id\" />
      <input id=\"gateway-publish-source\" type=\"text\" placeholder=\"source (默认 bili-pet-bot)\" />
      <label><input id=\"gateway-publish-force\" type=\"checkbox\" /> force_publish</label>
      <button id=\"gateway-publish-btn\" onclick=\"publishGatewayReply()\">手动发布一条</button>
    </div>
    <div class=\"toolbar\" style=\"align-items:flex-start;\">
      <div style=\"flex:1; min-width:320px;\">
        <div class=\"mono\" style=\"margin-bottom:4px;\">reply_text</div>
        <textarea id=\"gateway-publish-reply\" style=\"height:90px;\" placeholder=\"输入要发布的回复内容\"></textarea>
      </div>
    </div>
    <div class=\"toolbar\">
      <input id=\"gateway-comment-id\" type=\"text\" placeholder=\"comment_id (可选)\" />
      <input id=\"gateway-limit\" type=\"number\" min=\"1\" max=\"200\" value=\"50\" />
      <button id=\"gateway-refresh-btn\" onclick=\"refreshGatewayLogs()\">刷新网关日志</button>
    </div>
    <div class=\"table-wrap\">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>comment_id</th><th>source</th><th>reply_hash</th><th>created_at</th>
          </tr>
        </thead>
        <tbody id=\"gateway-logs\"></tbody>
      </table>
    </div>
  </div>

  <h2 id=\"section-audit\" class=\"section-title\">审计日志</h2>
  <div class=\"toolbar\">
    <select id=\"audit-action\">
      <option value=\"\">全部操作</option>
      <option value=\"approve_single\">approve_single</option>
      <option value=\"approve_batch\">approve_batch</option>
      <option value=\"retry_single\">retry_single</option>
      <option value=\"retry_batch\">retry_batch</option>
    </select>
    <select id=\"audit-ok\">
      <option value=\"\">全部结果</option>
      <option value=\"true\">成功</option>
      <option value=\"false\">失败</option>
    </select>
    <input id=\"audit-limit\" type=\"number\" min=\"1\" max=\"1000\" value=\"100\" />
    <button id=\"audit-refresh-btn\" onclick=\"refreshAuditLogs()\">刷新日志</button>
    <button id=\"audit-export-btn\" onclick=\"exportAuditCsv()\">导出日志 CSV</button>
    <input id=\"audit-summary-days\" type=\"number\" min=\"1\" max=\"90\" value=\"7\" />
    <button id=\"audit-summary-refresh-btn\" onclick=\"refreshAuditSummary()\">刷新审计摘要</button>
  </div>

  <div class=\"cards\">
    <div class=\"card\"><div class=\"card-title\">审计总量</div><div id=\"card-audit-total\" class=\"card-value\">-</div></div>
    <div class=\"card\"><div class=\"card-title\">成功数</div><div id=\"card-audit-ok\" class=\"card-value\">-</div></div>
    <div class=\"card\"><div class=\"card-title\">失败数</div><div id=\"card-audit-failed\" class=\"card-value\">-</div></div>
    <div class=\"card\"><div class=\"card-title\">最高频 action</div><div id=\"card-audit-top-action\" class=\"card-value mono\" style=\"font-size:14px;\">-</div></div>
  </div>

  <div class=\"table-wrap\">
    <table>
      <thead>
        <tr>
          <th>ID</th><th>action</th><th>ok</th><th>target_id</th><th>payload</th><th>created_at</th>
        </tr>
      </thead>
      <tbody id=\"audit-logs\"></tbody>
    </table>
  </div>

  <div id="toast" class="toast" onclick="hideToast()" onmouseenter="pauseToastAutoHide()" onmouseleave="resumeToastAutoHide()">
    <div id="toast-title" class="toast-title">提示</div>
    <pre id="toast-content" class="mono"></pre>
    <div class="toast-actions">
      <button id="toast-copy" class="toast-btn" onclick="copyToastContent(event)" style="display:none;">复制详情</button>
      <button class="toast-btn" onclick="hideToast(event)">关闭</button>
    </div>
  </div>

<script>
function canApprove(status) {
  return ['manual_queue', 'blocked', 'dedupe_skipped'].includes(status);
}

function getApiKey() {
  const params = new URLSearchParams(window.location.search);
  return params.get('api_key') || '';
}

function withApiKey(path) {
  const key = getApiKey();
  if (!key) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}api_key=${encodeURIComponent(key)}`;
}

let autoRefreshTimer = null;
let fullRefreshRunning = false;
let pendingFullRefresh = false;
let selectedJobIdSet = new Set();
let singleApproveRunning = false;
let singleRetryRunning = false;
let batchApproveRunning = false;
let batchRetryRunning = false;
let lastRefreshErrorDetail = '';
let lastBusyToastAt = 0;
let toastHideDeadline = 0;
const TOAST_HIDE_MS = 4500;
const PREF_KEY = 'bili_pet_admin_ui_prefs_v1';
const PREF_VERSION = 1;
const PUBLISHER_MODE = '__PUBLISHER_MODE__';
let roleCardItems = [];
let roleCardCurrentKey = '';

function normalizePrefs(raw) {
  const parsed = raw && typeof raw === 'object' ? raw : {};

  return {
    version: PREF_VERSION,
    autoRefreshEnabled: !!parsed.autoRefreshEnabled,
    autoRefreshSeconds: getAutoRefreshSeconds(parsed.autoRefreshSeconds),
    dailySimple: !!parsed.dailySimple,
    singleRetryAutoResetForce: parsed.singleRetryAutoResetForce !== false,
  };
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return normalizePrefs({});
    return normalizePrefs(JSON.parse(raw) || {});
  } catch (error) {
    return normalizePrefs({});
  }
}

function savePrefs(partial) {
  const current = loadPrefs();
  const next = normalizePrefs({ ...current, ...partial, version: PREF_VERSION });
  localStorage.setItem(PREF_KEY, JSON.stringify(next));
  renderPrefsSnapshot(next);
}

function renderPrefsSnapshot(prefs) {
  if (!prefsSnapshotEl) return;
  prefsSnapshotEl.textContent = JSON.stringify(prefs || loadPrefs(), null, 2);
}

function resetUiPrefs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  stopAutoRefresh();
  localStorage.removeItem(PREF_KEY);

  const defaults = loadPrefs();
  if (autoRefreshInput) autoRefreshInput.checked = !!defaults.autoRefreshEnabled;
  if (autoRefreshSecondsInput) {
    autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(defaults.autoRefreshSeconds));
    autoRefreshSecondsInput.disabled = !!defaults.autoRefreshEnabled;
  }
  if (dailySimpleInput) dailySimpleInput.checked = !!defaults.dailySimple;
  if (singleRetryAutoResetForceInput) singleRetryAutoResetForceInput.checked = defaults.singleRetryAutoResetForce !== false;
  renderPrefsSnapshot(defaults);

  queueFullRefresh();
}

function exportUiPrefs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const blob = new Blob([JSON.stringify(loadPrefs(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bili-pet-admin-prefs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerImportUiPrefs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  if (uiPrefsFileInput) uiPrefsFileInput.value = '';
  uiPrefsFileInput?.click();
}

function importUiPrefsFromFile(event) {
  const input = event?.target ?? uiPrefsFileInput;
  const resetInput = () => {
    if (input) input.value = '';
  };
  if (isGlobalRefreshLocked()) {
    resetInput();
    showBusyToast();
    return;
  }
  const file = input?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (isGlobalRefreshLocked()) {
      resetInput();
      showBusyToast();
      return;
    }
    try {
      const raw = String(reader.result || '{}');
      const parsed = JSON.parse(raw);
      const merged = normalizePrefs(parsed);
      localStorage.setItem(PREF_KEY, JSON.stringify(merged));
      resetInput();
      window.location.reload();
    } catch (error) {
      showToast('导入偏好失败', 'JSON 无效或格式不正确');
      resetInput();
    }
  };
  reader.onerror = () => {
    showToast('导入偏好失败', '读取文件失败');
    resetInput();
  };
  reader.readAsText(file);
}

function setRefreshStatus(text, tone = 'idle') {
  if (!refreshStatusEl) return;
  refreshStatusEl.textContent = text;
  refreshStatusEl.classList.remove('status-idle', 'status-loading', 'status-success', 'status-error', 'status-partial');
  if (tone === 'loading') {
    refreshStatusEl.classList.add('status-loading');
  } else if (tone === 'success') {
    refreshStatusEl.classList.add('status-success');
  } else if (tone === 'error') {
    refreshStatusEl.classList.add('status-error');
  } else if (tone === 'partial') {
    refreshStatusEl.classList.add('status-partial');
  } else {
    refreshStatusEl.classList.add('status-idle');
  }
}

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function markDetailQueryTime(metaEl, prefix = '上次查询') {
  if (!metaEl) return;
  metaEl.textContent = `${prefix}: ${nowLabel()}`;
}

function markDetailQueryError(metaEl, reason) {
  if (!metaEl) return;
  const text = String(reason || '请求失败').trim();
  metaEl.textContent = `上次失败: ${nowLabel()} (${text.slice(0, 120)})`;
}

function getErrorText(error, fallback = '请求失败') {
  if (!error) return fallback;
  if (typeof error === 'string') return error || fallback;
  if (typeof error === 'object') {
    const detail = error.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') return JSON.stringify(detail, null, 2);
    if (typeof error.message === 'string') return error.message;
  }
  return String(error) || fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderStatusBadge(status) {
  const value = String(status || 'unknown');
  let cls = 'status-badge status-badge-neutral';
  if (value === 'published') {
    cls = 'status-badge status-badge-published';
  } else if (value === 'manual_queue' || value === 'dedupe_skipped') {
    cls = 'status-badge status-badge-manual';
  } else if (value === 'blocked') {
    cls = 'status-badge status-badge-blocked';
  }
  return `<span class="${cls}">${escapeHtml(value)}</span>`;
}

function safeCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '0';
}

function safeCountNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getClampedInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getAutoRefreshSeconds(value) {
  return getClampedInt(value, 3, 300, 15);
}

function applyPublisherModeStatus(mode) {
  const normalized = String(mode || '').trim();
  if (publisherModeCurrentEl) {
    publisherModeCurrentEl.textContent = `当前发布模式: ${normalized || '-'}`;
  }

  const chips = [
    modeChipManual,
    modeChipSimulated,
    modeChipWebhook,
    modeChipRealPublish,
  ];
  for (const chip of chips) {
    chip?.classList.remove('mode-chip-active');
  }

  if (normalized === 'manual_queue') {
    modeChipManual?.classList.add('mode-chip-active');
  } else if (normalized === 'simulated') {
    modeChipSimulated?.classList.add('mode-chip-active');
  } else if (normalized === 'webhook') {
    modeChipWebhook?.classList.add('mode-chip-active');
  } else if (normalized === 'real_publish') {
    modeChipRealPublish?.classList.add('mode-chip-active');
  }
}

async function readApiPayload(res) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { ok: false, detail: raw };
  }
}

function getToastToneByTitle(title) {
  const text = String(title || '');
  if (text.includes('失败') || text.includes('错误')) return 'error';
  if (text.includes('成功') || text.includes('完成')) return 'success';
  return 'info';
}

function showToast(title, content, options = {}) {
  if (!toastEl || !toastTitleEl || !toastContentEl || !toastCopyBtn) return;

  const text = content || '';
  toastTitleEl.textContent = title || '提示';
  toastContentEl.textContent = text;
  window.__toastCopyContent = text;
  toastCopyBtn.style.display = options.copyable ? '' : 'none';

  const tone = options.tone || getToastToneByTitle(title);
  toastEl.classList.remove('toast-info', 'toast-success', 'toast-error');
  if (tone === 'success') {
    toastEl.classList.add('toast-success');
  } else if (tone === 'error') {
    toastEl.classList.add('toast-error');
  } else {
    toastEl.classList.add('toast-info');
  }

  toastEl.classList.add('show');

  pauseToastAutoHide();
  const hideAfter = Number(options.durationMs || TOAST_HIDE_MS);
  if (hideAfter > 0) {
    toastHideDeadline = Date.now() + hideAfter;
    window.__toastTimer = setTimeout(hideToast, hideAfter);
  } else {
    toastHideDeadline = 0;
  }
}

function hideToast(event) {
  if (event) event.stopPropagation();
  pauseToastAutoHide();
  toastHideDeadline = 0;
  if (!toastEl) return;
  toastEl.classList.remove('show');
  window.__toastCopyContent = '';
}

function pauseToastAutoHide() {
  if (!window.__toastTimer) return;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = null;
}

function resumeToastAutoHide() {
  if (!toastEl || !toastEl.classList.contains('show')) return;
  if (!toastHideDeadline) return;
  const remaining = toastHideDeadline - Date.now();
  if (remaining <= 0) {
    hideToast();
    return;
  }
  window.__toastTimer = setTimeout(hideToast, remaining);
}

async function copyToastContent(event) {
  event.stopPropagation();
  const text = String(window.__toastCopyContent || '');
  if (!text) {
    showToast('复制失败', '没有可复制的内容');
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('复制成功', '错误详情已复制到剪贴板');
      return;
    }
  } catch (error) {
    // fallback below
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  showToast(ok ? '复制成功' : '复制失败', ok ? '错误详情已复制到剪贴板' : '浏览器不支持复制，请手动复制');
}

function showRefreshErrorDetail() {
  if (!lastRefreshErrorDetail) {
    showToast('刷新详情', '暂无错误详情');
    return;
  }
  showToast('刷新失败详情', lastRefreshErrorDetail, { copyable: true, tone: 'error', durationMs: 0 });
}

function isEditableTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  );
}

function closeHelpPanel() {
  if (!helpPanelEl) return;
  helpPanelEl.style.display = 'none';
}

function toggleHelpPanel() {
  if (!helpPanelEl) return;
  helpPanelEl.style.display = helpPanelEl.style.display === 'none' || !helpPanelEl.style.display ? 'block' : 'none';
}

async function runFullRefresh() {
  if (singleApproveRunning || batchApproveRunning || batchRetryRunning) {
    pendingFullRefresh = true;
    return;
  }
  if (fullRefreshRunning) {
    pendingFullRefresh = true;
    return;
  }

  fullRefreshRunning = true;
  setInlineButtonLoading(fullRefreshBtn, true, '刷新中...');
  updateBatchActionState();
  lastRefreshErrorDetail = '';
  setRefreshStatus('状态: 刷新中...', 'loading');

  const steps = [
    { label: 'overview', run: loadOverview },
    { label: 'role_cards', run: loadRoleCards },
    { label: 'knowledge', run: loadKnowledgeEntries },
    { label: 'gateway_logs', run: loadGatewayLogs },
    { label: 'daily_metrics', run: loadDailyMetrics },
    { label: 'jobs', run: loadJobs },
    { label: 'audit_summary', run: loadAuditSummary },
    { label: 'audit_logs', run: loadAuditLogs },
  ];

  const failures = [];
  try {
    for (const step of steps) {
      try {
        await step.run();
      } catch (error) {
        failures.push({ label: step.label, error: getErrorText(error, 'unknown_error') });
      }
    }

    if (!failures.length) {
      setRefreshStatus(`状态: 成功 @ ${nowLabel()}`, 'success');
      return;
    }

    const summary = failures.map(item => `${item.label}: ${item.error}`).join('\n');
    lastRefreshErrorDetail = summary;
    const tone = failures.length === steps.length ? 'error' : 'partial';
    const prefix = failures.length === steps.length ? '状态: 失败' : '状态: 部分失败';
    setRefreshStatus(`${prefix} @ ${nowLabel()} (${failures.length}/${steps.length})`, tone);
    showToast(prefix, summary, { copyable: true, tone: 'error', durationMs: 0 });
  } finally {
    setInlineButtonLoading(fullRefreshBtn, false);
    fullRefreshRunning = false;
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

function queueFullRefresh(options = {}) {
  const silent = !!options.silent;
  if (!silent && isGlobalRefreshLocked()) updateBatchActionState();
  if (singleApproveRunning) {
    if (!pendingFullRefresh && !silent) {
      setRefreshStatus('状态: 单条审批处理中，刷新已排队', 'loading');
      showToast('刷新已排队', '当前有单条审批正在执行，结束后会自动刷新');
    }
    pendingFullRefresh = true;
    return;
  }
  if (batchApproveRunning || batchRetryRunning) {
    if (!pendingFullRefresh && !silent) {
      setRefreshStatus('状态: 批量处理中，刷新已排队', 'loading');
      showToast('刷新已排队', '当前批量任务执行中，结束后会自动刷新');
    }
    pendingFullRefresh = true;
    return;
  }
  if (fullRefreshRunning) {
    if (!pendingFullRefresh && !silent) {
      setRefreshStatus('状态: 刷新进行中，下一次已排队', 'loading');
      showToast('刷新已排队', '当前正在刷新，完成后会自动再刷新一次');
    }
    pendingFullRefresh = true;
    return;
  }
  runFullRefresh();
}

function stopAutoRefresh() {
  if (!autoRefreshTimer) return;
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}

function onAutoRefreshSecondsChange() {
  if (isGlobalRefreshLocked()) {
    if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(loadPrefs().autoRefreshSeconds));
    showBusyToast();
    return;
  }
  const seconds = getClampedInt(autoRefreshSecondsInput?.value, 3, 300, 15);
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(seconds);
  savePrefs({ autoRefreshSeconds: seconds });

  if (autoRefreshInput?.checked) toggleAutoRefresh();
}

function onDailySimpleChange() {
  if (isGlobalRefreshLocked()) {
    if (dailySimpleInput) dailySimpleInput.checked = !!loadPrefs().dailySimple;
    showBusyToast();
    return;
  }
  savePrefs({ dailySimple: !!dailySimpleInput?.checked });
  refreshDailyMetrics();
}

function onSingleRetryAutoResetForceChange() {
  if (isGlobalRefreshLocked()) {
    if (singleRetryAutoResetForceInput) {
      singleRetryAutoResetForceInput.checked = loadPrefs().singleRetryAutoResetForce !== false;
    }
    showBusyToast();
    return;
  }
  savePrefs({ singleRetryAutoResetForce: !!singleRetryAutoResetForceInput?.checked });
}

function toggleAutoRefresh() {
  if (isGlobalRefreshLocked()) {
    const prefs = loadPrefs();
    if (autoRefreshInput) autoRefreshInput.checked = !!prefs.autoRefreshEnabled;
    if (autoRefreshSecondsInput) {
      autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(prefs.autoRefreshSeconds));
      autoRefreshSecondsInput.disabled = !!prefs.autoRefreshEnabled;
    }
    showBusyToast();
    return;
  }

  const enabled = !!autoRefreshInput?.checked;
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.disabled = enabled;
  savePrefs({ autoRefreshEnabled: enabled });

  stopAutoRefresh();
  if (!enabled) return;

  queueFullRefresh({ silent: true });
  const seconds = getClampedInt(autoRefreshSecondsInput?.value, 3, 300, 15);
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(seconds);
  autoRefreshTimer = setInterval(() => {
    queueFullRefresh({ silent: true });
  }, seconds * 1000);
}

async function loadOverview() {
  const res = await fetch(withApiKey('/api/metrics/overview'));
  const data = await readApiPayload(res);
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载概览失败'));

  const totals = data.totals || {};
  const byStatus = data.by_status || {};
  const manualCount =
    safeCountNumber(byStatus.manual_queue) +
    safeCountNumber(byStatus.blocked) +
    safeCountNumber(byStatus.dedupe_skipped);

  if (cardComments) cardComments.textContent = safeCount(totals.comments);
  if (cardJobs) cardJobs.textContent = safeCount(totals.jobs);
  if (cardPublished) cardPublished.textContent = safeCount(byStatus.published);
  if (cardManual) cardManual.textContent = String(manualCount);
}

function isGlobalRefreshLocked() {
  return fullRefreshRunning || singleApproveRunning || singleRetryRunning || batchApproveRunning || batchRetryRunning;
}

function showBusyToast() {
  updateBatchActionState();
  const now = Date.now();
  if (now - lastBusyToastAt < 1200) return;
  lastBusyToastAt = now;
  showToast('操作进行中', '当前正在执行全量刷新或批量任务，请稍后再试');
}

async function refreshDailyMetrics() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(dailyRefreshBtn, true, '刷新中...');
  try {
    await loadDailyMetrics();
    showToast('趋势刷新完成', '已更新趋势数据', { tone: 'success' });
  } catch (error) {
    showToast('趋势刷新失败', getErrorText(error, '加载趋势失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(dailyRefreshBtn, false);
    updateBatchActionState();
  }
}

async function loadDailyMetrics() {
  const days = getClampedInt(dailyDaysInput?.value, 1, 60, 7);
  if (dailyDaysInput) dailyDaysInput.value = String(days);
  const simple = !!dailySimpleInput?.checked;
  const res = await fetch(withApiKey(`/api/metrics/daily?days=${encodeURIComponent(days)}`));
  const data = await readApiPayload(res);
  if (!dailyMetricsBody) throw new Error('daily_metrics_table_not_found');
  if (dailyHeadFull && dailyHeadSimple) {
    dailyHeadFull.style.display = simple ? 'none' : '';
    dailyHeadSimple.style.display = simple ? '' : 'none';
  }
  dailyMetricsBody.innerHTML = '';

  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载趋势失败'));

  for (const item of (data.items || [])) {
    const tr = document.createElement('tr');
    if (simple) {
      tr.innerHTML = `
        <td class=\"mono\">${escapeHtml(item.date)}</td>
        <td>${safeCount(item.published)}</td>
        <td>${safeCount(item.manual_queue)}</td>
      `;
    } else {
      tr.innerHTML = `
        <td class=\"mono\">${escapeHtml(item.date)}</td>
        <td>${safeCount(item.total)}</td>
        <td>${safeCount(item.published)}</td>
        <td>${safeCount(item.manual_queue)}</td>
        <td>${safeCount(item.blocked)}</td>
        <td>${safeCount(item.dedupe_skipped)}</td>
        <td>${safeCount(item.skipped)}</td>
      `;
    }
    dailyMetricsBody.appendChild(tr);
  }
}

async function refreshJobs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(jobsRefreshBtn, true, '刷新中...');
  try {
    await loadJobs();
    showToast('任务刷新完成', '已更新任务列表', { tone: 'success' });
  } catch (error) {
    showToast('任务刷新失败', getErrorText(error, '加载任务失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(jobsRefreshBtn, false);
    updateBatchActionState();
  }
}

async function loadJobs() {
  const status = jobsStatusInput?.value || '';
  const limit = getClampedInt(jobsLimitInput?.value, 1, 200, 30);
  if (jobsLimitInput) jobsLimitInput.value = String(limit);
  const qs = new URLSearchParams({ limit: String(limit) });
  if (status) qs.set('status', status);
  const res = await fetch(withApiKey('/api/jobs?' + qs.toString()));
  const data = await readApiPayload(res);
  if (!jobsTableBody) throw new Error('jobs_table_not_found');
  jobsTableBody.innerHTML = '';
  if (jobsCheckAll) {
    jobsCheckAll.checked = false;
    jobsCheckAll.indeterminate = false;
  }

  if (!res.ok || !data.ok) {
    selectedJobIdSet = new Set();
    updateBatchActionState();
    throw new Error(getErrorText(data, '加载任务失败'));
  }

  const visibleJobIds = new Set();
  const locked = isGlobalRefreshLocked();
  for (const item of (data.items || [])) {
    const jobId = Number(item.id);
    if (!Number.isFinite(jobId)) continue;
    visibleJobIds.add(jobId);
    const tr = document.createElement('tr');
    const allow = canApprove(item.status);
    tr.innerHTML = `
      <td><input type=\"checkbox\" class=\"job-check\" value=\"${jobId}\" ${selectedJobIdSet.has(jobId) ? 'checked' : ''}></td>
      <td class=\"mono\">${jobId}</td>
      <td>${renderStatusBadge(item.status)}</td>
      <td class=\"mono\">${escapeHtml(item.comment_id)}</td>
      <td class=\"comment-box\">${escapeHtml(item.comment_content)}</td>
      <td><textarea id=\"reply-${jobId}\" ${locked ? 'disabled' : ''}>${escapeHtml(item.reply_text)}</textarea></td>
      <td class=\"mono\">${escapeHtml(JSON.stringify(item.risk_flags || {}))}</td>
      <td>${allow ? `<button class=\"approve-btn\" onclick=\"approveJob(${jobId}, this)\" ${locked ? 'disabled' : ''}>Approve</button>` : '-'}</td>
    `;
    jobsTableBody.appendChild(tr);
  }

  selectedJobIdSet = new Set(Array.from(selectedJobIdSet).filter(id => visibleJobIds.has(id)));

  jobsTableBody.querySelectorAll('.job-check').forEach((el) => {
    el.addEventListener('change', onJobCheckChanged);
  });
  updateBatchActionState();
}

function quickQueryCommentFromResult(commentId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const value = String(commentId || '').trim();
  if (!value) return;
  if (commentDetailIdInput) commentDetailIdInput.value = value;
  queryCommentDetail();
}

function quickQueryJobFromResult(jobId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const value = Number(jobId);
  if (!Number.isFinite(value) || value <= 0) return;
  if (jobDetailIdInput) jobDetailIdInput.value = String(value);
  if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(value);
  queryJobDetail();
}

function retryJobFromDetail(jobId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const value = Number(jobId);
  if (!Number.isFinite(value) || value <= 0) return;
  if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(value);
  if (jobDetailIdInput) jobDetailIdInput.value = String(value);
  retrySingleJob();
}

function clearCommentDetailResult() {
  if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
  if (commentDetailMetaEl) commentDetailMetaEl.textContent = '上次查询: -';
  if (commentDetailIdInput) commentDetailIdInput.value = '';
}

function clearJobDetailResult() {
  if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
  if (jobDetailMetaEl) jobDetailMetaEl.textContent = '上次查询: -';
  if (jobDetailIdInput) jobDetailIdInput.value = '';
}

function renderCommentDetailResult(data) {
  if (!commentDetailResultEl) return;
  const comment = data?.comment;
  if (!comment) {
    commentDetailResultEl.textContent = '未查询评论详情';
    return;
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const firstJobId = Number(jobs[0]?.id);
  if (Number.isFinite(firstJobId) && firstJobId > 0) {
    if (jobDetailIdInput) jobDetailIdInput.value = String(firstJobId);
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(firstJobId);
  } else {
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
  }

  const jobsHtml = jobs.length
    ? jobs.map((item) => `
      <tr>
        <td class="mono">${escapeHtml(item.id)}</td>
        <td>${renderStatusBadge(item.status)}</td>
        <td class="comment-box">${escapeHtml(item.reply_text || '')}</td>
        <td>
          <button class="detail-action-btn" onclick="quickQueryJobFromResult(${Number(item.id)})">查询</button>
          <button class="detail-action-btn" onclick="retryJobFromDetail(${Number(item.id)})">重试</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="mono">该评论暂无关联任务</td></tr>';

  commentDetailResultEl.innerHTML = `
    <div class="mono">comment_id: ${escapeHtml(comment.comment_id || '')}</div>
    <div class="mono">video_id: ${escapeHtml(comment.video_id || '')}</div>
    <div class="mono">user_id: ${escapeHtml(comment.user_id || '')}</div>
    <div class="comment-box">${escapeHtml(comment.content || '')}</div>
    <div class="table-wrap" style="margin-top:8px;">
      <table>
        <thead>
          <tr><th>ID</th><th>状态</th><th>回复</th><th>操作</th></tr>
        </thead>
        <tbody>${jobsHtml}</tbody>
      </table>
    </div>
  `;
}

function renderJobDetailResult(data) {
  if (!jobDetailResultEl) return;
  const item = data?.item;
  if (!item) {
    jobDetailResultEl.textContent = '未查询任务详情';
    return;
  }

  const jobId = Number(item.id);
  if (Number.isFinite(jobId) && jobId > 0 && singleRetryJobIdInput) {
    singleRetryJobIdInput.value = String(jobId);
  }
  const commentId = String(item.comment_id || '').trim();
  if (commentId && commentDetailIdInput) {
    commentDetailIdInput.value = commentId;
  }

  jobDetailResultEl.innerHTML = `
    <div class="mono">
      job_id: ${escapeHtml(item.id)}
      <button class="detail-action-btn" onclick="quickQueryJobFromResult(${Number(item.id)})">刷新该任务</button>
      <button class="detail-action-btn" onclick="retryJobFromDetail(${Number(item.id)})">重试该任务</button>
    </div>
    <div>状态: ${renderStatusBadge(item.status)}</div>
    <div class="mono">
      comment_id: ${escapeHtml(item.comment_id || '')}
      <button class="detail-action-btn" onclick="quickQueryCommentFromResult(${JSON.stringify(String(item.comment_id || ''))})">查询该评论</button>
    </div>
    <div class="comment-box">原评论: ${escapeHtml(item.comment_content || '')}</div>
    <div class="comment-box">回复内容: ${escapeHtml(item.reply_text || '')}</div>
    <div class="mono">risk_flags: ${escapeHtml(JSON.stringify(item.risk_flags || {}))}</div>
  `;
}

async function queryCommentDetail(options = {}) {
  const silent = !!options.silent;
  const bypassLock = !!options.bypassLock;
  if (!bypassLock && isGlobalRefreshLocked()) {
    if (!silent) showBusyToast();
    return;
  }
  const commentId = String(commentDetailIdInput?.value || '').trim();
  if (!commentId) {
    const errorText = '请先输入 comment_id';
    if (!silent) showToast('查询评论失败', errorText, { tone: 'error' });
    if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(commentDetailMetaEl, errorText);
    return;
  }

  setInlineButtonLoading(commentDetailQueryBtn, true, '查询中...');
  try {
    const res = await fetch(withApiKey(`/api/comments/${encodeURIComponent(commentId)}`));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      const errorText = getErrorText(data, '请求失败');
      if (!silent) showToast('查询评论失败', errorText, { copyable: true, tone: 'error' });
      if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
      if (jobDetailIdInput) jobDetailIdInput.value = '';
      if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
      markDetailQueryError(commentDetailMetaEl, errorText);
      return;
    }
    renderCommentDetailResult(data);
    markDetailQueryTime(commentDetailMetaEl);
    if (!silent) showToast('查询评论成功', `comment_id=${commentId}`, { tone: 'success' });
  } catch (error) {
    const errorText = getErrorText(error, '请求失败');
    if (!silent) showToast('查询评论失败', errorText, { copyable: true, tone: 'error' });
    if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(commentDetailMetaEl, errorText);
  } finally {
    setInlineButtonLoading(commentDetailQueryBtn, false);
    updateBatchActionState();
  }
}

async function queryJobDetail(options = {}) {
  const silent = !!options.silent;
  const bypassLock = !!options.bypassLock;
  if (!bypassLock && isGlobalRefreshLocked()) {
    if (!silent) showBusyToast();
    return;
  }
  let jobId = Number(jobDetailIdInput?.value);
  if ((!Number.isFinite(jobId) || jobId <= 0) && Number.isFinite(Number(singleRetryJobIdInput?.value)) && Number(singleRetryJobIdInput?.value) > 0) {
    jobId = Number(singleRetryJobIdInput?.value);
    if (jobDetailIdInput) jobDetailIdInput.value = String(jobId);
  }
  if (!Number.isFinite(jobId) || jobId <= 0) {
    const errorText = '请先输入有效的 job_id';
    if (!silent) showToast('查询任务失败', errorText, { tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(jobDetailMetaEl, errorText);
    return;
  }

  setInlineButtonLoading(jobDetailQueryBtn, true, '查询中...');
  try {
    const res = await fetch(withApiKey(`/api/jobs/${jobId}`));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      const errorText = getErrorText(data, '请求失败');
      if (!silent) showToast('查询任务失败', errorText, { copyable: true, tone: 'error' });
      if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
      if (jobDetailIdInput) jobDetailIdInput.value = '';
      if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
      markDetailQueryError(jobDetailMetaEl, errorText);
      return;
    }
    renderJobDetailResult(data);
    markDetailQueryTime(jobDetailMetaEl);
    if (!silent) showToast('查询任务成功', `job_id=${jobId}`, { tone: 'success' });
  } catch (error) {
    const errorText = getErrorText(error, '请求失败');
    if (!silent) showToast('查询任务失败', errorText, { copyable: true, tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(jobDetailMetaEl, errorText);
  } finally {
    setInlineButtonLoading(jobDetailQueryBtn, false);
    updateBatchActionState();
  }
}

async function retrySingleJob() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  let jobId = Number(singleRetryJobIdInput?.value);
  if ((!Number.isFinite(jobId) || jobId <= 0) && Number.isFinite(Number(jobDetailIdInput?.value)) && Number(jobDetailIdInput?.value) > 0) {
    jobId = Number(jobDetailIdInput?.value);
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(jobId);
  }
  if (!Number.isFinite(jobId) || jobId <= 0) {
    showToast('单任务重试失败', '请先输入有效的 job_id', { tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, '请先输入有效的 job_id');
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    return;
  }

  singleRetryRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(singleRetryBtn, true, '重试中...');
  try {
    const res = await fetch(withApiKey(`/api/jobs/${jobId}/retry`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_long: !!singleRetryForceLongInput?.checked }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      const errorText = getErrorText(data, '请求失败');
      showToast('单任务重试失败', errorText, { copyable: true, tone: 'error' });
      if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
      if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, errorText);
      if (jobDetailIdInput) jobDetailIdInput.value = '';
      if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
      return;
    }

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      const failureSummary = formatFailureSummary(refreshResult.failures);
      showToast(
        '单任务重试完成（部分刷新失败）',
        failureSummary,
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, failureSummary);
      return;
    }

    if (jobDetailIdInput) {
      jobDetailIdInput.value = String(jobId);
    }
    if (singleRetryJobIdInput) {
      singleRetryJobIdInput.value = String(jobId);
    }
    await queryJobDetail({ silent: true, bypassLock: true });
    const commentId = String(commentDetailIdInput?.value || '').trim();
    if (commentId) {
      await queryCommentDetail({ silent: true, bypassLock: true });
    }
    if (singleRetryAutoResetForceInput?.checked && singleRetryForceLongInput) {
      singleRetryForceLongInput.checked = false;
    }

    showToast('单任务重试完成', `任务 ${jobId} 已重新入队`, { tone: 'success' });
  } catch (error) {
    const errorText = getErrorText(error, '请求失败');
    showToast('单任务重试失败', errorText, { copyable: true, tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, errorText);
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
  } finally {
    singleRetryRunning = false;
    setInlineButtonLoading(singleRetryBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

function getCheckedJobIds() {
  return Array.from(selectedJobIdSet)
    .filter(id => Number.isFinite(id))
    .sort((a, b) => a - b);
}

function toggleAllJobChecks(checked) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  (jobsTableBody?.querySelectorAll('.job-check') || []).forEach((el) => {
    el.checked = !!checked;
  });
  updateBatchActionState();
}

function onJobCheckChanged(event) {
  if (isGlobalRefreshLocked()) {
    const target = event?.target;
    const id = Number(target?.value);
    if (target && Number.isFinite(id)) target.checked = selectedJobIdSet.has(id);
    showBusyToast();
    return;
  }
  updateBatchActionState();
}

function updateBatchActionState() {
  const allChecks = Array.from(jobsTableBody?.querySelectorAll('.job-check') || []);
  selectedJobIdSet = new Set(
    allChecks
      .filter(el => el.checked)
      .map(el => Number(el.value))
      .filter(id => Number.isFinite(id))
  );
  const count = selectedJobIdSet.size;
  const locked = isGlobalRefreshLocked();

  allChecks.forEach((el) => {
    el.disabled = locked;
  });
  (jobsTableBody?.querySelectorAll('.approve-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });
  (jobsTableBody?.querySelectorAll('textarea[id^="reply-"]') || []).forEach((el) => {
    el.disabled = locked;
  });
  (knowledgeEntriesBody?.querySelectorAll('.knowledge-disable-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });
  (commentDetailResultEl?.querySelectorAll('.detail-action-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });
  (jobDetailResultEl?.querySelectorAll('.detail-action-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });

  if (batchApproveBtn) batchApproveBtn.disabled = locked || count === 0;
  if (batchRetryBtn) batchRetryBtn.disabled = locked || count === 0;
  if (jobsRefreshBtn) jobsRefreshBtn.disabled = locked;
  if (jobsStatusInput) jobsStatusInput.disabled = locked;
  if (jobsLimitInput) jobsLimitInput.disabled = locked;
  if (dailyDaysInput) dailyDaysInput.disabled = locked;
  if (dailySimpleInput) dailySimpleInput.disabled = locked;
  if (dailyRefreshBtn) dailyRefreshBtn.disabled = locked;
  if (auditActionInput) auditActionInput.disabled = locked;
  if (auditOkInput) auditOkInput.disabled = locked;
  if (auditSummaryDaysInput) auditSummaryDaysInput.disabled = locked;
  if (auditSummaryRefreshBtn) auditSummaryRefreshBtn.disabled = locked;
  if (jobsExportBtn) jobsExportBtn.disabled = locked;
  if (auditExportBtn) auditExportBtn.disabled = locked;
  if (fullRefreshBtn) fullRefreshBtn.disabled = locked;
  if (styleProfileSelect) styleProfileSelect.disabled = locked;
  if (styleProfileApplyBtn) styleProfileApplyBtn.disabled = locked;
  if (styleProfileRefreshBtn) styleProfileRefreshBtn.disabled = locked;
  if (roleCardSelect) roleCardSelect.disabled = locked;
  if (roleCardKeyInput) roleCardKeyInput.disabled = locked;
  if (roleCardNameInput) roleCardNameInput.disabled = locked;
  if (roleCardEnabledInput) roleCardEnabledInput.disabled = locked;
  if (roleCardDescriptionInput) roleCardDescriptionInput.disabled = locked;
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.disabled = locked;
  if (roleCardToneInput) roleCardToneInput.disabled = locked;
  if (roleCardConstraintsInput) roleCardConstraintsInput.disabled = locked;
  if (roleCardsRefreshBtn) roleCardsRefreshBtn.disabled = locked;
  if (knowledgeRefreshBtn) knowledgeRefreshBtn.disabled = locked;
  if (knowledgeCategoryInput) knowledgeCategoryInput.disabled = locked;
  if (knowledgeTitleInput) knowledgeTitleInput.disabled = locked;
  if (knowledgeContentInput) knowledgeContentInput.disabled = locked;
  if (knowledgeCreateBtn) knowledgeCreateBtn.disabled = locked;
  if (gatewayCommentIdInput) gatewayCommentIdInput.disabled = locked;
  if (gatewayLimitInput) gatewayLimitInput.disabled = locked;
  if (gatewayRefreshBtn) gatewayRefreshBtn.disabled = locked;
  if (gatewayPublishCommentIdInput) gatewayPublishCommentIdInput.disabled = locked;
  if (gatewayPublishSourceInput) gatewayPublishSourceInput.disabled = locked;
  if (gatewayPublishForceInput) gatewayPublishForceInput.disabled = locked;
  if (gatewayPublishReplyInput) gatewayPublishReplyInput.disabled = locked;
  if (gatewayPublishBtn) gatewayPublishBtn.disabled = locked;
  if (commentDetailIdInput) commentDetailIdInput.disabled = locked;
  if (commentDetailQueryBtn) commentDetailQueryBtn.disabled = locked;
  if (commentDetailClearBtn) commentDetailClearBtn.disabled = locked;
  if (jobDetailIdInput) jobDetailIdInput.disabled = locked;
  if (jobDetailQueryBtn) jobDetailQueryBtn.disabled = locked;
  if (jobDetailClearBtn) jobDetailClearBtn.disabled = locked;
  if (singleRetryJobIdInput) singleRetryJobIdInput.disabled = locked;
  if (singleRetryForceLongInput) singleRetryForceLongInput.disabled = locked;
  if (singleRetryAutoResetForceInput) singleRetryAutoResetForceInput.disabled = locked;
  if (singleRetryBtn) singleRetryBtn.disabled = locked;
  if (roleCardNewBtn) roleCardNewBtn.disabled = locked;
  if (roleCardCloneBtn) roleCardCloneBtn.disabled = locked;
  if (roleCardSaveBtn) roleCardSaveBtn.disabled = locked;
  if (roleCardDisableBtn) roleCardDisableBtn.disabled = locked;
  if (roleCardActivateBtn) roleCardActivateBtn.disabled = locked;
  if (roleProfileSelect) roleProfileSelect.disabled = locked;
  if (roleProfileApplyBtn) roleProfileApplyBtn.disabled = locked;
  if (roleProfileRefreshBtn) roleProfileRefreshBtn.disabled = locked;
  if (autoRefreshInput) autoRefreshInput.disabled = locked;
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.disabled = locked || !!autoRefreshInput?.checked;
  if (uiPrefsFileInput) uiPrefsFileInput.disabled = locked;
  if (prefsResetBtn) prefsResetBtn.disabled = locked;
  if (prefsExportBtn) prefsExportBtn.disabled = locked;
  if (prefsImportBtn) prefsImportBtn.disabled = locked;
  if (batchSelectedCountEl) batchSelectedCountEl.textContent = `已选 ${count}`;

  if (jobsCheckAll) {
    jobsCheckAll.disabled = locked;
    if (!allChecks.length) {
      jobsCheckAll.checked = false;
      jobsCheckAll.indeterminate = false;
    } else if (count === 0) {
      jobsCheckAll.checked = false;
      jobsCheckAll.indeterminate = false;
    } else if (count === allChecks.length) {
      jobsCheckAll.checked = true;
      jobsCheckAll.indeterminate = false;
    } else {
      jobsCheckAll.checked = false;
      jobsCheckAll.indeterminate = true;
    }
  }
}

async function refreshAfterAction() {
  const steps = [
    { label: 'jobs', run: loadJobs },
    { label: 'overview', run: loadOverview },
    { label: 'knowledge', run: loadKnowledgeEntries },
    { label: 'gateway_logs', run: loadGatewayLogs },
    { label: 'daily_metrics', run: loadDailyMetrics },
    { label: 'audit_summary', run: loadAuditSummary },
    { label: 'audit_logs', run: loadAuditLogs },
  ];

  const failures = [];
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      failures.push({ label: step.label, error: getErrorText(error, 'unknown_error') });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

function formatFailureSummary(failures) {
  return failures.map(item => `${item.label}: ${item.error}`).join('\n');
}

function setInlineButtonLoading(btn, loading, loadingText) {
  if (!btn) return;
  if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || '';
  if (loading) {
    btn.disabled = true;
    if (loadingText) btn.textContent = loadingText;
    return;
  }
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || btn.textContent;
}

async function approveJob(jobId, triggerBtn = null) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  singleApproveRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(triggerBtn, true, '处理中...');
  try {
    const replyInput = jobsTableBody?.querySelector(`#reply-${jobId}`);
    if (!(replyInput instanceof HTMLTextAreaElement)) {
      showToast('审批失败', '未找到回复输入框，请先刷新任务列表', { tone: 'error' });
      return;
    }
    const txt = replyInput.value;
    const res = await fetch(withApiKey(`/api/jobs/${jobId}/approve`), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ override_reply_text: txt })
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) return showToast('审批失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      showToast(
        '审批完成（部分刷新失败）',
        formatFailureSummary(refreshResult.failures),
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      return;
    }

    showToast('审批完成', `任务 ${jobId} 已处理`, { tone: 'success' });
  } catch (error) {
    showToast('审批失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    singleApproveRunning = false;
    setInlineButtonLoading(triggerBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

async function batchApprove() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  batchApproveRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(batchApproveBtn, true, '审批中...');
  if (batchRetryBtn) batchRetryBtn.disabled = true;
  try {
    const jobIds = getCheckedJobIds();
    if (!jobIds.length) return showToast('批量审批', '请先勾选要审批的任务');
    const res = await fetch(withApiKey('/api/jobs/approve-batch'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ job_ids: jobIds })
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) return showToast('批量审批失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      showToast(
        `批量审批完成（成功 ${data.summary.success} / 失败 ${data.summary.failed}）\n但界面刷新部分失败`,
        formatFailureSummary(refreshResult.failures),
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      return;
    }

    showToast('批量审批完成', `成功 ${data.summary.success} / 失败 ${data.summary.failed}`, { tone: 'success' });
  } catch (error) {
    showToast('批量审批失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    batchApproveRunning = false;
    setInlineButtonLoading(batchApproveBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

async function batchRetry() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  batchRetryRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(batchRetryBtn, true, '重试中...');
  if (batchApproveBtn) batchApproveBtn.disabled = true;
  try {
    const jobIds = getCheckedJobIds();
    if (!jobIds.length) return showToast('批量重试', '请先勾选要重试的任务');
    const res = await fetch(withApiKey('/api/jobs/retry-batch'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ job_ids: jobIds, force_long: false })
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) return showToast('批量重试失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      showToast(
        `批量重试完成（成功 ${data.summary.success} / 失败 ${data.summary.failed}）\n但界面刷新部分失败`,
        formatFailureSummary(refreshResult.failures),
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      return;
    }

    showToast('批量重试完成', `成功 ${data.summary.success} / 失败 ${data.summary.failed}`, { tone: 'success' });
  } catch (error) {
    showToast('批量重试失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    batchRetryRunning = false;
    setInlineButtonLoading(batchRetryBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

function exportCsv() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const status = jobsStatusInput?.value || '';
  const limit = getClampedInt(jobsLimitInput?.value, 1, 200, 30);
  if (jobsLimitInput) jobsLimitInput.value = String(limit);
  const qs = new URLSearchParams({ limit: String(limit) });
  if (status) qs.set('status', status);
  const win = window.open(withApiKey('/api/export/jobs.csv?' + qs.toString()), '_blank');
  if (!win) showToast('导出提示', '浏览器拦截了新窗口，请允许弹窗后重试');
}

async function refreshAuditLogs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(auditRefreshBtn, true, '刷新中...');
  try {
    await loadAuditLogs();
    showToast('日志刷新完成', '已更新审计日志', { tone: 'success' });
  } catch (error) {
    showToast('日志刷新失败', getErrorText(error, '加载审计日志失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(auditRefreshBtn, false);
    updateBatchActionState();
  }
}

function getTopActionLabel(actionCountMap) {
  const entries = Object.entries(actionCountMap || {});
  if (!entries.length) return '-';
  entries.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
  const [action, count] = entries[0];
  return `${action} (${safeCount(count)})`;
}

function renderAuditSummaryCards(summary) {
  const totals = summary?.totals || {};
  const byResult = summary?.by_result || {};
  if (cardAuditTotal) cardAuditTotal.textContent = safeCount(totals.audit_logs);
  if (cardAuditOk) cardAuditOk.textContent = safeCount(byResult.ok);
  if (cardAuditFailed) cardAuditFailed.textContent = safeCount(byResult.failed);
  if (cardAuditTopAction) cardAuditTopAction.textContent = getTopActionLabel(summary?.by_action || {});
}

async function loadAuditSummary() {
  const days = getClampedInt(auditSummaryDaysInput?.value, 1, 90, 7);
  if (auditSummaryDaysInput) auditSummaryDaysInput.value = String(days);

  const action = auditActionInput?.value || '';
  const ok = auditOkInput?.value || '';
  const qs = new URLSearchParams({ days: String(days) });
  if (action) qs.set('action', action);
  if (ok) qs.set('ok', ok);

  const res = await fetch(withApiKey('/api/audit-logs/summary?' + qs.toString()));
  const data = await readApiPayload(res);
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载审计摘要失败'));

  renderAuditSummaryCards(data);
}

async function refreshAuditSummary() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(auditSummaryRefreshBtn, true, '刷新中...');
  try {
    await loadAuditSummary();
    showToast('审计摘要刷新完成', '已更新审计统计卡片', { tone: 'success' });
  } catch (error) {
    showToast('审计摘要刷新失败', getErrorText(error, '加载审计摘要失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(auditSummaryRefreshBtn, false);
    updateBatchActionState();
  }
}

async function loadAuditLogs() {
  const action = auditActionInput?.value || '';
  const ok = auditOkInput?.value || '';
  const limit = getClampedInt(auditLimitInput?.value, 1, 1000, 100);
  if (auditLimitInput) auditLimitInput.value = String(limit);

  const qs = new URLSearchParams({ limit: String(limit) });
  if (action) qs.set('action', action);
  if (ok) qs.set('ok', ok);

  const res = await fetch(withApiKey('/api/audit-logs?' + qs.toString()));
  const data = await readApiPayload(res);
  if (!auditLogsBody) throw new Error('audit_logs_table_not_found');
  auditLogsBody.innerHTML = '';

  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载审计日志失败'));

  for (const item of (data.items || [])) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class=\"mono\">${escapeHtml(item.id)}</td>
      <td class=\"mono\">${escapeHtml(item.action)}</td>
      <td>${escapeHtml(item.ok)}</td>
      <td class=\"mono\">${escapeHtml(item.target_id)}</td>
      <td class=\"mono\">${escapeHtml(JSON.stringify(item.payload || {}))}</td>
      <td class=\"mono\">${escapeHtml(item.created_at)}</td>
    `;
    auditLogsBody.appendChild(tr);
  }
}

function exportAuditCsv() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const action = auditActionInput?.value || '';
  const ok = auditOkInput?.value || '';
  const limit = getClampedInt(auditLimitInput?.value, 1, 1000, 100);
  if (auditLimitInput) auditLimitInput.value = String(limit);

  const qs = new URLSearchParams({ limit: String(limit) });
  if (action) qs.set('action', action);
  if (ok) qs.set('ok', ok);

  const win = window.open(withApiKey('/api/export/audit-logs.csv?' + qs.toString()), '_blank');
  if (!win) showToast('导出提示', '浏览器拦截了新窗口，请允许弹窗后重试');
}

async function loadKnowledgeEntries() {
  const res = await fetch(withApiKey('/api/admin/knowledge'));
  const data = await readApiPayload(res);
  if (!knowledgeEntriesBody) throw new Error('knowledge_table_not_found');
  knowledgeEntriesBody.innerHTML = '';
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载知识库失败'));

  for (const item of (data.items || [])) {
    const tr = document.createElement('tr');
    const enabled = !!item.enabled;
    tr.innerHTML = `
      <td class="mono">${escapeHtml(String(item.id ?? ''))}</td>
      <td class="mono">${escapeHtml(String(item.category || ''))}</td>
      <td>${escapeHtml(String(item.title || ''))}</td>
      <td class="comment-box">${escapeHtml(String(item.content || ''))}</td>
      <td>${enabled ? '<span class="status-badge status-badge-published">enabled</span>' : '<span class="status-badge status-badge-blocked">disabled</span>'}</td>
      <td class="mono">${escapeHtml(String(item.updated_at || ''))}</td>
      <td>${enabled ? `<button class="knowledge-disable-btn" onclick="disableKnowledgeEntry(${Number(item.id)})">禁用</button>` : '-'}</td>
    `;
    knowledgeEntriesBody.appendChild(tr);
  }
}

async function refreshKnowledgeEntries() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(knowledgeRefreshBtn, true, '刷新中...');
  try {
    await loadKnowledgeEntries();
    showToast('知识库刷新完成', '已更新知识条目列表', { tone: 'success' });
  } catch (error) {
    showToast('知识库刷新失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(knowledgeRefreshBtn, false);
    updateBatchActionState();
  }
}

async function createKnowledgeEntry() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const category = String(knowledgeCategoryInput?.value || '').trim();
  const title = String(knowledgeTitleInput?.value || '').trim();
  const content = String(knowledgeContentInput?.value || '').trim();
  if (!category || !title || !content) {
    showToast('新增知识条目失败', 'category / title / content 均为必填', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(knowledgeCreateBtn, true, '新增中...');
  try {
    const res = await fetch(withApiKey('/api/admin/knowledge'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, title, content }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('新增知识条目失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    await loadKnowledgeEntries();
    showToast('新增知识条目成功', `ID: ${data.item?.id ?? '-'}`, { tone: 'success' });
  } catch (error) {
    showToast('新增知识条目失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(knowledgeCreateBtn, false);
    updateBatchActionState();
  }
}

async function disableKnowledgeEntry(entryId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const id = Number(entryId);
  if (!Number.isFinite(id) || id <= 0) {
    showToast('禁用知识条目失败', '无效 entry_id', { tone: 'error' });
    return;
  }

  try {
    const res = await fetch(withApiKey(`/api/admin/knowledge/${id}/disable`), { method: 'POST' });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('禁用知识条目失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    await loadKnowledgeEntries();
    showToast('知识条目已禁用', `ID: ${id}`, { tone: 'success' });
  } catch (error) {
    showToast('禁用知识条目失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  }
}

async function loadGatewayLogs() {
  const commentId = String(gatewayCommentIdInput?.value || '').trim();
  const limit = getClampedInt(gatewayLimitInput?.value, 1, 200, 50);
  if (gatewayLimitInput) gatewayLimitInput.value = String(limit);

  const qs = new URLSearchParams({ limit: String(limit) });
  if (commentId) qs.set('comment_id', commentId);

  const res = await fetch(withApiKey('/gateway/publish-logs?' + qs.toString()));
  const data = await readApiPayload(res);
  if (!gatewayLogsBody) throw new Error('gateway_logs_table_not_found');
  gatewayLogsBody.innerHTML = '';
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载网关日志失败'));

  for (const item of (data.items || [])) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${escapeHtml(String(item.id ?? ''))}</td>
      <td class="mono">${escapeHtml(String(item.comment_id || ''))}</td>
      <td class="mono">${escapeHtml(String(item.source || ''))}</td>
      <td class="mono">${escapeHtml(String(item.reply_hash || ''))}</td>
      <td class="mono">${escapeHtml(String(item.created_at || ''))}</td>
    `;
    gatewayLogsBody.appendChild(tr);
  }
}

async function refreshGatewayLogs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(gatewayRefreshBtn, true, '刷新中...');
  try {
    await loadGatewayLogs();
    showToast('网关日志刷新完成', '已更新发布网关日志', { tone: 'success' });
  } catch (error) {
    showToast('网关日志刷新失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(gatewayRefreshBtn, false);
    updateBatchActionState();
  }
}

async function refreshAfterGatewayPublish() {
  await loadGatewayLogs();
  await loadOverview();
  await loadJobs();
}

async function publishGatewayReply() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const commentId = String(gatewayPublishCommentIdInput?.value || '').trim();
  const replyText = String(gatewayPublishReplyInput?.value || '').trim();
  const source = String(gatewayPublishSourceInput?.value || '').trim() || 'bili-pet-bot';
  const forcePublish = !!gatewayPublishForceInput?.checked;

  if (!commentId || !replyText) {
    showToast('手动发布失败', 'comment_id 与 reply_text 必填', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(gatewayPublishBtn, true, '发布中...');
  try {
    const res = await fetch(withApiKey('/gateway/publish'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_id: commentId,
        reply_text: replyText,
        source,
        force_publish: forcePublish,
      }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('手动发布失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    await refreshAfterGatewayPublish();
    showToast('手动发布成功', `comment_id=${commentId}`, { tone: 'success' });
  } catch (error) {
    showToast('手动发布失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(gatewayPublishBtn, false);
    updateBatchActionState();
  }
}

function tryParseJsonObject(rawText, fallback = {}) {
  const text = String(rawText || '').trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function roleCardByKey(key) {
  const normalized = String(key || '').trim().toLowerCase();
  return roleCardItems.find(item => String(item.key || '').toLowerCase() === normalized) || null;
}

function renderRoleCardEditor(item) {
  roleCardCurrentKey = String(item?.key || '').trim().toLowerCase();
  if (roleCardSelect) roleCardSelect.value = roleCardCurrentKey;
  if (roleCardKeyInput) roleCardKeyInput.value = String(item?.key || '');
  if (roleCardNameInput) roleCardNameInput.value = String(item?.name || '');
  if (roleCardDescriptionInput) roleCardDescriptionInput.value = String(item?.description || '');
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.value = String(item?.system_prompt || '');
  if (roleCardToneInput) roleCardToneInput.value = JSON.stringify(item?.tone || {}, null, 2);
  if (roleCardConstraintsInput) roleCardConstraintsInput.value = JSON.stringify(item?.constraints || {}, null, 2);
  if (roleCardEnabledInput) roleCardEnabledInput.checked = !!item?.enabled;
}

function renderRoleCardOptions(activeKey = '') {
  if (!roleCardSelect) return;
  const normalizedActive = String(activeKey || '').trim().toLowerCase();
  roleCardSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = roleCardItems.length ? '选择角色卡' : '暂无角色卡';
  roleCardSelect.appendChild(placeholder);

  for (const item of roleCardItems) {
    const option = document.createElement('option');
    option.value = String(item.key || '');
    const isActive = String(item.key || '').toLowerCase() === normalizedActive;
    option.textContent = `${item.key}${isActive ? ' (active)' : ''}${item.enabled ? '' : ' (disabled)'}`;
    roleCardSelect.appendChild(option);
  }
}

async function loadRoleCards() {
  const res = await fetch(withApiKey('/api/admin/role-cards'));
  const data = await readApiPayload(res);
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载角色卡失败'));

  roleCardItems = Array.isArray(data.items) ? data.items : [];
  const activeKey = String(data.active_role_card_key || '').trim().toLowerCase();
  if (activeRoleCardCurrentEl) {
    activeRoleCardCurrentEl.textContent = `激活角色卡: ${activeKey || '-'}`;
  }

  renderRoleCardOptions(activeKey);

  if (roleCardCurrentKey) {
    const found = roleCardByKey(roleCardCurrentKey);
    if (found) {
      renderRoleCardEditor(found);
      return;
    }
  }

  const activeItem = roleCardByKey(activeKey);
  if (activeItem) {
    renderRoleCardEditor(activeItem);
    return;
  }

  if (roleCardItems.length) {
    renderRoleCardEditor(roleCardItems[0]);
    return;
  }

  newRoleCardDraft();
}

async function refreshRoleCards() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(roleCardsRefreshBtn, true, '读取中...');
  try {
    await loadRoleCards();
    showToast('角色卡刷新完成', '已更新角色卡列表', { tone: 'success' });
  } catch (error) {
    showToast('角色卡刷新失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardsRefreshBtn, false);
  }
}

function newRoleCardDraft() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  roleCardCurrentKey = '';
  if (roleCardSelect) roleCardSelect.value = '';
  if (roleCardKeyInput) roleCardKeyInput.value = '';
  if (roleCardNameInput) roleCardNameInput.value = '';
  if (roleCardDescriptionInput) roleCardDescriptionInput.value = '';
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.value = '';
  if (roleCardToneInput) roleCardToneInput.value = '{}';
  if (roleCardConstraintsInput) roleCardConstraintsInput.value = '{}';
  if (roleCardEnabledInput) roleCardEnabledInput.checked = true;
}

function cloneRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const current = roleCardByKey(roleCardCurrentKey);
  if (!current) {
    showToast('复制失败', '请先选择一个角色卡', { tone: 'error' });
    return;
  }

  if (roleCardKeyInput) roleCardKeyInput.value = `${current.key}_copy`;
  if (roleCardNameInput) roleCardNameInput.value = `${current.name} Copy`;
  if (roleCardDescriptionInput) roleCardDescriptionInput.value = current.description || '';
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.value = current.system_prompt || '';
  if (roleCardToneInput) roleCardToneInput.value = JSON.stringify(current.tone || {}, null, 2);
  if (roleCardConstraintsInput) roleCardConstraintsInput.value = JSON.stringify(current.constraints || {}, null, 2);
  if (roleCardEnabledInput) roleCardEnabledInput.checked = !!current.enabled;
  roleCardCurrentKey = '';
  if (roleCardSelect) roleCardSelect.value = '';
}

async function saveRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const key = String(roleCardKeyInput?.value || '').trim().toLowerCase();
  const name = String(roleCardNameInput?.value || '').trim();
  if (!key || !name) {
    showToast('保存失败', 'key 和 name 必填', { tone: 'error' });
    return;
  }

  const payload = {
    key,
    name,
    description: String(roleCardDescriptionInput?.value || '').trim(),
    system_prompt: String(roleCardSystemPromptInput?.value || '').trim(),
    tone: tryParseJsonObject(roleCardToneInput?.value || '{}', {}),
    constraints: tryParseJsonObject(roleCardConstraintsInput?.value || '{}', {}),
    enabled: !!roleCardEnabledInput?.checked,
  };

  const existing = roleCardByKey(key);
  const isUpdate = !!existing;
  const endpoint = isUpdate ? `/api/admin/role-cards/${encodeURIComponent(key)}` : '/api/admin/role-cards';

  setInlineButtonLoading(roleCardSaveBtn, true, '保存中...');
  try {
    const res = await fetch(withApiKey(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡保存失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    roleCardCurrentKey = String(data.item?.key || key).toLowerCase();
    await loadRoleCards();
    showToast('角色卡保存成功', `当前: ${roleCardCurrentKey}`, { tone: 'success' });
  } catch (error) {
    showToast('角色卡保存失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardSaveBtn, false);
  }
}

async function disableRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const key = String(roleCardCurrentKey || roleCardSelect?.value || '').trim().toLowerCase();
  if (!key) {
    showToast('禁用失败', '请先选择角色卡', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(roleCardDisableBtn, true, '禁用中...');
  try {
    const res = await fetch(withApiKey(`/api/admin/role-cards/${encodeURIComponent(key)}/disable`), { method: 'POST' });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡禁用失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    await loadRoleCards();
    showToast('角色卡已禁用', key, { tone: 'success' });
  } catch (error) {
    showToast('角色卡禁用失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardDisableBtn, false);
  }
}

async function activateRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const key = String(roleCardCurrentKey || roleCardSelect?.value || '').trim().toLowerCase();
  if (!key) {
    showToast('激活失败', '请先选择角色卡', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(roleCardActivateBtn, true, '激活中...');
  try {
    const res = await fetch(withApiKey(`/api/admin/role-cards/${encodeURIComponent(key)}/activate`), { method: 'POST' });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡激活失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    await loadRoleCards();
    showToast('角色卡已激活', `当前激活: ${data.active_role_card_key || key}`, { tone: 'success' });
  } catch (error) {
    showToast('角色卡激活失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardActivateBtn, false);
  }
}

async function applyStyleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const profile = String(styleProfileSelect?.value || 'auto');
  if (!['auto', 'empathy', 'meme', 'normal'].includes(profile)) {
    showToast('风格设置失败', '无效风格值', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(styleProfileApplyBtn, true, '应用中...');
  try {
    const res = await fetch(withApiKey('/api/admin/style-profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style_profile: profile }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('风格设置失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    if (styleProfileCurrentEl) styleProfileCurrentEl.textContent = `风格: ${data.style_profile}`;
    showToast('风格设置成功', `当前风格: ${data.style_profile}`, { tone: 'success' });
  } catch (error) {
    showToast('风格设置失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(styleProfileApplyBtn, false);
  }
}

async function refreshStyleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(styleProfileRefreshBtn, true, '读取中...');
  try {
    const res = await fetch(withApiKey('/api/admin/style-profile'));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('风格读取失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    const current = String(data.style_profile || 'auto');
    if (styleProfileSelect) styleProfileSelect.value = current;
    if (styleProfileCurrentEl) styleProfileCurrentEl.textContent = `风格: ${current}`;
  } catch (error) {
    showToast('风格读取失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(styleProfileRefreshBtn, false);
  }
}

async function applyRoleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const profile = String(roleProfileSelect?.value || 'auto');
  if (!['auto', 'default', 'comfort', 'playful'].includes(profile)) {
    showToast('角色卡设置失败', '无效角色卡值', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(roleProfileApplyBtn, true, '应用中...');
  try {
    const res = await fetch(withApiKey('/api/admin/role-profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_profile: profile }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡设置失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    if (roleProfileCurrentEl) roleProfileCurrentEl.textContent = `角色卡: ${data.role_profile}`;
    showToast('角色卡设置成功', `当前角色卡: ${data.role_profile}`, { tone: 'success' });
  } catch (error) {
    showToast('角色卡设置失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleProfileApplyBtn, false);
  }
}

async function refreshRoleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(roleProfileRefreshBtn, true, '读取中...');
  try {
    const res = await fetch(withApiKey('/api/admin/role-profile'));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡读取失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    const current = String(data.role_profile || 'auto');
    if (roleProfileSelect) roleProfileSelect.value = current;
    if (roleProfileCurrentEl) roleProfileCurrentEl.textContent = `角色卡: ${current}`;
  } catch (error) {
    showToast('角色卡读取失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleProfileRefreshBtn, false);
  }
}

window.addEventListener('beforeunload', stopAutoRefresh);

const prefs = loadPrefs();
const autoRefreshInput = document.getElementById('auto-refresh');
const autoRefreshSecondsInput = document.getElementById('auto-refresh-seconds');
const dailySimpleInput = document.getElementById('daily-simple');
const uiPrefsFileInput = document.getElementById('ui-prefs-file');
const batchApproveBtn = document.getElementById('batch-approve-btn');
const batchRetryBtn = document.getElementById('batch-retry-btn');
const cardComments = document.getElementById('card-comments');
const cardJobs = document.getElementById('card-jobs');
const cardPublished = document.getElementById('card-published');
const cardManual = document.getElementById('card-manual');
const cardAuditTotal = document.getElementById('card-audit-total');
const cardAuditOk = document.getElementById('card-audit-ok');
const cardAuditFailed = document.getElementById('card-audit-failed');
const cardAuditTopAction = document.getElementById('card-audit-top-action');
const dailyMetricsBody = document.getElementById('daily-metrics');
const dailyHeadFull = document.getElementById('daily-head-full');
const dailyHeadSimple = document.getElementById('daily-head-simple');
const jobsTableBody = document.getElementById('jobs');
const jobsCheckAll = document.getElementById('job-check-all');
const auditLogsBody = document.getElementById('audit-logs');
const jobsStatusInput = document.getElementById('status');
const jobsLimitInput = document.getElementById('limit');
const dailyDaysInput = document.getElementById('daily-days');
const auditActionInput = document.getElementById('audit-action');
const auditOkInput = document.getElementById('audit-ok');
const auditLimitInput = document.getElementById('audit-limit');
const auditSummaryDaysInput = document.getElementById('audit-summary-days');
const jobsRefreshBtn = document.getElementById('jobs-refresh-btn');
const dailyRefreshBtn = document.getElementById('daily-refresh-btn');
const auditRefreshBtn = document.getElementById('audit-refresh-btn');
const auditSummaryRefreshBtn = document.getElementById('audit-summary-refresh-btn');
const jobsExportBtn = document.getElementById('jobs-export-btn');
const auditExportBtn = document.getElementById('audit-export-btn');
const fullRefreshBtn = document.getElementById('full-refresh-btn');
const styleProfileSelect = document.getElementById('style-profile-select');
const styleProfileApplyBtn = document.getElementById('style-profile-apply-btn');
const styleProfileRefreshBtn = document.getElementById('style-profile-refresh-btn');
const styleProfileCurrentEl = document.getElementById('style-profile-current');
const roleProfileSelect = document.getElementById('role-profile-select');
const roleProfileApplyBtn = document.getElementById('role-profile-apply-btn');
const roleProfileRefreshBtn = document.getElementById('role-profile-refresh-btn');
const roleProfileCurrentEl = document.getElementById('role-profile-current');
const batchSelectedCountEl = document.getElementById('batch-selected-count');
const prefsResetBtn = document.getElementById('prefs-reset-btn');
const prefsExportBtn = document.getElementById('prefs-export-btn');
const prefsImportBtn = document.getElementById('prefs-import-btn');
const prefsSnapshotEl = document.getElementById('prefs-snapshot');
const refreshStatusEl = document.getElementById('refresh-status');
const modeChipManual = document.getElementById('mode-chip-manual');
const modeChipSimulated = document.getElementById('mode-chip-simulated');
const modeChipWebhook = document.getElementById('mode-chip-webhook');
const modeChipRealPublish = document.getElementById('mode-chip-real-publish');
const publisherModeCurrentEl = document.getElementById('publisher-mode-current');
const toastEl = document.getElementById('toast');
const toastTitleEl = document.getElementById('toast-title');
const toastContentEl = document.getElementById('toast-content');
const toastCopyBtn = document.getElementById('toast-copy');
const helpPanelEl = document.getElementById('help-panel');
const roleCardsRefreshBtn = document.getElementById('role-cards-refresh-btn');
const roleCardNewBtn = document.getElementById('role-card-new-btn');
const roleCardCloneBtn = document.getElementById('role-card-clone-btn');
const roleCardSaveBtn = document.getElementById('role-card-save-btn');
const roleCardDisableBtn = document.getElementById('role-card-disable-btn');
const roleCardActivateBtn = document.getElementById('role-card-activate-btn');
const activeRoleCardCurrentEl = document.getElementById('active-role-card-current');
const roleCardSelect = document.getElementById('role-card-select');
const roleCardKeyInput = document.getElementById('role-card-key');
const roleCardNameInput = document.getElementById('role-card-name');
const roleCardEnabledInput = document.getElementById('role-card-enabled');
const roleCardDescriptionInput = document.getElementById('role-card-description');
const roleCardSystemPromptInput = document.getElementById('role-card-system-prompt');
const roleCardToneInput = document.getElementById('role-card-tone');
const roleCardConstraintsInput = document.getElementById('role-card-constraints');
const knowledgeEntriesBody = document.getElementById('knowledge-entries');
const knowledgeRefreshBtn = document.getElementById('knowledge-refresh-btn');
const knowledgeCategoryInput = document.getElementById('knowledge-category');
const knowledgeTitleInput = document.getElementById('knowledge-title');
const knowledgeContentInput = document.getElementById('knowledge-content');
const knowledgeCreateBtn = document.getElementById('knowledge-create-btn');
const gatewayLogsBody = document.getElementById('gateway-logs');
const gatewayCommentIdInput = document.getElementById('gateway-comment-id');
const gatewayLimitInput = document.getElementById('gateway-limit');
const gatewayRefreshBtn = document.getElementById('gateway-refresh-btn');
const gatewayPublishCommentIdInput = document.getElementById('gateway-publish-comment-id');
const gatewayPublishSourceInput = document.getElementById('gateway-publish-source');
const gatewayPublishForceInput = document.getElementById('gateway-publish-force');
const gatewayPublishReplyInput = document.getElementById('gateway-publish-reply');
const gatewayPublishBtn = document.getElementById('gateway-publish-btn');
const commentDetailIdInput = document.getElementById('comment-detail-id');
const commentDetailQueryBtn = document.getElementById('comment-detail-query-btn');
const commentDetailClearBtn = document.getElementById('comment-detail-clear-btn');
const commentDetailResultEl = document.getElementById('comment-detail-result');
const commentDetailMetaEl = document.getElementById('comment-detail-meta');
const jobDetailIdInput = document.getElementById('job-detail-id');
const jobDetailQueryBtn = document.getElementById('job-detail-query-btn');
const jobDetailClearBtn = document.getElementById('job-detail-clear-btn');
const jobDetailResultEl = document.getElementById('job-detail-result');
const jobDetailMetaEl = document.getElementById('job-detail-meta');
const singleRetryJobIdInput = document.getElementById('single-retry-job-id');
const singleRetryForceLongInput = document.getElementById('single-retry-force-long');
const singleRetryAutoResetForceInput = document.getElementById('single-retry-auto-reset-force');
const singleRetryBtn = document.getElementById('single-retry-btn');
if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(prefs.autoRefreshSeconds));
if (dailySimpleInput && typeof prefs.dailySimple === 'boolean') dailySimpleInput.checked = prefs.dailySimple;
if (singleRetryAutoResetForceInput) singleRetryAutoResetForceInput.checked = prefs.singleRetryAutoResetForce !== false;
applyPublisherModeStatus(PUBLISHER_MODE);
if (autoRefreshInput && typeof prefs.autoRefreshEnabled === 'boolean') autoRefreshInput.checked = prefs.autoRefreshEnabled;
if (autoRefreshInput?.checked) toggleAutoRefresh();
refreshStyleProfile();
refreshRoleProfile();
refreshRoleCards();
renderPrefsSnapshot(prefs);
updateBatchActionState();

if (roleCardSelect) {
  roleCardSelect.addEventListener('change', () => {
    const item = roleCardByKey(roleCardSelect.value);
    if (item) renderRoleCardEditor(item);
  });
}

if (autoRefreshSecondsInput) {
  autoRefreshSecondsInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (autoRefreshInput?.checked) return;
    queueFullRefresh();
  });
}

if (commentDetailIdInput) {
  commentDetailIdInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    queryCommentDetail();
  });
}

if (jobDetailIdInput) {
  jobDetailIdInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    queryJobDetail();
  });
}

if (singleRetryAutoResetForceInput) {
  singleRetryAutoResetForceInput.addEventListener('change', onSingleRetryAutoResetForceChange);
}

if (singleRetryJobIdInput) {
  singleRetryJobIdInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    retrySingleJob();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideToast();
    closeHelpPanel();
    return;
  }

  if ((event.key === '?' || (event.key === '/' && event.shiftKey))) {
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
    toggleHelpPanel();
    return;
  }

  if (event.key !== 'r' && event.key !== 'R') return;
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
  queueFullRefresh();
});

if (!autoRefreshInput?.checked) queueFullRefresh();
</script>
</body>
</html>
"""
    return html.replace("__PUBLISHER_MODE__", settings.publisher_mode)


@router.get("/api/admin/knowledge")
def list_knowledge_entries(db: Session = Depends(get_db)):
    items = db.query(KnowledgeEntry).order_by(KnowledgeEntry.updated_at.desc(), KnowledgeEntry.id.desc()).all()
    return {
        "ok": True,
        "items": [
            {
                "id": item.id,
                "category": item.category,
                "title": item.title,
                "content": item.content,
                "enabled": bool(item.enabled),
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in items
        ],
    }


@router.post("/api/admin/knowledge")
def create_knowledge_entry(payload: dict, db: Session = Depends(get_db)):
    category = str(payload.get("category") or "").strip()
    title = str(payload.get("title") or "").strip()
    content = str(payload.get("content") or "").strip()

    if not category:
        raise HTTPException(status_code=400, detail="category_required")
    if not title:
        raise HTTPException(status_code=400, detail="title_required")
    if not content:
        raise HTTPException(status_code=400, detail="content_required")

    item = KnowledgeEntry(category=category, title=title, content=content, enabled=True)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "ok": True,
        "item": {
            "id": item.id,
            "category": item.category,
            "title": item.title,
            "content": item.content,
            "enabled": bool(item.enabled),
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        },
    }


@router.post("/api/admin/knowledge/{entry_id}/disable")
def disable_knowledge_entry(entry_id: int, db: Session = Depends(get_db)):
    item = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="knowledge_not_found")

    item.enabled = False
    db.commit()
    db.refresh(item)
    return {
        "ok": True,
        "item": {
            "id": item.id,
            "enabled": bool(item.enabled),
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        },
    }


@router.get("/api/admin/style-profile")
def get_style_profile():
    return {
        "ok": True,
        "style_profile": settings.style_profile_default,
        "preset_profiles": ["auto", "empathy", "meme", "normal"],
    }


@router.post("/api/admin/style-profile")
def set_style_profile(payload: dict):
    value = str(payload.get("style_profile") or "").strip().lower()
    allowed = {"auto", "empathy", "meme", "normal"}
    if value not in allowed:
        raise HTTPException(status_code=400, detail="invalid_style_profile")

    settings.style_profile_default = value
    return {"ok": True, "style_profile": settings.style_profile_default}


@router.get("/api/admin/role-profile")
def get_role_profile():
    return {
        "ok": True,
        "role_profile": settings.role_profile_default,
        "preset_profiles": ["auto", "default", "comfort", "playful"],
    }


@router.post("/api/admin/role-profile")
def set_role_profile(payload: dict):
    value = str(payload.get("role_profile") or "").strip().lower()
    allowed = {"auto", "default", "comfort", "playful"}
    if value not in allowed:
        raise HTTPException(status_code=400, detail="invalid_role_profile")

    settings.role_profile_default = value
    return {"ok": True, "role_profile": settings.role_profile_default}


@router.get("/api/admin/role-cards")
def list_role_cards(db: Session = Depends(get_db)):
    items = db.query(RoleCard).order_by(RoleCard.updated_at.desc(), RoleCard.id.desc()).all()
    active_item = db.query(RoleCard).filter(RoleCard.is_active.is_(True)).order_by(RoleCard.updated_at.desc(), RoleCard.id.desc()).first()
    return {
        "ok": True,
        "active_role_card_key": active_item.key if active_item and active_item.enabled else None,
        "items": [
            {
                "id": item.id,
                "key": item.key,
                "name": item.name,
                "description": item.description,
                "system_prompt": item.system_prompt,
                "tone": item.tone or {},
                "constraints": item.constraints or {},
                "enabled": bool(item.enabled),
                "is_active": bool(item.is_active),
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in items
        ],
    }


@router.post("/api/admin/role-cards")
def create_role_card(payload: dict, db: Session = Depends(get_db)):
    key = str(payload.get("key") or "").strip().lower()
    name = str(payload.get("name") or "").strip()
    description = str(payload.get("description") or "").strip()
    system_prompt = str(payload.get("system_prompt") or "").strip()
    tone = payload.get("tone") if isinstance(payload.get("tone"), dict) else {}
    constraints = payload.get("constraints") if isinstance(payload.get("constraints"), dict) else {}
    enabled = bool(payload.get("enabled", True))

    if not key:
        raise HTTPException(status_code=400, detail="role_card_key_required")
    if not name:
        raise HTTPException(status_code=400, detail="role_card_name_required")

    existing = db.query(RoleCard).filter(RoleCard.key == key).first()
    if existing:
        raise HTTPException(status_code=400, detail="role_card_key_exists")

    item = RoleCard(
        key=key,
        name=name,
        description=description,
        system_prompt=system_prompt,
        tone=tone,
        constraints=constraints,
        enabled=enabled,
        is_active=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "ok": True,
        "item": {
            "id": item.id,
            "key": item.key,
            "name": item.name,
            "description": item.description,
            "system_prompt": item.system_prompt,
            "tone": item.tone or {},
            "constraints": item.constraints or {},
            "enabled": bool(item.enabled),
            "is_active": bool(item.is_active),
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        },
    }


@router.post("/api/admin/role-cards/{card_key}")
def update_role_card(card_key: str, payload: dict, db: Session = Depends(get_db)):
    normalized_key = str(card_key or "").strip().lower()
    item = db.query(RoleCard).filter(RoleCard.key == normalized_key).first()
    if not item:
        raise HTTPException(status_code=404, detail="role_card_not_found")

    if "name" in payload:
        name = str(payload.get("name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="role_card_name_required")
        item.name = name
    if "description" in payload:
        item.description = str(payload.get("description") or "").strip()
    if "system_prompt" in payload:
        item.system_prompt = str(payload.get("system_prompt") or "").strip()
    if "tone" in payload:
        item.tone = payload.get("tone") if isinstance(payload.get("tone"), dict) else {}
    if "constraints" in payload:
        item.constraints = payload.get("constraints") if isinstance(payload.get("constraints"), dict) else {}
    if "enabled" in payload:
        item.enabled = bool(payload.get("enabled"))
        if not item.enabled:
            item.is_active = False

    db.commit()
    db.refresh(item)
    return {
        "ok": True,
        "item": {
            "id": item.id,
            "key": item.key,
            "name": item.name,
            "description": item.description,
            "system_prompt": item.system_prompt,
            "tone": item.tone or {},
            "constraints": item.constraints or {},
            "enabled": bool(item.enabled),
            "is_active": bool(item.is_active),
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        },
    }


@router.post("/api/admin/role-cards/{card_key}/disable")
def disable_role_card(card_key: str, db: Session = Depends(get_db)):
    normalized_key = str(card_key or "").strip().lower()
    item = db.query(RoleCard).filter(RoleCard.key == normalized_key).first()
    if not item:
        raise HTTPException(status_code=404, detail="role_card_not_found")

    item.enabled = False
    item.is_active = False
    db.commit()
    db.refresh(item)
    return {
        "ok": True,
        "item": {
            "key": item.key,
            "enabled": bool(item.enabled),
            "is_active": bool(item.is_active),
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        },
    }


@router.post("/api/admin/role-cards/{card_key}/activate")
def activate_role_card(card_key: str, db: Session = Depends(get_db)):
    normalized_key = str(card_key or "").strip().lower()
    item = db.query(RoleCard).filter(RoleCard.key == normalized_key).first()
    if not item:
        raise HTTPException(status_code=404, detail="role_card_not_found")
    if not item.enabled:
        raise HTTPException(status_code=400, detail="role_card_disabled")

    db.query(RoleCard).filter(RoleCard.is_active.is_(True)).update({RoleCard.is_active: False})
    item.is_active = True
    db.commit()
    db.refresh(item)
    return {"ok": True, "active_role_card_key": item.key}
