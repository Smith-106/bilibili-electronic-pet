from datetime import datetime, timedelta, timezone
from pathlib import Path
import re

from app.api import comments as comments_api
from app.api import gateway as gateway_api
from app.models.entities import KnowledgeEntry, OperationAuditLog, RoleCard
from app.settings import settings


def test_admin_page_returns_html(client):
    response = client.get("/admin")
    assert response.status_code == 200
    assert "Bili Pet 管理页" in response.text
    assert '/static/admin/admin.css' in response.text
    assert '/static/admin/admin.js' in response.text
    assert response.text.count('/static/admin/admin.css') == 1
    assert response.text.count('/static/admin/admin.js') == 1
    assert response.text.count('<script src="/static/admin/admin.js"></script>') == 1
    assert response.text.count('<table aria-label="') == 7
    table_labels = re.findall(r'<table aria-label="([^"]+)"', response.text)
    assert sorted(table_labels) == sorted(["知识库条目表", "趋势统计表", "任务列表数据表", "发布网关日志表", "审计日志表", "B站视频监控列表", "B站凭证列表"])
    assert '<table>' not in response.text
    assert response.text.count('<th scope="col">') >= 29
    assert "section-knowledge" in response.text
    assert "knowledge-create-btn" in response.text
    assert "section-gateway" in response.text
    assert "gateway-publish-btn" in response.text
    assert "gateway-refresh-btn" in response.text
    assert "audit-summary-days" in response.text
    assert "audit-summary-refresh-btn" in response.text
    assert "card-audit-total" in response.text
    assert "card-audit-ok" in response.text
    assert "card-audit-failed" in response.text
    assert "card-audit-top-action" in response.text
    assert "publisher-mode-toolbar" in response.text
    assert "mode-chip-manual" in response.text
    assert "mode-chip-simulated" in response.text
    assert "mode-chip-webhook" in response.text
    assert "mode-chip-real-publish" in response.text
    assert "publisher-mode-current" in response.text
    assert "comment-detail-id" in response.text
    assert "comment-detail-query-btn" in response.text
    assert "comment-detail-clear-btn" in response.text
    assert "comment-detail-meta" in response.text
    assert "job-detail-id" in response.text
    assert "job-detail-query-btn" in response.text
    assert "job-detail-clear-btn" in response.text
    assert "job-detail-meta" in response.text
    assert "single-retry-job-id" in response.text
    assert "single-retry-force-long" in response.text
    assert "single-retry-auto-reset-force" in response.text
    assert "single-retry-btn" in response.text
    assert 'aria-label="应用回复风格配置"' in response.text
    assert 'aria-label="读取当前回复风格配置"' in response.text
    assert 'aria-label="应用角色档位配置"' in response.text
    assert 'aria-label="刷新任务列表"' in response.text
    assert 'aria-label="查询指定评论详情"' in response.text
    assert 'aria-label="查询指定任务详情"' in response.text
    assert 'aria-label="刷新发布网关日志"' in response.text
    assert 'aria-label="刷新审计日志"' in response.text
    assert 'aria-label="关闭提示框"' in response.text
    assert 'aria-label="自动刷新间隔秒数"' in response.text
    assert 'aria-label="回复风格选择"' in response.text
    assert 'aria-label="角色档位选择"' in response.text
    assert 'aria-label="角色卡列表选择"' in response.text
    assert 'aria-label="角色卡 key"' in response.text
    assert 'aria-label="角色卡名称"' in response.text
    assert 'aria-label="角色卡启用状态"' in response.text
    assert 'aria-label="角色卡描述"' in response.text
    assert 'aria-label="角色卡系统提示词"' in response.text
    assert 'aria-label="角色卡语气 JSON"' in response.text
    assert 'aria-label="角色卡约束 JSON"' in response.text
    assert 'aria-label="知识库分类"' in response.text
    assert 'aria-label="知识库标题"' in response.text
    assert 'aria-label="知识库内容"' in response.text
    assert 'aria-label="趋势统计天数"' in response.text
    assert 'aria-label="切换趋势简版视图"' in response.text
    assert 'aria-label="任务状态筛选"' in response.text
    assert 'aria-label="任务列表返回条数"' in response.text
    assert 'aria-label="手动发布 comment_id"' in response.text
    assert 'aria-label="手动发布来源 source"' in response.text
    assert 'aria-label="手动发布启用 force_publish"' in response.text
    assert 'aria-label="手动发布回复内容"' in response.text
    assert 'aria-label="网关日志筛选 comment_id"' in response.text
    assert 'aria-label="网关日志返回条数"' in response.text
    assert 'aria-label="审计操作类型筛选"' in response.text
    assert 'aria-label="审计结果筛选"' in response.text
    assert 'aria-label="审计日志返回条数"' in response.text
    assert 'aria-label="审计摘要统计天数"' in response.text
    assert 'aria-label="单任务重试启用 force_long"' in response.text
    assert 'aria-label="单任务重试成功后重置 force_long"' in response.text
    assert 'role="status"' in response.text
    assert 'aria-live="polite"' in response.text
    assert 'aria-label="刷新状态信息，点击查看详情"' in response.text
    assert 'tabindex="0"' in response.text
    assert "onkeydown=\"if(event.key==='Enter'||event.key===' '){event.preventDefault();showRefreshErrorDetail();}\"" in response.text
    assert 'class="hidden"' in response.text
    assert 'class="mono status-pill status-idle clickable"' in response.text
    assert 'role="alertdialog"' in response.text
    assert 'aria-live="assertive"' in response.text
    assert 'aria-labelledby="toast-title"' in response.text
    assert 'aria-describedby="toast-content"' in response.text
    assert 'id="card-comments" class="card-value" role="status" aria-live="polite"' in response.text
    assert 'id="card-jobs" class="card-value" role="status" aria-live="polite"' in response.text
    assert 'id="card-published" class="card-value" role="status" aria-live="polite"' in response.text
    assert 'id="card-manual" class="card-value" role="status" aria-live="polite"' in response.text
    assert 'id="comment-detail-result" class="mono" role="status" aria-live="polite"' in response.text
    assert 'id="job-detail-result" class="mono" role="status" aria-live="polite"' in response.text
    assert 'id="card-audit-total" class="card-value" role="status" aria-live="polite"' in response.text
    assert 'id="card-audit-ok" class="card-value" role="status" aria-live="polite"' in response.text
    assert 'id="card-audit-failed" class="card-value" role="status" aria-live="polite"' in response.text
    assert 'id="publisher-mode-current" class="mono" role="status" aria-live="polite"' in response.text
    assert 'id="style-profile-current" class="mono" role="status" aria-live="polite"' in response.text
    assert 'id="role-profile-current" class="mono" role="status" aria-live="polite"' in response.text
    assert 'id="active-role-card-current" class="mono" role="status" aria-live="polite"' in response.text
    assert 'id="batch-selected-count" class="mono" role="status" aria-live="polite"' in response.text
    assert 'aria-label="知识库条目表"' in response.text
    assert 'aria-label="趋势统计表"' in response.text
    assert 'aria-label="任务列表数据表"' in response.text
    assert 'aria-label="发布网关日志表"' in response.text
    assert 'aria-label="审计日志表"' in response.text
    assert 'id="daily-head-full"' in response.text
    assert 'id="daily-head-simple" class="hidden"' in response.text
    assert '<th scope="col">选择</th><th scope="col">ID</th><th scope="col">状态</th><th scope="col">comment_id</th><th scope="col">评论</th><th scope="col">回复</th><th scope="col">risk_flags</th><th scope="col">操作</th>' in response.text
    assert '<th scope="col">ID</th><th scope="col">comment_id</th><th scope="col">source</th><th scope="col">reply_hash</th><th scope="col">created_at</th>' in response.text
    assert '<th scope="col">ID</th><th scope="col">action</th><th scope="col">ok</th><th scope="col">target_id</th><th scope="col">payload</th><th scope="col">created_at</th>' in response.text
    assert '<th scope="col">日期</th><th scope="col">总量</th><th scope="col">published</th><th scope="col">manual_queue</th><th scope="col">blocked</th><th scope="col">dedupe_skipped</th><th scope="col">skipped</th>' in response.text
    assert '<th scope="col">日期</th><th scope="col">published</th><th scope="col">manual_queue</th>' in response.text
    assert 'id="daily-head-simple" class="hidden"' in response.text
    assert 'id="ui-prefs-file" class="hidden"' in response.text
    assert 'id="toast-copy" class="toast-btn hidden"' in response.text
    assert '<th>' not in response.text
    assert 'style=' not in response.text


def test_admin_css_contains_reduced_motion_guard():
    css_path = Path(__file__).resolve().parents[1] / "static" / "admin" / "admin.css"
    css_text = css_path.read_text(encoding="utf-8")

    assert "@media (prefers-reduced-motion: reduce)" in css_text
    assert "transition-duration: 0.01ms !important;" in css_text
    assert "animation-duration: 0.01ms !important;" in css_text
    assert "scroll-behavior: auto !important;" in css_text


def test_admin_css_contains_utility_classes():
    css_path = Path(__file__).resolve().parents[1] / "static" / "admin" / "admin.css"
    css_text = css_path.read_text(encoding="utf-8")

    assert ".hidden { display: none; }" in css_text
    assert ".clickable { cursor: pointer; }" in css_text
    assert ".mt-8 { margin-top: 8px; }" in css_text
    assert ".mb-6 { margin-bottom: 6px; }" in css_text
    assert ".toolbar-top { align-items: flex-start; }" in css_text
    assert ".toolbar-mt-12 { margin-top: 12px; }" in css_text
    assert ".flex-1-280 { flex: 1; min-width: 280px; }" in css_text
    assert ".flex-2-320 { flex: 2; min-width: 320px; }" in css_text
    assert ".flex-1-320 { flex: 1; min-width: 320px; }" in css_text
    assert ".field-label { margin-bottom: 4px; }" in css_text
    assert ".ta-h-70 { height: 70px; }" in css_text
    assert ".ta-h-90 { height: 90px; }" in css_text
    assert ".ta-h-120 { height: 120px; }" in css_text
    assert ".prefs-snapshot {" in css_text
    assert ".card-value-small { font-size: 14px; }" in css_text
    assert "min-height: 44px;" in css_text
    assert "button:focus-visible {" in css_text
    assert "box-shadow: var(--focus);" in css_text
    assert css_text.count(".section-title {") == 1


def test_admin_js_has_no_inline_style_templates():
    js_path = Path(__file__).resolve().parents[1] / "static" / "admin" / "admin.js"
    js_text = js_path.read_text(encoding="utf-8")

    assert "style=" not in js_text
    assert "<div class=\"table-wrap mt-8\">" in js_text
    assert 'aria-label="评论关联任务表"' in js_text
    assert '<tr><th scope="col">ID</th><th scope="col">状态</th><th scope="col">回复</th><th scope="col">操作</th></tr>' in js_text
    assert '<th>' not in js_text
    assert '<table>' not in js_text
    assert js_text.count('aria-label="评论关联任务表"') == 1
    assert js_text.count('<th scope="col">') == 4
    assert '<thead>' in js_text


def test_admin_page_template_has_no_inline_style():
    admin_py_path = Path(__file__).resolve().parents[1] / "api" / "admin.py"
    admin_py_text = admin_py_path.read_text(encoding="utf-8")

    assert "style=" not in admin_py_text
    assert "<th scope=\"col\">" in admin_py_text
    assert "<th>" not in admin_py_text
    assert "<table>" not in admin_py_text
    assert admin_py_text.count("<table aria-label=") == 7
    normalized_admin_template = admin_py_text.replace('\\"', '"')
    template_table_labels = re.findall(r'<table aria-label="([^"]+)"', normalized_admin_template)
    assert sorted(template_table_labels) == sorted(["知识库条目表", "趋势统计表", "任务列表数据表", "发布网关日志表", "审计日志表", "B站视频监控列表", "B站凭证列表"])
    for table_label in ("知识库条目表", "趋势统计表", "任务列表数据表", "发布网关日志表", "审计日志表", "B站视频监控列表", "B站凭证列表"):
        pattern = rf'aria-label=\\?"{re.escape(table_label)}\\?"'
        assert len(re.findall(pattern, admin_py_text)) == 1
    assert admin_py_text.count('/static/admin/admin.css') == 1
    assert admin_py_text.count('/static/admin/admin.js') == 1




def test_admin_static_assets_exist_and_have_core_markers():
    static_dir = Path(__file__).resolve().parents[1] / "static" / "admin"
    css_path = static_dir / "admin.css"
    js_path = static_dir / "admin.js"

    assert css_path.exists()
    assert js_path.exists()

    css_text = css_path.read_text(encoding="utf-8")
    js_text = js_path.read_text(encoding="utf-8")

    assert css_text.strip()
    assert js_text.strip()
    assert ".table-wrap" in css_text
    assert ".status-pill" in css_text
    assert "function refreshJobs" in js_text
    assert "function refreshAuditLogs" in js_text


def test_admin_knowledge_crud_endpoints(client):
    create_response = client.post(
        "/api/admin/knowledge",
        json={
            "category": "faq",
            "title": "欧润吉",
            "content": "Doro 对这类梗要轻松回应",
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()["item"]
    assert created["category"] == "faq"
    assert created["enabled"] is True

    list_response = client.get("/api/admin/knowledge")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert len(items) >= 1
    assert any(item["title"] == "欧润吉" for item in items)

    disable_response = client.post(f"/api/admin/knowledge/{created['id']}/disable")
    assert disable_response.status_code == 200
    assert disable_response.json()["item"]["enabled"] is False


def test_admin_style_profile_endpoints(client):
    get_response = client.get("/api/admin/style-profile")
    assert get_response.status_code == 200
    data = get_response.json()
    assert data["ok"] is True
    assert data["style_profile"] in {"auto", "empathy", "meme", "normal"}
    assert data["preset_profiles"] == ["auto", "empathy", "meme", "normal"]

    set_response = client.post("/api/admin/style-profile", json={"style_profile": "empathy"})
    assert set_response.status_code == 200
    assert set_response.json()["style_profile"] == "empathy"

    refreshed = client.get("/api/admin/style-profile")
    assert refreshed.status_code == 200
    assert refreshed.json()["style_profile"] == "empathy"

    invalid_response = client.post("/api/admin/style-profile", json={"style_profile": "unknown"})
    assert invalid_response.status_code == 400


def test_admin_role_profile_endpoints(client):
    get_response = client.get("/api/admin/role-profile")
    assert get_response.status_code == 200
    data = get_response.json()
    assert data["ok"] is True
    assert data["role_profile"] in {"auto", "default", "comfort", "playful"}
    assert data["preset_profiles"] == ["auto", "default", "comfort", "playful"]

    set_response = client.post("/api/admin/role-profile", json={"role_profile": "comfort"})
    assert set_response.status_code == 200
    assert set_response.json()["role_profile"] == "comfort"

    refreshed = client.get("/api/admin/role-profile")
    assert refreshed.status_code == 200
    assert refreshed.json()["role_profile"] == "comfort"

    invalid_response = client.post("/api/admin/role-profile", json={"role_profile": "unknown"})
    assert invalid_response.status_code == 400


def test_admin_role_card_crud_and_activation(client):
    empty_list = client.get("/api/admin/role-cards")
    assert empty_list.status_code == 200
    assert empty_list.json()["ok"] is True
    assert empty_list.json()["items"] == []

    created = client.post(
        "/api/admin/role-cards",
        json={
            "key": "comfort_plus",
            "name": "Comfort Plus",
            "description": "更强安抚",
            "system_prompt": "优先安抚用户情绪",
            "tone": {"warm": 0.9},
            "constraints": {"no_sarcasm": True},
            "enabled": True,
        },
    )
    assert created.status_code == 200
    created_item = created.json()["item"]
    assert created_item["key"] == "comfort_plus"
    assert created_item["is_active"] is False

    duplicated = client.post(
        "/api/admin/role-cards",
        json={"key": "comfort_plus", "name": "Dup"},
    )
    assert duplicated.status_code == 400

    updated = client.post(
        "/api/admin/role-cards/comfort_plus",
        json={"name": "Comfort Plus V2", "enabled": True, "tone": {"warm": 1}},
    )
    assert updated.status_code == 200
    assert updated.json()["item"]["name"] == "Comfort Plus V2"

    activated = client.post("/api/admin/role-cards/comfort_plus/activate")
    assert activated.status_code == 200
    assert activated.json()["active_role_card_key"] == "comfort_plus"

    listed = client.get("/api/admin/role-cards")
    assert listed.status_code == 200
    listed_data = listed.json()
    assert listed_data["active_role_card_key"] == "comfort_plus"
    assert any(item["key"] == "comfort_plus" and item["is_active"] is True for item in listed_data["items"])

    disabled = client.post("/api/admin/role-cards/comfort_plus/disable")
    assert disabled.status_code == 200
    assert disabled.json()["item"]["enabled"] is False
    assert disabled.json()["item"]["is_active"] is False

    activation_after_disable = client.post("/api/admin/role-cards/comfort_plus/activate")
    assert activation_after_disable.status_code == 400

    missing = client.post("/api/admin/role-cards/missing-card/activate")
    assert missing.status_code == 404


def test_admin_observability_summary_endpoint(client):
    response = client.get("/api/admin/observability/summary?window_minutes=60")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    summary = payload["summary"]
    assert summary["window_minutes"] == 60
    assert "totals" in summary
    assert "rates" in summary
    assert "latency" in summary


def test_admin_gateway_publish_endpoint(client, monkeypatch):
    monkeypatch.setattr(gateway_api.settings, "gateway_token", "")
    monkeypatch.setattr(gateway_api.settings, "gateway_hmac_secret", "")

    captured: dict[str, object] = {}

    def fake_publish_gateway_reply(comment_id, reply_text, force_publish=False, source="bili-pet-bot", trace_id=None):
        captured["comment_id"] = comment_id
        captured["reply_text"] = reply_text
        captured["force_publish"] = force_publish
        captured["source"] = source
        captured["trace_id"] = trace_id
        return True, "admin_publish_ok", None

    monkeypatch.setattr(gateway_api, "publish_gateway_reply", fake_publish_gateway_reply)

    response = client.post(
        "/gateway/publish",
        json={
            "comment_id": "admin-gateway-c-1",
            "reply_text": "admin 手动发布",
            "force_publish": True,
            "source": "admin-ui",
            "trace_id": "admin-trace-1",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["published"] is True
    assert payload["reason"] == "admin_publish_ok"
    assert payload["comment_id"] == "admin-gateway-c-1"
    assert payload["trace_id"] == "admin-trace-1"

    assert captured == {
        "comment_id": "admin-gateway-c-1",
        "reply_text": "admin 手动发布",
        "force_publish": True,
        "source": "admin-ui",
        "trace_id": "admin-trace-1",
    }


def test_batch_approve_and_retry_endpoints(client, make_comment, make_job, db_session, monkeypatch, task_delay_spy):
    make_comment(comment_id="admin-c-1", user_id="admin-user-1")
    make_comment(comment_id="admin-c-2", user_id="admin-user-2")
    job1 = make_job(comment_id="admin-c-1", status="manual_queue", reply_text="回复1")
    job2 = make_job(comment_id="admin-c-2", status="blocked", reply_text="回复2")

    published_at = datetime(2026, 3, 1, 10, 0, 0)
    monkeypatch.setattr(
        comments_api,
        "publish_reply",
        lambda comment_id, reply_text, force_publish=False, trace_id=None: (
            True,
            "approved_simulated_publish",
            published_at,
        ),
    )

    approve_response = client.post(
        "/api/jobs/approve-batch",
        json={"job_ids": [job1.id, job2.id, 9999]},
    )

    assert approve_response.status_code == 200
    approve_data = approve_response.json()
    assert approve_data["summary"] == {"total": 3, "success": 2, "failed": 1}

    db_session.refresh(job1)
    db_session.refresh(job2)
    assert job1.status == "published"
    assert job2.status == "published"

    approve_audit = db_session.query(OperationAuditLog).filter(OperationAuditLog.action == "approve_batch").first()
    assert approve_audit is not None
    assert approve_audit.ok is False
    assert approve_audit.payload["summary"]["failed"] == 1

    retry_response = client.post(
        "/api/jobs/retry-batch",
        json={"job_ids": [job1.id, 9999], "force_long": True},
    )
    assert retry_response.status_code == 200
    retry_data = retry_response.json()
    assert retry_data["summary"] == {"total": 2, "success": 1, "failed": 1}
    assert len(task_delay_spy) == 1
    assert task_delay_spy[0]["comment_id"] == "admin-c-1"
    assert task_delay_spy[0]["force_long"] is True
    assert task_delay_spy[0]["role_profile"] == "auto"
    assert isinstance(task_delay_spy[0]["trace_id"], str) and task_delay_spy[0]["trace_id"]

    retry_audit = db_session.query(OperationAuditLog).filter(OperationAuditLog.action == "retry_batch").first()
    assert retry_audit is not None
    assert retry_audit.ok is False
    assert retry_audit.payload["summary"]["failed"] == 1






def test_single_comment_and_job_detail_endpoints(client, make_comment, make_job):
    make_comment(comment_id="admin-detail-c-1", user_id="admin-detail-u-1", content="单项详情评论")
    job = make_job(
        comment_id="admin-detail-c-1",
        status="manual_queue",
        reply_text="单项详情回复",
        risk_flags={"source": "admin-test"},
    )

    comment_response = client.get("/api/comments/admin-detail-c-1")
    assert comment_response.status_code == 200
    comment_payload = comment_response.json()
    assert comment_payload["ok"] is True
    assert comment_payload["comment"]["comment_id"] == "admin-detail-c-1"
    assert comment_payload["comment"]["content"] == "单项详情评论"
    assert len(comment_payload["jobs"]) == 1
    assert comment_payload["jobs"][0]["id"] == job.id

    missing_comment = client.get("/api/comments/not-exists-comment")
    assert missing_comment.status_code == 404
    assert missing_comment.json()["detail"] == "comment_not_found"

    job_response = client.get(f"/api/jobs/{job.id}")
    assert job_response.status_code == 200
    job_payload = job_response.json()
    assert job_payload["ok"] is True
    assert job_payload["item"]["id"] == job.id
    assert job_payload["item"]["comment_id"] == "admin-detail-c-1"
    assert job_payload["item"]["comment_content"] == "单项详情评论"

    missing_job = client.get("/api/jobs/999999")
    assert missing_job.status_code == 404
    assert missing_job.json()["detail"] == "job_not_found"


def test_retry_single_endpoint_success_and_not_found(client, make_comment, make_job, db_session, task_delay_spy):
    make_comment(comment_id="admin-retry-single-c-1", user_id="admin-retry-single-u-1")
    job = make_job(comment_id="admin-retry-single-c-1", status="blocked", reply_text="待重试")

    ok_response = client.post(
        f"/api/jobs/{job.id}/retry",
        json={
            "force_long": True,
            "style_profile": "meme",
            "role_profile": "comfort",
            "role_card_key": "comfort_plus",
        },
    )
    assert ok_response.status_code == 200
    ok_payload = ok_response.json()
    assert ok_payload["ok"] is True
    assert ok_payload["requeued"] is True
    assert ok_payload["job_id"] == job.id
    assert isinstance(ok_payload["trace_id"], str) and ok_payload["trace_id"]

    assert len(task_delay_spy) == 1
    assert task_delay_spy[0]["comment_id"] == "admin-retry-single-c-1"
    assert task_delay_spy[0]["force_long"] is True
    assert task_delay_spy[0]["style_profile"] == "meme"
    assert task_delay_spy[0]["role_profile"] == "comfort"
    assert task_delay_spy[0]["role_card_key"] == "comfort_plus"
    assert isinstance(task_delay_spy[0]["trace_id"], str) and task_delay_spy[0]["trace_id"]
    assert task_delay_spy[0]["trace_id"] == ok_payload["trace_id"]

    success_audit = (
        db_session.query(OperationAuditLog)
        .filter(OperationAuditLog.action == "retry_single", OperationAuditLog.ok.is_(True))
        .order_by(OperationAuditLog.id.desc())
        .first()
    )
    assert success_audit is not None
    assert success_audit.payload["status"] == "queued"
    assert success_audit.payload["comment_id"] == "admin-retry-single-c-1"
    assert success_audit.payload["force_long"] is True
    assert success_audit.payload["style_profile"] == "meme"
    assert success_audit.payload["role_profile"] == "comfort"
    assert success_audit.payload["role_card_key"] == "comfort_plus"
    assert isinstance(success_audit.payload["trace_id"], str) and success_audit.payload["trace_id"]
    assert success_audit.payload["trace_id"] == ok_payload["trace_id"]

    missing_response = client.post("/api/jobs/999999/retry", json={"force_long": False})
    assert missing_response.status_code == 404
    assert missing_response.json()["detail"] == "job_not_found"

    missing_trace_id = missing_response.headers.get("x-trace-id")

    job_not_found_audit = db_session.query(OperationAuditLog).filter(OperationAuditLog.action == "retry_single").order_by(OperationAuditLog.id.desc()).first()
    assert job_not_found_audit is not None
    assert job_not_found_audit.ok is False
    assert job_not_found_audit.payload["status"] == "job_not_found"
    assert job_not_found_audit.payload["error"] == "job_not_found"
    assert job_not_found_audit.payload["force_long"] is False
    assert isinstance(job_not_found_audit.payload["trace_id"], str) and job_not_found_audit.payload["trace_id"]
    if missing_trace_id:
        assert job_not_found_audit.payload["trace_id"] == missing_trace_id
    assert job_not_found_audit.payload["trace_id"] != ok_payload["trace_id"]



def test_admin_export_csv_endpoints(client, task_delay_spy):
    _ = task_delay_spy
    create_response = client.post(
        "/api/events/comment",
        json={
            "comment_id": "admin-export-c-1",
            "video_id": "video-1",
            "user_id": "admin-export-user",
            "content": "导出内容测试",
        },
    )
    assert create_response.status_code == 200

    jobs_csv = client.get("/api/export/jobs.csv?limit=10")
    assert jobs_csv.status_code == 200
    assert "text/csv" in jobs_csv.headers["content-type"]
    assert "job_id,comment_id,status" in jobs_csv.text

    client.post("/api/jobs/999/retry", json={"force_long": False})
    audit_csv = client.get("/api/export/audit-logs.csv?limit=10")
    assert audit_csv.status_code == 200
    assert "text/csv" in audit_csv.headers["content-type"]
    assert "action,target_type,target_id" in audit_csv.text


def test_jobs_list_pagination_and_stable_sort(client, make_comment, make_job):
    make_comment(comment_id="jobs-order-c-1", user_id="jobs-order-user")
    base = datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc)
    older = make_job(comment_id="jobs-order-c-1", status="manual_queue", reply_text="old", created_at=base - timedelta(minutes=2))
    newer = make_job(comment_id="jobs-order-c-1", status="manual_queue", reply_text="new", created_at=base)
    same_time_later_id = make_job(comment_id="jobs-order-c-1", status="manual_queue", reply_text="tie", created_at=base)

    response = client.get("/api/jobs?status=manual_queue&limit=2&offset=0")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert [item["id"] for item in payload["items"]] == [same_time_later_id.id, newer.id]

    paged = client.get("/api/jobs?status=manual_queue&limit=2&offset=2")
    assert paged.status_code == 200
    paged_payload = paged.json()
    assert [item["id"] for item in paged_payload["items"]] == [older.id]

    invalid = client.get("/api/jobs?limit=1001")
    assert invalid.status_code == 422


def test_audit_logs_list_pagination_and_stable_sort(client, db_session):
    base = datetime(2026, 3, 1, 15, 0, tzinfo=timezone.utc)
    older = OperationAuditLog(action="retry_single", target_type="reply_job", target_id=10, ok=True, payload={"status": "queued"}, created_at=base - timedelta(minutes=1))
    newer = OperationAuditLog(action="retry_single", target_type="reply_job", target_id=11, ok=True, payload={"status": "queued"}, created_at=base)
    same_time_later_id = OperationAuditLog(action="retry_single", target_type="reply_job", target_id=12, ok=True, payload={"status": "queued"}, created_at=base)
    db_session.add_all([older, newer, same_time_later_id])
    db_session.commit()

    response = client.get("/api/audit-logs?action=retry_single&limit=2&offset=0")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["summary"]["returned"] == 2
    assert [item["id"] for item in payload["items"]] == [same_time_later_id.id, newer.id]

    paged = client.get("/api/audit-logs?action=retry_single&limit=2&offset=2")
    assert paged.status_code == 200
    paged_payload = paged.json()
    assert [item["id"] for item in paged_payload["items"]] == [older.id]

    invalid = client.get("/api/audit-logs?limit=1001")
    assert invalid.status_code == 422


def test_admin_list_endpoints_apply_pagination_limits(client, db_session):
    base = datetime(2026, 3, 2, 10, 0, tzinfo=timezone.utc)
    knowledge_1 = KnowledgeEntry(category="faq", title="k1", content="c1", enabled=True, updated_at=base)
    knowledge_2 = KnowledgeEntry(category="faq", title="k2", content="c2", enabled=True, updated_at=base + timedelta(minutes=1))
    role_1 = RoleCard(key="card_1", name="Card 1", description="", system_prompt="", tone={}, constraints={}, enabled=True, is_active=False, created_at=base, updated_at=base)
    role_2 = RoleCard(
        key="card_2",
        name="Card 2",
        description="",
        system_prompt="",
        tone={},
        constraints={},
        enabled=True,
        is_active=True,
        created_at=base,
        updated_at=base + timedelta(minutes=1),
    )
    db_session.add_all([knowledge_1, knowledge_2, role_1, role_2])
    db_session.commit()

    knowledge_list = client.get("/api/admin/knowledge?limit=1&offset=0")
    assert knowledge_list.status_code == 200
    knowledge_payload = knowledge_list.json()
    assert len(knowledge_payload["items"]) == 1
    assert knowledge_payload["items"][0]["title"] == "k2"

    role_list = client.get("/api/admin/role-cards?limit=1&offset=0")
    assert role_list.status_code == 200
    role_payload = role_list.json()
    assert len(role_payload["items"]) == 1
    assert role_payload["items"][0]["key"] == "card_2"
    assert role_payload["active_role_card_key"] == "card_2"

    invalid_knowledge = client.get("/api/admin/knowledge?limit=1001")
    assert invalid_knowledge.status_code == 422
    invalid_role_cards = client.get("/api/admin/role-cards?limit=1001")
    assert invalid_role_cards.status_code == 422


def test_admin_audit_summary_endpoint(client, make_comment, make_job):
    make_comment(comment_id="audit-summary-c-1", user_id="audit-user-1")
    make_job(comment_id="audit-summary-c-1", status="manual_queue", reply_text="待处理")

    client.post(
        "/api/jobs/retry-batch",
        json={"job_ids": [999999], "force_long": False},
    )

    response = client.get("/api/audit-logs/summary?days=7")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["days"] == 7
    assert "totals" in payload and "audit_logs" in payload["totals"]
    assert "by_action" in payload and isinstance(payload["by_action"], dict)
    assert "by_result" in payload and isinstance(payload["by_result"], dict)
def test_admin_alias_endpoints_match_legacy_contracts(client, make_comment, make_job):
    make_comment(comment_id="admin-alias-c-1", user_id="admin-alias-u-1")
    make_job(comment_id="admin-alias-c-1", status="manual_queue", reply_text="alias job")

    legacy_overview = client.get("/api/metrics/overview")
    alias_overview = client.get("/api/admin/metrics/overview")
    short_overview = client.get("/api/admin/overview")
    assert legacy_overview.status_code == 200
    assert alias_overview.status_code == 200
    assert short_overview.status_code == 200
    assert alias_overview.json() == legacy_overview.json()
    assert short_overview.json() == legacy_overview.json()
    assert short_overview.json() == alias_overview.json()

    legacy_jobs = client.get("/api/jobs?status=manual_queue&limit=20&offset=0")
    alias_jobs = client.get("/api/admin/jobs?status=manual_queue&limit=20&offset=0")
    assert legacy_jobs.status_code == 200
    assert alias_jobs.status_code == 200
    assert alias_jobs.json() == legacy_jobs.json()

    legacy_jobs_offset = client.get("/api/jobs?status=manual_queue&limit=1&offset=1")
    alias_jobs_offset = client.get("/api/admin/jobs?status=manual_queue&limit=1&offset=1")
    assert legacy_jobs_offset.status_code == 200
    assert alias_jobs_offset.status_code == 200
    assert alias_jobs_offset.json() == legacy_jobs_offset.json()

    legacy_audit_summary = client.get("/api/audit-logs/summary?days=7")
    alias_audit_summary = client.get("/api/admin/audit-logs/summary?days=7")
    short_audit_summary = client.get("/api/admin/audit/summary?days=7")
    assert legacy_audit_summary.status_code == 200
    assert alias_audit_summary.status_code == 200
    assert short_audit_summary.status_code == 200
    assert alias_audit_summary.json() == legacy_audit_summary.json()
    assert short_audit_summary.json() == legacy_audit_summary.json()
    assert short_audit_summary.json() == alias_audit_summary.json()

    legacy_audit_filtered = client.get("/api/audit-logs/summary?days=7&action=admin_refresh&ok=true")
    alias_audit_filtered = client.get("/api/admin/audit-logs/summary?days=7&action=admin_refresh&ok=true")
    short_audit_filtered = client.get("/api/admin/audit/summary?days=7&action=admin_refresh&ok=true")
    assert legacy_audit_filtered.status_code == 200
    assert alias_audit_filtered.status_code == 200
    assert short_audit_filtered.status_code == 200
    assert alias_audit_filtered.json() == legacy_audit_filtered.json()
    assert short_audit_filtered.json() == legacy_audit_filtered.json()
    assert short_audit_filtered.json() == alias_audit_filtered.json()

    legacy_gateway_logs = client.get("/gateway/publish-logs?limit=20")
    alias_gateway_logs = client.get("/api/admin/gateway/publish-logs?limit=20")
    short_gateway_logs = client.get("/api/admin/gateway/logs?limit=20")
    assert legacy_gateway_logs.status_code == 200
    assert alias_gateway_logs.status_code == 200
    assert short_gateway_logs.status_code == 200
    assert alias_gateway_logs.json() == legacy_gateway_logs.json()
    assert short_gateway_logs.json() == legacy_gateway_logs.json()
    assert short_gateway_logs.json() == alias_gateway_logs.json()

    legacy_gateway_filtered = client.get("/gateway/publish-logs?comment_id=admin-alias-c-1&limit=5")
    alias_gateway_filtered = client.get("/api/admin/gateway/publish-logs?comment_id=admin-alias-c-1&limit=5")
    short_gateway_filtered = client.get("/api/admin/gateway/logs?comment_id=admin-alias-c-1&limit=5")
    assert legacy_gateway_filtered.status_code == 200
    assert alias_gateway_filtered.status_code == 200
    assert short_gateway_filtered.status_code == 200
    assert alias_gateway_filtered.json() == legacy_gateway_filtered.json()
    assert short_gateway_filtered.json() == legacy_gateway_filtered.json()
    assert short_gateway_filtered.json() == alias_gateway_filtered.json()


def test_admin_static_js_uses_admin_alias_routes():
    js_path = Path(__file__).resolve().parents[1] / "static" / "admin" / "admin.js"
    js_text = js_path.read_text(encoding="utf-8")

    assert "'/api/admin/overview'" in js_text
    assert "'/api/admin/jobs?'" in js_text
    assert "'/api/admin/audit/summary?'" in js_text
    assert "'/api/admin/gateway/logs?'" in js_text
    assert "last_poll_status" in js_text
    assert "last_poll_error" in js_text

    assert "'/api/metrics/overview'" not in js_text
    assert "'/api/jobs?'" not in js_text
    assert "'/api/audit-logs/summary?'" not in js_text
    assert "'/gateway/publish-logs?'" not in js_text


def test_bilibili_status_returns_diagnostics_structure(client, monkeypatch):
    """Test Bilibili status endpoint returns diagnostics structure."""
    monkeypatch.setattr(settings, "bilibili_enabled", True)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", True)

    response = client.get("/api/admin/bilibili/status")
    assert response.status_code == 200

    data = response.json()
    assert "diagnostics" in data
    assert "config_error" in data["diagnostics"]
    assert "auth_error" in data["diagnostics"]
    assert "dependency_error" in data["diagnostics"]
    assert "ready" in data["diagnostics"]


def test_bilibili_diagnostics_detects_config_error(client, monkeypatch):
    """Test diagnostics detects configuration errors."""
    monkeypatch.setattr(settings, "bilibili_enabled", False)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", False)

    response = client.get("/api/admin/bilibili/status")
    data = response.json()

    assert data["diagnostics"]["config_error"] is not None
    assert "bilibili_enabled is false" in data["diagnostics"]["config_error"]
    assert data["diagnostics"]["ready"] is False


def test_bilibili_diagnostics_detects_auth_error(client, monkeypatch, db_session):
    """Test diagnostics detects authentication errors."""
    from app.models.entities import BilibiliCredential

    monkeypatch.setattr(settings, "bilibili_enabled", True)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", True)

    # No active credential
    response = client.get("/api/admin/bilibili/status")
    data = response.json()

    assert data["diagnostics"]["auth_error"] is not None
    assert "no active credential" in data["diagnostics"]["auth_error"]
    assert data["diagnostics"]["ready"] is False
