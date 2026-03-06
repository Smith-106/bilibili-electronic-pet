from datetime import datetime

from app.api import comments as comments_api
from app.models.entities import OperationAuditLog


def test_admin_page_returns_html(client):
    response = client.get("/admin")
    assert response.status_code == 200
    assert "Bili Pet 管理页" in response.text


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
