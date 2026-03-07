from datetime import datetime

from app.api import comments as comments_api
from app.models.entities import OperationAuditLog


def test_admin_page_returns_html(client):
    response = client.get("/admin")
    assert response.status_code == 200
    assert "Bili Pet 管理页" in response.text


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
