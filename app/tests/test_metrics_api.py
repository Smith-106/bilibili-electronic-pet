from datetime import datetime, timedelta

from app.models.entities import OperationAuditLog


def test_metrics_overview_counts(client, make_comment, make_job):
    now = datetime.utcnow()
    make_comment(comment_id="metrics-c-1", user_id="metrics-u-1")
    make_comment(comment_id="metrics-c-2", user_id="metrics-u-2")

    make_job(comment_id="metrics-c-1", status="published", created_at=now - timedelta(days=1))
    make_job(comment_id="metrics-c-1", status="manual_queue", created_at=now)
    make_job(comment_id="metrics-c-2", status="blocked", created_at=now)

    response = client.get("/api/metrics/overview")
    data = response.json()

    assert response.status_code == 200
    assert data["ok"] is True
    assert data["totals"]["comments"] == 2
    assert data["totals"]["jobs"] == 3
    assert data["by_status"]["published"] == 1
    assert data["by_status"]["manual_queue"] == 1
    assert data["by_status"]["blocked"] == 1


def test_metrics_daily_aggregates_recent_days(client, make_comment, make_job):
    now = datetime.utcnow()
    make_comment(comment_id="daily-c-1", user_id="daily-u-1")
    make_comment(comment_id="daily-c-2", user_id="daily-u-2")

    make_job(comment_id="daily-c-1", status="published", created_at=now - timedelta(days=1))
    make_job(comment_id="daily-c-1", status="manual_queue", created_at=now)
    make_job(comment_id="daily-c-2", status="blocked", created_at=now)

    response = client.get("/api/metrics/daily?days=7")
    data = response.json()

    assert response.status_code == 200
    assert data["ok"] is True
    assert data["days"] == 7
    assert len(data["items"]) >= 1

    total_jobs = sum(item["total"] for item in data["items"])
    total_published = sum(item["published"] for item in data["items"])
    total_manual = sum(item["manual_queue"] for item in data["items"])
    total_blocked = sum(item["blocked"] for item in data["items"])

    assert total_jobs == 3
    assert total_published == 1
    assert total_manual == 1
    assert total_blocked == 1


def test_metrics_daily_days_validation(client):
    response = client.get("/api/metrics/daily?days=0")
    assert response.status_code == 422


def test_metrics_overview_includes_audit_dimensions(client, db_session, make_comment, make_job):
    make_comment(comment_id="audit-metrics-c-1", user_id="audit-metrics-u-1")
    make_job(comment_id="audit-metrics-c-1", status="published")

    db_session.add_all(
        [
            OperationAuditLog(action="retry_single", ok=True, payload={"status": "queued", "trace_id": "trace-a"}),
            OperationAuditLog(action="retry_single", ok=False, payload={"status": "job_not_found", "trace_id": "trace-b"}),
            OperationAuditLog(action="approve_single", ok=True, payload={"status": "published", "trace_id": "trace-c"}),
        ]
    )
    db_session.commit()

    response = client.get("/api/metrics/overview")
    data = response.json()

    assert response.status_code == 200
    assert data["ok"] is True
    assert data["totals"]["audit_logs"] == 3
    assert data["audit"]["by_action"]["retry_single"] == 2
    assert data["audit"]["by_action"]["approve_single"] == 1
    assert data["audit"]["by_action_result"]["retry_single"]["ok"] == 1
    assert data["audit"]["by_action_result"]["retry_single"]["failed"] == 1
    assert data["audit"]["by_result"]["ok"] == 2
    assert data["audit"]["by_result"]["failed"] == 1


def test_metrics_daily_includes_status_breakdown_for_new_status(client, make_comment, make_job):
    now = datetime.utcnow()
    make_comment(comment_id="daily-status-c-1", user_id="daily-status-u-1")
    make_job(comment_id="daily-status-c-1", status="human_escalated", created_at=now)
    make_job(comment_id="daily-status-c-1", status="published", created_at=now)

    response = client.get("/api/metrics/daily?days=7")
    data = response.json()

    assert response.status_code == 200
    assert data["ok"] is True
    assert data["totals_by_status"]["human_escalated"] == 1
    assert data["totals_by_status"]["published"] == 1
    assert any(item["status_breakdown"].get("human_escalated") == 1 for item in data["items"])
