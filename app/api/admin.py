from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api import comments as comments_api
from app.api import gateway as gateway_api
from app.api.auth import require_api_key
from app.db import get_db
from app.models.entities import KnowledgeEntry, RoleCard
from app.services.observability import get_observability_summary
from app.settings import settings

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
      <span id="publisher-mode-current" class="mono" role="status" aria-live="polite">当前发布模式: -</span>
      <span class="mode-note">推荐稳态路径：<code>manual_queue / simulated</code></span>
    </div>

    <div class="toolbar">
      <label><input id="auto-refresh" type="checkbox" onchange="toggleAutoRefresh()" /> 自动刷新</label>
      <input id="auto-refresh-seconds" type="number" min="3" max="300" value="15" onchange="onAutoRefreshSecondsChange()" aria-label="自动刷新间隔秒数" />
      <button id="full-refresh-btn" onclick="queueFullRefresh()" aria-label="立即全量刷新面板数据">立即全量刷新</button>
      <select id="style-profile-select" aria-label="回复风格选择">
        <option value="auto">auto</option>
        <option value="empathy">empathy</option>
        <option value="meme">meme</option>
        <option value="normal">normal</option>
      </select>
      <button id="style-profile-apply-btn" onclick="applyStyleProfile()" aria-label="应用回复风格配置">应用风格</button>
      <button id="style-profile-refresh-btn" onclick="refreshStyleProfile()" aria-label="读取当前回复风格配置">读取风格</button>
      <span id="style-profile-current" class="mono" role="status" aria-live="polite">风格: -</span>
      <select id="role-profile-select" aria-label="角色档位选择">
        <option value="auto">auto</option>
        <option value="default">default</option>
        <option value="comfort">comfort</option>
        <option value="playful">playful</option>
      </select>
      <button id="role-profile-apply-btn" onclick="applyRoleProfile()" aria-label="应用角色档位配置">应用角色卡</button>
      <button id="role-profile-refresh-btn" onclick="refreshRoleProfile()" aria-label="读取当前角色档位配置">读取角色卡</button>
      <span id="role-profile-current" class="mono" role="status" aria-live="polite">角色卡: -</span>
      <button onclick="toggleHelpPanel()" aria-label="显示或隐藏帮助面板">帮助 (?)</button>
      <button id="prefs-reset-btn" onclick="resetUiPrefs()" aria-label="重置页面偏好设置">重置偏好</button>
      <button id="prefs-export-btn" onclick="exportUiPrefs()" aria-label="导出页面偏好配置">导出偏好</button>
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
