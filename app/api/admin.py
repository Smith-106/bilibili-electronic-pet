import re

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api import comments as comments_api
from app.api import gateway as gateway_api
from app.api.auth import require_api_key
from app.db import get_db
from app.models.entities import KnowledgeEntry, RoleCard, BilibiliVideo, BilibiliCredential
from app.services.observability import get_observability_summary
from app.settings import settings

# BVID 格式验证正则表达式
BVID_PATTERN = re.compile(r"^BV[a-zA-Z0-9]{10}$")

router = APIRouter(tags=["admin"], dependencies=[Depends(require_api_key)])
ADMIN_LIST_LIMIT_MAX = 1000
ADMIN_LIST_OFFSET_MAX = 100000


@router.get("/admin", response_class=HTMLResponse)
def admin_page():
    html = """
<!doctype html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>Bili Pet Admin</title>
    <link rel="stylesheet" href="/static/admin/admin.css" />
</head>
<body>
  <div class="admin-layout">
    <aside class="side-nav mono" aria-label="管理导航">
      <div class="side-nav-title">Admin Navigation</div>
      <a href="#section-overview">系统概览</a>
      <a href="#section-role-cards">角色卡</a>
      <a href="#section-knowledge">知识库</a>
      <a href="#section-bilibili">B站集成</a>
      <a href="#section-daily">趋势</a>
      <a href="#section-jobs">任务</a>
      <a href="#section-single-diagnostics">诊断</a>
      <a href="#section-gateway">发布网关</a>
      <a href="#section-audit">审计</a>
    </aside>

    <main class="admin-main">
  <div class="shell">
    <h1>Bili Pet 管理页</h1>
    <p class="page-subtitle">统一工作台：系统概览、角色卡、知识库、任务队列、发布网关与审计全链路可视化。</p>

    <div class="quick-nav mono">
      <a href="#section-overview">系统概览</a>
      <a href="#section-role-cards">角色卡</a>
      <a href="#section-knowledge">知识库</a>
      <a href="#section-bilibili">B站集成</a>
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
      <span id="publisher-mode-current" class="mono" role="status" aria-live="polite">当前发布模式: -</span>
      <span class="mode-note">推荐稳态路径：<code>manual_queue / simulated</code></span>
    </div>

    <div class="toolbar">
      <label><input id="auto-refresh" type="checkbox" onchange="toggleAutoRefresh()" /> 自动刷新</label>
      <input id="auto-refresh-seconds" type="number" min="3" max="300" value="15" onchange="onAutoRefreshSecondsChange()" aria-label="自动刷新间隔秒数" />
      <button class="btn-primary" id="full-refresh-btn" onclick="queueFullRefresh()" aria-label="立即全量刷新面板数据">立即全量刷新</button>
      <select id="style-profile-select" aria-label="回复风格选择">
        <option value="auto">auto</option>
        <option value="empathy">empathy</option>
        <option value="meme">meme</option>
        <option value="normal">normal</option>
      </select>
      <button class="btn-accent" id="style-profile-apply-btn" onclick="applyStyleProfile()" aria-label="应用回复风格配置">应用风格</button>
      <button class="btn-ghost" id="style-profile-refresh-btn" onclick="refreshStyleProfile()" aria-label="读取当前回复风格配置">读取风格</button>
      <span id="style-profile-current" class="mono" role="status" aria-live="polite">风格: -</span>
      <select id="role-profile-select" aria-label="角色档位选择">
        <option value="auto">auto</option>
        <option value="default">default</option>
        <option value="comfort">comfort</option>
        <option value="playful">playful</option>
      </select>
      <button class="btn-accent" id="role-profile-apply-btn" onclick="applyRoleProfile()" aria-label="应用角色档位配置">应用角色卡</button>
      <button class="btn-ghost" id="role-profile-refresh-btn" onclick="refreshRoleProfile()" aria-label="读取当前角色档位配置">读取角色卡</button>
      <span id="role-profile-current" class="mono" role="status" aria-live="polite">角色卡: -</span>
      <button onclick="toggleHelpPanel()" aria-label="显示或隐藏帮助面板">帮助 (?)</button>
      <button class="btn-ghost" id="prefs-reset-btn" onclick="resetUiPrefs()" aria-label="重置页面偏好设置">重置偏好</button>
      <button class="btn-ghost" id="prefs-export-btn" onclick="exportUiPrefs()" aria-label="导出页面偏好配置">导出偏好</button>
      <button id="prefs-import-btn" onclick="triggerImportUiPrefs()" aria-label="导入页面偏好配置">导入偏好</button>
      <input id="ui-prefs-file" class="hidden" type="file" accept="application/json" onchange="importUiPrefsFromFile(event)" />
      <span id="refresh-status" class="mono status-pill status-idle clickable" onclick="showRefreshErrorDetail()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showRefreshErrorDetail();}" tabindex="0" title="点击查看详细错误（仅在失败/部分失败时有内容）" role="status" aria-live="polite" aria-label="刷新状态信息，点击查看详情">状态: 未刷新</span>
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
      <div class="mt-8">
        <div class="mb-6"><strong>当前偏好快照</strong></div>
        <pre id="prefs-snapshot" class="mono prefs-snapshot">{}</pre>
      </div>
      <div class="mt-8"><button onclick="toggleHelpPanel()" aria-label="关闭帮助面板">关闭</button></div>
    </div>
  </div>


  <h2 id="section-overview" class="section-title">系统概览</h2>
  <div class="cards">
    <div class="card"><div class="card-title">评论总数</div><div id="card-comments" class="card-value" role="status" aria-live="polite">-</div></div>
    <div class="card"><div class="card-title">任务总数</div><div id="card-jobs" class="card-value" role="status" aria-live="polite">-</div></div>
    <div class="card"><div class="card-title">已发布</div><div id="card-published" class="card-value" role="status" aria-live="polite">-</div></div>
    <div class="card"><div class="card-title">待人工处理</div><div id="card-manual" class="card-value" role="status" aria-live="polite">-</div></div>
  </div>

  <h2 id="section-role-cards" class="section-title">角色卡工作台</h2>
  <div class="panel">
    <div class="toolbar">
      <button id="role-cards-refresh-btn" onclick="refreshRoleCards()" aria-label="刷新角色卡列表">刷新角色卡</button>
      <button id="role-card-new-btn" onclick="newRoleCardDraft()" aria-label="新建角色卡草稿">新建角色卡</button>
      <button id="role-card-clone-btn" onclick="cloneRoleCard()" aria-label="复制当前角色卡">复制当前</button>
      <button id="role-card-save-btn" onclick="saveRoleCard()" aria-label="保存当前角色卡">保存角色卡</button>
      <button id="role-card-disable-btn" onclick="disableRoleCard()" aria-label="禁用当前角色卡">禁用当前</button>
      <button id="role-card-activate-btn" onclick="activateRoleCard()" aria-label="激活当前角色卡">激活当前</button>
      <span id="active-role-card-current" class="mono" role="status" aria-live="polite">激活角色卡: -</span>
      <span class="mono">兼容档位请继续使用上方“应用角色卡(旧)”。</span>
    </div>
    <div class="toolbar">
      <label class="mono">列表</label>
      <select id="role-card-select" aria-label="角色卡列表选择"></select>
      <label class="mono">key</label>
      <input id="role-card-key" type="text" placeholder="comfort_plus" aria-label="角色卡 key" />
      <label class="mono">name</label>
      <input id="role-card-name" type="text" placeholder="安抚陪伴增强" aria-label="角色卡名称" />
      <label><input id="role-card-enabled" type="checkbox" checked aria-label="角色卡启用状态" /> enabled</label>
    </div>
    <div class="toolbar toolbar-top">
      <div class="flex-1-280">
        <div class="mono field-label">description</div>
        <textarea id="role-card-description" class="ta-h-70" aria-label="角色卡描述"></textarea>
      </div>
      <div class="flex-2-320">
        <div class="mono field-label">system_prompt</div>
        <textarea id="role-card-system-prompt" class="ta-h-120" aria-label="角色卡系统提示词"></textarea>
      </div>
    </div>
    <div class="toolbar toolbar-top">
      <div class="flex-1-280">
        <div class="mono field-label">tone (JSON)</div>
        <textarea id="role-card-tone" class="ta-h-90" aria-label="角色卡语气 JSON">{}</textarea>
      </div>
      <div class="flex-1-280">
        <div class="mono field-label">constraints (JSON)</div>
        <textarea id="role-card-constraints" class="ta-h-90" aria-label="角色卡约束 JSON">{}</textarea>
      </div>
    </div>
  </div>

  <h2 id="section-knowledge" class="section-title">知识库管理</h2>
  <div class="panel">
    <div class="toolbar">
      <button id="knowledge-refresh-btn" onclick="refreshKnowledgeEntries()" aria-label="刷新知识库条目">刷新知识库</button>
      <input id="knowledge-category" type="text" placeholder="分类，如 safety" aria-label="知识库分类" />
      <input id="knowledge-title" type="text" placeholder="标题" aria-label="知识库标题" />
      <button id="knowledge-create-btn" onclick="createKnowledgeEntry()" aria-label="新增知识库条目">新增知识条目</button>
    </div>
    <div class="toolbar toolbar-top">
      <div class="flex-1-320">
        <div class="mono field-label">content</div>
        <textarea id="knowledge-content" class="ta-h-90" aria-label="知识库内容"></textarea>
      </div>
    </div>
    <div class="table-wrap">
      <table aria-label="知识库条目表">
        <thead>
          <tr>
            <th scope="col">ID</th><th scope="col">category</th><th scope="col">title</th><th scope="col">enabled</th><th scope="col">content</th><th scope="col">updated_at</th><th scope="col">操作</th>
          </tr>
        </thead>
        <tbody id="knowledge-entries"></tbody>
      </table>
    </div>
  </div>

  <h2 id="section-bilibili" class="section-title">B站集成</h2>
  <div class="panel">
    <div class="toolbar">
      <button id="bilibili-status-refresh-btn" onclick="refreshBilibiliStatus()" aria-label="刷新B站状态">刷新状态</button>
      <button id="bilibili-poll-btn" onclick="triggerBilibiliPoll()" aria-label="手动触发评论轮询">手动轮询</button>
      <span id="bilibili-status-indicator" class="mono status-pill status-idle" role="status" aria-live="polite">状态: 未加载</span>
    </div>

    <div class="cards">
      <div class="card"><div class="card-title">集成状态</div><div id="card-bilibili-enabled" class="card-value" role="status" aria-live="polite">-</div></div>
      <div class="card"><div class="card-title">评论轮询</div><div id="card-bilibili-poll" class="card-value" role="status" aria-live="polite">-</div></div>
      <div class="card"><div class="card-title">真实发布</div><div id="card-bilibili-publish" class="card-value" role="status" aria-live="polite">-</div></div>
      <div class="card"><div class="card-title">监控视频数</div><div id="card-bilibili-videos" class="card-value" role="status" aria-live="polite">-</div></div>
    </div>

    <h3 class="subsection-title">视频监控列表</h3>
    <div class="toolbar">
      <input id="bilibili-video-bvid" type="text" placeholder="BV号 (如: BV1xx411c7mD)" aria-label="视频BV号" />
      <label><input id="bilibili-video-poll-enabled" type="checkbox" checked aria-label="启用轮询" /> 启用轮询</label>
      <button id="bilibili-video-add-btn" onclick="addBilibiliVideo()" aria-label="添加视频到监控">添加视频</button>
      <button id="bilibili-videos-refresh-btn" onclick="refreshBilibiliVideos()" aria-label="刷新视频列表">刷新列表</button>
    </div>
    <div class="table-wrap">
      <table aria-label="B站视频监控列表">
        <thead>
          <tr>
            <th scope="col">ID</th><th scope="col">BV号</th><th scope="col">标题</th><th scope="col">轮询</th><th scope="col">最后轮询</th><th scope="col">最后rpid</th><th scope="col">操作</th>
          </tr>
        </thead>
        <tbody id="bilibili-videos"></tbody>
      </table>
    </div>

    <h3 class="subsection-title">凭证管理</h3>
    <div class="toolbar">
      <input id="credential-name" type="text" placeholder="凭证名称" aria-label="凭证名称" />
      <input id="credential-sessdata" type="password" placeholder="SESSDATA" aria-label="SESSDATA" />
      <input id="credential-bili-jct" type="password" placeholder="bili_jct" aria-label="bili_jct" />
      <input id="credential-buvid3" type="text" placeholder="buvid3" aria-label="buvid3" />
      <input id="credential-buvid4" type="text" placeholder="buvid4 (可选)" aria-label="buvid4" />
      <input id="credential-expires" type="date" aria-label="过期日期" />
      <button id="credential-add-btn" onclick="addBilibiliCredential()" aria-label="添加凭证">添加凭证</button>
      <button id="credentials-refresh-btn" onclick="refreshBilibiliCredentials()" aria-label="刷新凭证列表">刷新列表</button>
    </div>
    <div class="table-wrap">
      <table aria-label="B站凭证列表">
        <thead>
          <tr>
            <th scope="col">ID</th><th scope="col">名称</th><th scope="col">激活</th><th scope="col">SESSDATA</th><th scope="col">buvid3</th><th scope="col">过期时间</th><th scope="col">最后使用</th><th scope="col">操作</th>
          </tr>
        </thead>
        <tbody id="bilibili-credentials"></tbody>
      </table>
    </div>
  </div>

  <h2 id="section-daily" class="section-title">近 7 天趋势</h2>
  <div class=\"toolbar\">
    <input id=\"daily-days\" type=\"number\" min=\"1\" max=\"60\" value=\"7\" aria-label=\"趋势统计天数\" />
    <label><input id=\"daily-simple\" type=\"checkbox\" onchange=\"onDailySimpleChange()\" aria-label=\"切换趋势简版视图\" /> 简版视图</label>
    <button id=\"daily-refresh-btn\" onclick=\"refreshDailyMetrics()\" aria-label=\"刷新近7天趋势数据\">刷新趋势</button>
  </div>

  <div class=\"table-wrap\">
    <table aria-label=\"趋势统计表\">
      <thead>
        <tr id="daily-head-full">
          <th scope="col">日期</th><th scope="col">总量</th><th scope="col">published</th><th scope="col">manual_queue</th><th scope="col">blocked</th><th scope="col">dedupe_skipped</th><th scope="col">skipped</th>
        </tr>
        <tr id="daily-head-simple" class="hidden">
          <th scope="col">日期</th><th scope="col">published</th><th scope="col">manual_queue</th>
        </tr>
      </thead>
      <tbody id=\"daily-metrics\"></tbody>
    </table>
  </div>

  <h2 id=\"section-jobs\" class=\"section-title\">任务列表</h2>
  <div class=\"toolbar\">
    <select id=\"status\" aria-label=\"任务状态筛选\">
      <option value=\"\">全部状态</option>
      <option value=\"manual_queue\">manual_queue</option>
      <option value=\"blocked\">blocked</option>
      <option value=\"dedupe_skipped\">dedupe_skipped</option>
      <option value=\"published\">published</option>
      <option value=\"skipped\">skipped</option>
    </select>
    <input id=\"limit\" type=\"number\" min=\"1\" max=\"200\" value=\"30\" aria-label=\"任务列表返回条数\" />
    <button id=\"jobs-refresh-btn\" onclick=\"refreshJobs()\" aria-label=\"刷新任务列表\">刷新</button>
    <button id=\"batch-approve-btn\" onclick=\"batchApprove()\" disabled aria-label=\"批量审批选中任务\">批量 Approve</button>
    <button id=\"batch-retry-btn\" onclick=\"batchRetry()\" disabled aria-label=\"批量重试选中任务\">批量 Retry</button>
    <span id=\"batch-selected-count\" class=\"mono\" role=\"status\" aria-live=\"polite\">已选 0</span>
    <button id=\"jobs-export-btn\" onclick=\"exportCsv()\" aria-label=\"导出任务列表 CSV\">导出 CSV</button>
  </div>

  <div class=\"table-wrap\">
    <table aria-label=\"任务列表数据表\">
      <thead>
        <tr>
          <th scope="col">选择</th><th scope="col">ID</th><th scope="col">状态</th><th scope="col">comment_id</th><th scope="col">评论</th><th scope="col">回复</th><th scope="col">risk_flags</th><th scope="col">操作</th>
        </tr>
      </thead>
      <tbody id=\"jobs\"></tbody>
    </table>
  </div>

  <h2 id=\"section-single-diagnostics\" class=\"section-title\">单项诊断 / 操作</h2>
  <div class=\"panel\">
    <div class=\"toolbar\">
      <input id=\"comment-detail-id\" type=\"text\" placeholder=\"comment_id\" aria-label=\"评论详情查询 comment_id\" />
      <button id=\"comment-detail-query-btn\" onclick=\"queryCommentDetail()\" aria-label=\"查询指定评论详情\">查询评论详情</button>
      <button id=\"comment-detail-clear-btn\" onclick=\"clearCommentDetailResult()\" aria-label=\"清空评论详情结果\">清空</button>
      <span class=\"mono\">GET /api/comments/{comment_id}</span>
    </div>
    <div id=\"comment-detail-result\" class=\"mono\" role=\"status\" aria-live=\"polite\">未查询评论详情</div>
    <div id=\"comment-detail-meta\" class=\"mono\" role=\"status\" aria-live=\"polite\">上次查询: -</div>

    <div class=\"toolbar toolbar-mt-12\">
      <input id=\"job-detail-id\" type=\"number\" min=\"1\" placeholder=\"job_id\" aria-label=\"任务详情查询 job_id\" />
      <button id=\"job-detail-query-btn\" onclick=\"queryJobDetail()\" aria-label=\"查询指定任务详情\">查询任务详情</button>
      <button id=\"job-detail-clear-btn\" onclick=\"clearJobDetailResult()\" aria-label=\"清空任务详情结果\">清空</button>
      <span class=\"mono\">GET /api/jobs/{job_id}</span>
    </div>
    <div id=\"job-detail-result\" class=\"mono\" role=\"status\" aria-live=\"polite\">未查询任务详情</div>
    <div id=\"job-detail-meta\" class=\"mono\" role=\"status\" aria-live=\"polite\">上次查询: -</div>

    <div class=\"toolbar toolbar-mt-12\">
      <input id=\"single-retry-job-id\" type=\"number\" min=\"1\" placeholder=\"job_id\" aria-label=\"单任务重试 job_id\" />
      <label><input id=\"single-retry-force-long\" type=\"checkbox\" aria-label=\"单任务重试启用 force_long\" /> force_long</label>
      <label><input id=\"single-retry-auto-reset-force\" type=\"checkbox\" checked aria-label=\"单任务重试成功后重置 force_long\" /> 成功后重置 force_long</label>
      <button id=\"single-retry-btn\" onclick=\"retrySingleJob()\" aria-label=\"重试指定任务\">单任务重试</button>
      <span class=\"mono\">POST /api/jobs/{job_id}/retry</span>
    </div>
  </div>

  <h2 id=\"section-gateway\" class=\"section-title\">发布网关日志</h2>
  <div class=\"panel\">
    <div class=\"toolbar toolbar-top\">
      <input id=\"gateway-publish-comment-id\" type=\"text\" placeholder=\"comment_id\" aria-label=\"手动发布 comment_id\" />
      <input id=\"gateway-publish-source\" type=\"text\" placeholder=\"source (默认 bili-pet-bot)\" aria-label=\"手动发布来源 source\" />
      <label><input id=\"gateway-publish-force\" type=\"checkbox\" aria-label=\"手动发布启用 force_publish\" /> force_publish</label>
      <button id=\"gateway-publish-btn\" onclick=\"publishGatewayReply()\" aria-label=\"手动发布网关回复\">手动发布一条</button>
    </div>
    <div class=\"toolbar toolbar-top\">
      <div class=\"flex-1-320\">
        <div class=\"mono field-label\">reply_text</div>
        <textarea id=\"gateway-publish-reply\" class=\"ta-h-90\" placeholder=\"输入要发布的回复内容\" aria-label=\"手动发布回复内容\"></textarea>
      </div>
    </div>
    <div class=\"toolbar\">
      <input id=\"gateway-comment-id\" type=\"text\" placeholder=\"comment_id (可选)\" aria-label=\"网关日志筛选 comment_id\" />
      <input id=\"gateway-limit\" type=\"number\" min=\"1\" max=\"200\" value=\"50\" aria-label=\"网关日志返回条数\" />
      <button id=\"gateway-refresh-btn\" onclick=\"refreshGatewayLogs()\" aria-label=\"刷新发布网关日志\">刷新网关日志</button>
    </div>
    <div class=\"table-wrap\">
      <table aria-label=\"发布网关日志表\">
        <thead>
          <tr>
            <th scope="col">ID</th><th scope="col">comment_id</th><th scope="col">source</th><th scope="col">reply_hash</th><th scope="col">created_at</th>
          </tr>
        </thead>
        <tbody id=\"gateway-logs\"></tbody>
      </table>
    </div>
  </div>

  <h2 id=\"section-audit\" class=\"section-title\">审计日志</h2>
  <div class=\"toolbar\">
    <select id=\"audit-action\" aria-label=\"审计操作类型筛选\">
      <option value=\"\">全部操作</option>
      <option value=\"approve_single\">approve_single</option>
      <option value=\"approve_batch\">approve_batch</option>
      <option value=\"retry_single\">retry_single</option>
      <option value=\"retry_batch\">retry_batch</option>
    </select>
    <select id=\"audit-ok\" aria-label=\"审计结果筛选\">
      <option value=\"\">全部结果</option>
      <option value=\"true\">成功</option>
      <option value=\"false\">失败</option>
    </select>
    <input id=\"audit-limit\" type=\"number\" min=\"1\" max=\"1000\" value=\"100\" aria-label=\"审计日志返回条数\" />
    <button id=\"audit-refresh-btn\" onclick=\"refreshAuditLogs()\" aria-label=\"刷新审计日志\">刷新日志</button>
    <button id=\"audit-export-btn\" onclick=\"exportAuditCsv()\" aria-label=\"导出审计日志 CSV\">导出日志 CSV</button>
    <input id=\"audit-summary-days\" type=\"number\" min=\"1\" max=\"90\" value=\"7\" aria-label=\"审计摘要统计天数\" />
    <button id=\"audit-summary-refresh-btn\" onclick=\"refreshAuditSummary()\" aria-label=\"刷新审计摘要\">刷新审计摘要</button>
  </div>

  <div class=\"cards\">
    <div class=\"card\"><div class=\"card-title\">审计总量</div><div id=\"card-audit-total\" class=\"card-value\" role=\"status\" aria-live=\"polite\">-</div></div>
    <div class=\"card\"><div class=\"card-title\">成功数</div><div id=\"card-audit-ok\" class=\"card-value\" role=\"status\" aria-live=\"polite\">-</div></div>
    <div class=\"card\"><div class=\"card-title\">失败数</div><div id=\"card-audit-failed\" class=\"card-value\" role=\"status\" aria-live=\"polite\">-</div></div>
    <div class=\"card\"><div class=\"card-title\">最高频 action</div><div id=\"card-audit-top-action\" class=\"card-value card-value-small mono\" role=\"status\" aria-live=\"polite\">-</div></div>
  </div>

  <div class=\"table-wrap\">
    <table aria-label=\"审计日志表\">
      <thead>
        <tr>
          <th scope="col">ID</th><th scope="col">action</th><th scope="col">ok</th><th scope="col">target_id</th><th scope="col">payload</th><th scope="col">created_at</th>
        </tr>
      </thead>
      <tbody id=\"audit-logs\"></tbody>
    </table>
  </div>

  <div id="toast" class="toast" onclick="hideToast()" onmouseenter="pauseToastAutoHide()" onmouseleave="resumeToastAutoHide()" role="alertdialog" aria-live="assertive" aria-modal="false" aria-labelledby="toast-title" aria-describedby="toast-content">
    <div id="toast-title" class="toast-title">提示</div>
    <pre id="toast-content" class="mono"></pre>
    <div class="toast-actions">
      <button id="toast-copy" class="toast-btn hidden" onclick="copyToastContent(event)" aria-label="复制提示详情">复制详情</button>
      <button class="toast-btn" onclick="hideToast(event)" aria-label="关闭提示框">关闭</button>
    </div>
  </div>

    </main>
  </div>

<script>window.__PUBLISHER_MODE__ = "__PUBLISHER_MODE__";</script>
<script src="/static/admin/admin.js"></script>
</body>
</html>
"""
    return html.replace("__PUBLISHER_MODE__", settings.publisher_mode)


@router.get("/api/admin/knowledge")
def list_knowledge_entries(
    limit: int = Query(default=200, ge=1, le=ADMIN_LIST_LIMIT_MAX),
    offset: int = Query(default=0, ge=0, le=ADMIN_LIST_OFFSET_MAX),
    db: Session = Depends(get_db),
):
    items = db.query(KnowledgeEntry).order_by(KnowledgeEntry.updated_at.desc(), KnowledgeEntry.id.desc()).offset(offset).limit(limit).all()
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
    category = str(payload.get("category") or "").strip()[:64]  # Limit length
    title = str(payload.get("title") or "").strip()[:128]  # Limit length
    content = str(payload.get("content") or "").strip()[:65535]  # Text field limit

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
def list_role_cards(
    limit: int = Query(default=200, ge=1, le=ADMIN_LIST_LIMIT_MAX),
    offset: int = Query(default=0, ge=0, le=ADMIN_LIST_OFFSET_MAX),
    db: Session = Depends(get_db),
):
    items = db.query(RoleCard).order_by(RoleCard.updated_at.desc(), RoleCard.id.desc()).offset(offset).limit(limit).all()
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
    key = str(payload.get("key") or "").strip().lower()[:64]  # Limit to DB column size
    name = str(payload.get("name") or "").strip()[:128]  # Limit to DB column size
    description = str(payload.get("description") or "").strip()[:65535]  # Text field limit
    system_prompt = str(payload.get("system_prompt") or "").strip()[:65535]  # Text field limit
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
    normalized_key = str(card_key or "").strip().lower()[:64]  # Limit length
    item = db.query(RoleCard).filter(RoleCard.key == normalized_key).first()
    if not item:
        raise HTTPException(status_code=404, detail="role_card_not_found")

    if "name" in payload:
        name = str(payload.get("name") or "").strip()[:128]  # Limit to DB column size
        if not name:
            raise HTTPException(status_code=400, detail="role_card_name_required")
        item.name = name
    if "description" in payload:
        item.description = str(payload.get("description") or "").strip()[:65535]  # Text field limit
    if "system_prompt" in payload:
        item.system_prompt = str(payload.get("system_prompt") or "").strip()[:65535]  # Text field limit
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


@router.get("/api/admin/observability/summary")
def get_observability_metrics_summary(window_minutes: int = 60):
    return {
        "ok": True,
        "summary": get_observability_summary(window_minutes=window_minutes),
    }


@router.get("/api/admin/metrics/overview")
def admin_metrics_overview(db: Session = Depends(get_db)):
    return comments_api.metrics_overview(db=db)


@router.get("/api/admin/jobs")
def admin_list_jobs(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=comments_api.LIST_LIMIT_MAX),
    offset: int = Query(default=0, ge=0, le=comments_api.LIST_OFFSET_MAX),
    db: Session = Depends(get_db),
):
    return comments_api.list_jobs(status=status, limit=limit, offset=offset, db=db)


@router.get("/api/admin/audit-logs/summary")
def admin_audit_logs_summary(
    days: int = Query(default=7, ge=1, le=90),
    action: str | None = Query(default=None),
    ok: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return comments_api.summarize_audit_logs(days=days, action=action, ok=ok, db=db)


@router.get("/api/admin/gateway/publish-logs")
def admin_gateway_publish_logs(
    comment_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return gateway_api.list_publish_logs(comment_id=comment_id, limit=limit, db=db)


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


# ==================== Bilibili Integration Admin API ====================


@router.get("/api/admin/bilibili/status")
def get_bilibili_status(db: Session = Depends(get_db)):
    """获取 B站集成状态"""
    credential = db.query(BilibiliCredential).filter(BilibiliCredential.is_active.is_(True)).first()
    videos = db.query(BilibiliVideo).filter(BilibiliVideo.poll_enabled.is_(True)).count()

    return {
        "ok": True,
        "config": {
            "enabled": settings.bilibili_enabled,
            "poll_enabled": settings.bilibili_poll_enabled,
            "publish_enabled": settings.bilibili_publish_enabled,
            "poll_interval_seconds": settings.bilibili_poll_interval_seconds,
            "rate_limit_per_minute": settings.bilibili_rate_limit_per_minute,
        },
        "credential": {
            "id": credential.id if credential else None,
            "name": credential.name if credential else None,
            "is_active": credential.is_active if credential else False,
            "expires_at": credential.expires_at.isoformat() if credential and credential.expires_at else None,
            "last_used_at": credential.last_used_at.isoformat() if credential and credential.last_used_at else None,
        } if credential else None,
        "videos": {
            "poll_enabled_count": videos,
        },
    }


@router.get("/api/admin/bilibili/videos")
def list_bilibili_videos(
    poll_enabled: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """获取 B站视频列表"""
    query = db.query(BilibiliVideo)
    if poll_enabled is not None:
        query = query.filter(BilibiliVideo.poll_enabled == poll_enabled)

    items = query.order_by(BilibiliVideo.updated_at.desc()).offset(offset).limit(limit).all()
    total = query.count()

    return {
        "ok": True,
        "total": total,
        "items": [
            {
                "id": item.id,
                "bvid": item.bvid,
                "aid": item.aid,
                "title": item.title,
                "owner_mid": item.owner_mid,
                "poll_enabled": item.poll_enabled,
                "last_polled_at": item.last_polled_at.isoformat() if item.last_polled_at else None,
                "last_rpid": item.last_rpid,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in items
        ],
    }


@router.post("/api/admin/bilibili/videos")
def add_bilibili_video(payload: dict, db: Session = Depends(get_db)):
    """添加视频到监控列表"""
    from app.services.bilibili_client import BilibiliClient

    bvid = str(payload.get("bvid") or "").strip()[:20]  # Limit to DB column size
    poll_enabled = bool(payload.get("poll_enabled", True))

    if not bvid:
        raise HTTPException(status_code=400, detail="bvid_required")

    # 验证 BVID 格式 (BV + 10位字母数字)
    if not BVID_PATTERN.match(bvid):
        raise HTTPException(status_code=400, detail="invalid_bvid_format")

    # 检查是否已存在
    existing = db.query(BilibiliVideo).filter(BilibiliVideo.bvid == bvid).first()
    if existing:
        raise HTTPException(status_code=400, detail="video_already_exists")

    # 同步视频信息
    client = BilibiliClient(db)
    video = client.sync_video_info(bvid, poll_enabled=poll_enabled)

    if not video:
        raise HTTPException(status_code=400, detail="video_info_fetch_failed")

    return {
        "ok": True,
        "item": {
            "id": video.id,
            "bvid": video.bvid,
            "aid": video.aid,
            "title": video.title,
            "owner_mid": video.owner_mid,
            "poll_enabled": video.poll_enabled,
            "last_rpid": video.last_rpid,
        },
    }


@router.post("/api/admin/bilibili/videos/{video_id}/toggle-poll")
def toggle_bilibili_video_poll(video_id: int, payload: dict, db: Session = Depends(get_db)):
    """启用/禁用视频评论轮询"""
    video = db.query(BilibiliVideo).filter(BilibiliVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="video_not_found")

    poll_enabled = bool(payload.get("poll_enabled", not video.poll_enabled))
    video.poll_enabled = poll_enabled
    db.commit()
    db.refresh(video)

    return {
        "ok": True,
        "item": {
            "id": video.id,
            "bvid": video.bvid,
            "poll_enabled": video.poll_enabled,
        },
    }


@router.delete("/api/admin/bilibili/videos/{video_id}")
def delete_bilibili_video(video_id: int, db: Session = Depends(get_db)):
    """删除视频监控"""
    video = db.query(BilibiliVideo).filter(BilibiliVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="video_not_found")

    db.delete(video)
    db.commit()

    return {"ok": True, "deleted_id": video_id}


@router.post("/api/admin/bilibili/videos/{video_id}/sync")
def sync_bilibili_video_info(video_id: int, db: Session = Depends(get_db)):
    """同步视频信息"""
    from app.services.bilibili_client import BilibiliClient

    video = db.query(BilibiliVideo).filter(BilibiliVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="video_not_found")

    client = BilibiliClient(db)
    updated = client.sync_video_info(video.bvid, poll_enabled=video.poll_enabled)

    if not updated:
        raise HTTPException(status_code=400, detail="video_info_fetch_failed")

    return {
        "ok": True,
        "item": {
            "id": updated.id,
            "bvid": updated.bvid,
            "aid": updated.aid,
            "title": updated.title,
            "owner_mid": updated.owner_mid,
        },
    }


@router.post("/api/admin/bilibili/poll")
def trigger_bilibili_poll(db: Session = Depends(get_db)):
    """手动触发评论轮询"""
    from app.services.bilibili_poller import BilibiliPoller

    poller = BilibiliPoller(db)
    result = poller.poll_all_videos()

    return {"ok": True, "result": result}


@router.get("/api/admin/bilibili/credentials")
def list_bilibili_credentials(db: Session = Depends(get_db)):
    """获取 B站凭证列表"""
    items = db.query(BilibiliCredential).order_by(BilibiliCredential.updated_at.desc()).all()

    return {
        "ok": True,
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "is_active": item.is_active,
                "has_sessdata": bool(item.sessdata),
                "has_bili_jct": bool(item.bili_jct),
                "buvid3": item.buvid3[:8] + "..." if item.buvid3 and len(item.buvid3) > 8 else item.buvid3,
                "expires_at": item.expires_at.isoformat() if item.expires_at else None,
                "last_used_at": item.last_used_at.isoformat() if item.last_used_at else None,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in items
        ],
    }


@router.post("/api/admin/bilibili/credentials")
def create_bilibili_credential(payload: dict, db: Session = Depends(get_db)):
    """创建 B站凭证"""
    from app.services.bilibili_client import CredentialEncryption

    name = str(payload.get("name") or "").strip()[:64]  # Limit to DB column size
    sessdata = str(payload.get("sessdata") or "").strip()
    bili_jct = str(payload.get("bili_jct") or "").strip()[:128]  # Limit to DB column size
    buvid3 = str(payload.get("buvid3") or "").strip()[:128]  # Limit to DB column size
    buvid4 = str(payload.get("buvid4") or "").strip()[:128]  # Limit to DB column size
    expires_at = payload.get("expires_at")

    if not name:
        raise HTTPException(status_code=400, detail="name_required")
    if not sessdata:
        raise HTTPException(status_code=400, detail="sessdata_required")
    if not bili_jct:
        raise HTTPException(status_code=400, detail="bili_jct_required")
    if not buvid3:
        raise HTTPException(status_code=400, detail="buvid3_required")

    # 加密存储
    encryption = CredentialEncryption(settings.bilibili_cookie_encryption_key)
    encrypted_sessdata = encryption.encrypt(sessdata)
    encrypted_bili_jct = encryption.encrypt(bili_jct)

    # 如果是第一个凭证，自动激活
    existing_count = db.query(BilibiliCredential).count()
    is_active = existing_count == 0

    credential = BilibiliCredential(
        name=name,
        sessdata=encrypted_sessdata,
        bili_jct=encrypted_bili_jct,
        buvid3=buvid3,
        buvid4=buvid4 or None,
        is_active=is_active,
        expires_at=expires_at if expires_at else None,
    )
    db.add(credential)
    db.commit()
    db.refresh(credential)

    return {
        "ok": True,
        "item": {
            "id": credential.id,
            "name": credential.name,
            "is_active": credential.is_active,
            "expires_at": credential.expires_at.isoformat() if credential.expires_at else None,
        },
    }


@router.post("/api/admin/bilibili/credentials/{credential_id}/activate")
def activate_bilibili_credential(credential_id: int, db: Session = Depends(get_db)):
    """激活凭证"""
    credential = db.query(BilibiliCredential).filter(BilibiliCredential.id == credential_id).first()
    if not credential:
        raise HTTPException(status_code=404, detail="credential_not_found")

    # 停用其他凭证
    db.query(BilibiliCredential).update({BilibiliCredential.is_active: False})
    credential.is_active = True
    db.commit()
    db.refresh(credential)

    return {"ok": True, "active_credential_id": credential.id}


@router.delete("/api/admin/bilibili/credentials/{credential_id}")
def delete_bilibili_credential(credential_id: int, db: Session = Depends(get_db)):
    """删除凭证"""
    credential = db.query(BilibiliCredential).filter(BilibiliCredential.id == credential_id).first()
    if not credential:
        raise HTTPException(status_code=404, detail="credential_not_found")

    db.delete(credential)
    db.commit()

    return {"ok": True, "deleted_id": credential_id}
