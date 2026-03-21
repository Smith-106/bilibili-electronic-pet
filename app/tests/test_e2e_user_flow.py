"""End-to-End user simulation tests.

Tests the complete user flow from comment ingestion to reply generation and publishing.
"""
import os
import uuid
import pytest
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models.entities import ReplyJob, Comment


# Test configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:18000")
API_KEY = os.getenv("API_KEY", "test-api-key-e2e")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test_e2e.sqlite3")


def _unique_case_value(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def db_session():
    """Create test database session."""
    # Only add check_same_thread for SQLite
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()


@pytest.fixture
def api_client():
    """HTTP client with API key."""
    return httpx.Client(base_url=BASE_URL, headers={"x-api-key": API_KEY}, timeout=30.0)


class TestHealthEndpoints:
    """Test health and readiness endpoints."""

    def test_health_endpoint_returns_ok(self, api_client):
        """User verifies service is alive."""
        response = api_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_readiness_shows_foundation_ready_but_delivery_blocked(self, api_client):
        """Readiness keeps dependency probe green while delivery diagnostics block release."""
        response = api_client.get("/readiness")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ready") is True
        assert data.get("foundation_ready") is True
        assert data.get("delivery_ready") is False
        assert data.get("ready") == data.get("foundation_ready")
        assert "bilibili:delivery_diagnostics_not_ready" in data.get("delivery_blockers", [])
        assert any(reason.startswith("bilibili:config:") for reason in data.get("delivery_blockers", []))
        diagnostics = data.get("bilibili_diagnostics", {})
        assert diagnostics.get("ready") is False
        assert diagnostics.get("release_gates", {}).get("pre_release_real_chain_ready") is False


class TestCommentEventIngestion:
    """Test comment event ingestion flow."""

    def test_user_submits_comment_event(self, api_client, db_session):
        """User submits a comment event for processing."""
        comment_id = _unique_case_value("e2e-comment")
        payload = {
            "platform": "bilibili",
            "comment_id": comment_id,
            "video_id": "BV1strict001",
            "user_id": "test_user_strict_001",
            "content": "这是一个测试评论",
            "parent_id": None,
        }
        response = api_client.post("/api/events/comment", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("queued") is True
        assert data.get("comment_id") == comment_id

    def test_user_checks_job_status(self, api_client, db_session):
        """User checks the status of their submitted job."""
        comment_id = _unique_case_value("e2e-job")
        job = ReplyJob(
            comment_id=comment_id,
            canonical_comment_id=f"bilibili:{comment_id}",
            status="manual_queue",
            reply_text="测试回复内容",
        )
        db_session.add(job)
        db_session.commit()
        job_id = job.id

        response = api_client.get(f"/api/jobs/{job_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("item", {}).get("id") == job_id
        assert data.get("item", {}).get("status") == "manual_queue"


class TestAdminDashboard:
    """Test admin dashboard functionality."""

    def test_user_accesses_admin_page(self, api_client):
        """User accesses the admin dashboard."""
        response = api_client.get("/admin", follow_redirects=True)
        assert response.status_code == 200

    def test_user_views_job_list(self, api_client):
        """User views the list of jobs in admin."""
        response = api_client.get("/api/admin/jobs?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_user_views_audit_summary(self, api_client):
        """User views audit log summary."""
        response = api_client.get("/api/admin/audit/summary?days=7")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True


class TestBilibiliIntegration:
    """Test B站集成功能."""

    def test_user_checks_bilibili_status_when_native_publish_is_disabled(self, api_client):
        """B站状态接口在严格验收环境下应报告发布链路未就绪。"""
        response = api_client.get("/api/admin/bilibili/status")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        diagnostics = data.get("diagnostics", {})
        assert diagnostics.get("ready") is False
        assert diagnostics.get("checks", {}).get("config", {}).get("ready") is False
        assert diagnostics.get("effective_publish_mode") == "simulated"
        assert diagnostics.get("signals", {}).get("effective_publish_mode") == "simulated"
        assert diagnostics.get("release_gates", {}).get("effective_publish_mode") == "simulated"
        assert diagnostics.get("release_gates", {}).get("pre_release_real_chain_ready") is False
        assert any(reason.startswith("config:") for reason in diagnostics.get("blocking_reasons", []))

    def test_user_lists_bilibili_videos(self, api_client):
        """User views monitored B站 videos."""
        response = api_client.get("/api/admin/bilibili/videos")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True


class TestGatewayPublish:
    """Test发布网关功能."""

    def test_user_views_publish_logs(self, api_client):
        """User views publish history."""
        response = api_client.get("/gateway/publish-logs?limit=10")
        assert response.status_code == 200


class TestJobApprovalFlow:
    """Test任务审批流程."""

    def test_user_approval_fails_when_backing_comment_is_missing(self, api_client, db_session):
        """Approval should fail deterministically when the source comment record is absent."""
        comment_id = _unique_case_value("approve-missing-comment")
        job = ReplyJob(
            comment_id=comment_id,
            canonical_comment_id=f"bilibili:{comment_id}",
            status="manual_queue",
            reply_text="待审批的测试回复",
            risk_flags={"safety_check": "passed"},
        )
        db_session.add(job)
        db_session.commit()
        job_id = job.id

        response = api_client.post(f"/api/jobs/{job_id}/approve", json={})
        assert response.status_code == 404
        assert response.json().get("detail") == "comment_not_found"

    def test_user_cannot_approve_job_in_non_approvable_status(self, api_client, db_session):
        """Approval rejects states outside manual_queue/blocked/dedupe_skipped."""
        comment_id = _unique_case_value("approve-status-block")
        comment = Comment(
            platform="bilibili",
            canonical_comment_id=f"bilibili:{comment_id}",
            comment_id=comment_id,
            video_id="BV1strict002",
            user_id="approve_status_user",
            content="审批状态约束测试评论",
            parent_id=None,
        )
        job = ReplyJob(
            comment_id=comment_id,
            canonical_comment_id=f"bilibili:{comment_id}",
            status="published",
            reply_text="不可再次审批",
        )
        db_session.add(comment)
        db_session.add(job)
        db_session.commit()

        response = api_client.post(f"/api/jobs/{job.id}/approve", json={})
        assert response.status_code == 400
        assert response.json().get("detail") == "job_status_not_approvable: published"

    def test_user_retries_existing_job_successfully(self, api_client, db_session):
        """Retry endpoint requeues existing job with explicit success contract."""
        comment_id = _unique_case_value("retry-success")
        job = ReplyJob(
            comment_id=comment_id,
            canonical_comment_id=f"bilibili:{comment_id}",
            status="failed",
            reply_text="失败的测试回复",
            attempts=2,
        )
        db_session.add(job)
        db_session.commit()
        job_id = job.id

        response = api_client.post(f"/api/jobs/{job_id}/retry", json={"force_long": False})
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("requeued") is True
        assert data.get("job_id") == job_id

    def test_user_retry_fails_for_missing_job(self, api_client, db_session):
        """Retry endpoint returns explicit not-found contract for unknown jobs."""
        latest = db_session.query(ReplyJob.id).order_by(ReplyJob.id.desc()).first()
        missing_job_id = (latest[0] if latest else 0) + 99999

        response = api_client.post(f"/api/jobs/{missing_job_id}/retry", json={"force_long": False})
        assert response.status_code == 404
        assert response.json().get("detail") == "job_not_found"


class TestMetricsAndObservability:
    """Test指标和可观测性."""

    def test_user_views_metrics_overview(self, api_client):
        """User views system metrics."""
        response = api_client.get("/api/metrics/overview")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_user_views_admin_overview(self, api_client):
        """User views admin overview."""
        response = api_client.get("/api/admin/overview")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True


class TestErrorHandling:
    """Test错误处理."""

    def test_user_accesses_nonexistent_job(self, api_client):
        """User tries to access a job that doesn't exist."""
        response = api_client.get("/api/jobs/999999")
        assert response.status_code == 404
        assert response.json().get("detail") == "job_not_found"

    def test_user_accesses_protected_endpoint_without_key(self):
        """User tries to access protected endpoint without API key."""
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
            response = client.get("/api/admin/jobs")
        assert response.status_code == 401
        assert response.json().get("detail") == "unauthorized"
