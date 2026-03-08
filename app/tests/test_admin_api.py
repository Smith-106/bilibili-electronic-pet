from datetime import datetime

from app.api import comments as comments_api
from app.api import gateway as gateway_api
from app.models.entities import OperationAuditLog


def test_admin_page_returns_html(client):
    response = client.get("/admin")
    assert response.status_code == 200
    assert "Bili Pet 管理页" in response.text
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
    assert "section-single-diagnostics" in response.text
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
    assert payload["by_result"]["ok"] >= 0
    assert payload["by_result"]["failed"] >= 0
