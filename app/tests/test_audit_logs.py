from datetime import datetime, timezone

import app.api.gateway as gateway_api
import app.workers.jobs as jobs_module
from app.models.entities import OperationAuditLog
from app.settings import settings


def _insert_audit_rows(db_session):
    db_session.add_all(
        [
            OperationAuditLog(
                action="retry_single",
                ok=True,
                target_id=101,
                payload={"status": "queued", "trace_id": "trace-retry-1", "comment_id": "c-1"},
            ),
            OperationAuditLog(
                action="retry_single",
                ok=False,
                target_id=102,
                payload={"status": "job_not_found", "trace_id": "trace-retry-2"},
            ),
            OperationAuditLog(
                action="approve_single",
                ok=True,
                target_id=201,
                payload={"status": "published", "trace_id": "trace-approve-1", "comment_id": "c-2"},
            ),
        ]
    )
    db_session.commit()


def test_worker_logs_include_trace_id_and_job_id(caplog, monkeypatch, db_session, make_comment):
    make_comment(comment_id="log-worker-c-1", user_id="log-worker-u-1")
    monkeypatch.setattr(jobs_module, "SessionLocal", lambda: db_session)
    monkeypatch.setattr(jobs_module, "should_reply", lambda event: (False, "normal", "medium"))
    caplog.set_level("INFO", logger=jobs_module.__name__)

    result = jobs_module.process_comment_event_task.run({"comment_id": "log-worker-c-1", "trace_id": "trace-worker-1"})

    assert result["ok"] is True
    assert result["status"] == "skipped"
    assert result["trace_id"] == "trace-worker-1"
    assert any(
        "'trace_id': 'trace-worker-1'" in record.getMessage()
        and "'job_id': " in record.getMessage()
        and "'status': 'skipped'" in record.getMessage()
        for record in caplog.records
    )


def test_gateway_logs_include_trace_and_status(client, monkeypatch, caplog):
    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "gateway_token", "")
    monkeypatch.setattr(settings, "gateway_hmac_secret", "")
    monkeypatch.setattr(
        gateway_api,
        "publish_gateway_reply",
        lambda **kwargs: (True, "gateway_recorded", datetime.now(timezone.utc)),
    )
    caplog.set_level("INFO", logger=gateway_api.__name__)

    response = client.post(
        "/gateway/publish",
        json={"comment_id": "log-gateway-c-1", "reply_text": "hello", "trace_id": "trace-gateway-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["trace_id"] == "trace-gateway-1"
    assert any(
        "'trace_id': 'trace-gateway-1'" in record.getMessage()
        and "'comment_id': 'log-gateway-c-1'" in record.getMessage()
        and "'status': 'gateway_recorded'" in record.getMessage()
        for record in caplog.records
    )


def test_audit_logs_support_common_filters(client, db_session):
    _insert_audit_rows(db_session)

    response = client.get(
        "/api/audit-logs",
        params={
            "action": "approve_single",
            "ok": "true",
            "status": "published",
            "trace_id": "trace-approve-1",
            "limit": 20,
        },
    )
    data = response.json()

    assert response.status_code == 200
    assert data["ok"] is True
    assert data["summary"]["total"] == 1
    assert data["summary"]["returned"] == 1
    assert data["items"][0]["action"] == "approve_single"
    assert data["items"][0]["payload"]["trace_id"] == "trace-approve-1"
    assert data["items"][0]["payload"]["status"] == "published"


def test_export_audit_logs_csv_includes_trace_and_status_columns(client, db_session):
    _insert_audit_rows(db_session)

    response = client.get(
        "/api/export/audit-logs.csv",
        params={"status": "published", "trace_id": "trace-approve-1"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    body = response.text
    assert "status,trace_id,payload,created_at" in body
    assert "trace-approve-1" in body
    assert "published" in body


def test_audit_logs_summary_aggregates_action_status_and_result(client, db_session):
    _insert_audit_rows(db_session)

    response = client.get("/api/audit-logs/summary?days=30")
    data = response.json()

    assert response.status_code == 200
    assert data["ok"] is True
    assert data["totals"]["audit_logs"] == 3
    assert data["by_action"]["retry_single"] == 2
    assert data["by_action"]["approve_single"] == 1
    assert data["by_status"]["queued"] == 1
    assert data["by_status"]["published"] == 1
    assert data["by_result"]["ok"] == 2
    assert data["by_result"]["failed"] == 1
