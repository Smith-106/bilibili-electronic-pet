"""Tests for Bilibili Admin API endpoints."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestBilibiliStatusAPI:
    """Tests for /api/admin/bilibili/status endpoint."""

    def test_get_status_no_credential(self, client: TestClient):
        response = client.get("/api/admin/bilibili/status")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "config" in data
        assert "credential" in data
        assert "videos" in data
        assert data["credential"] is None

    def test_get_status_with_credential(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliCredential

        credential = BilibiliCredential(
            name="test-credential",
            sessdata="encrypted_sessdata",
            bili_jct="encrypted_jct",
            buvid3="test_buvid3",
            is_active=True,
        )
        db_session.add(credential)
        db_session.commit()

        response = client.get("/api/admin/bilibili/status")
        assert response.status_code == 200
        data = response.json()
        assert data["credential"] is not None
        assert data["credential"]["name"] == "test-credential"
        assert data["credential"]["is_active"] is True


class TestBilibiliVideosAPI:
    """Tests for Bilibili videos endpoints."""

    def test_list_videos_empty(self, client: TestClient):
        response = client.get("/api/admin/bilibili/videos")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["total"] == 0
        assert data["items"] == []

    def test_add_video_invalid_bvid(self, client: TestClient):
        response = client.post(
            "/api/admin/bilibili/videos",
            json={"bvid": "invalid_bvid"},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "invalid_bvid_format"

    def test_add_video_missing_bvid(self, client: TestClient):
        response = client.post(
            "/api/admin/bilibili/videos",
            json={},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "bvid_required"

    def test_list_videos_with_data(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliVideo

        video = BilibiliVideo(
            bvid="BV1xx411c7mD",
            aid=123456,
            title="Test Video",
            owner_mid=789012,
            poll_enabled=True,
            last_poll_status="error",
            last_poll_error="retry_exhausted",
        )
        db_session.add(video)
        db_session.commit()

        response = client.get("/api/admin/bilibili/videos")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["bvid"] == "BV1xx411c7mD"
        assert data["items"][0]["last_poll_status"] == "error"
        assert data["items"][0]["last_poll_error"] == "retry_exhausted"

    def test_delete_video_not_found(self, client: TestClient):
        response = client.delete("/api/admin/bilibili/videos/99999")
        assert response.status_code == 404
        assert response.json()["detail"] == "video_not_found"

    def test_delete_video_success(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliVideo

        video = BilibiliVideo(
            bvid="BV1xx411c7mD",
            aid=123456,
            title="Test Video",
            owner_mid=789012,
            poll_enabled=True,
        )
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)

        response = client.delete(f"/api/admin/bilibili/videos/{video.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["deleted_id"] == video.id

    def test_toggle_video_poll(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliVideo

        video = BilibiliVideo(
            bvid="BV1xx411c7mD",
            aid=123456,
            title="Test Video",
            owner_mid=789012,
            poll_enabled=False,
        )
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)

        response = client.post(
            f"/api/admin/bilibili/videos/{video.id}/toggle-poll",
            json={"poll_enabled": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["item"]["poll_enabled"] is True


class TestBilibiliCredentialsAPI:
    """Tests for Bilibili credentials endpoints."""

    def test_list_credentials_empty(self, client: TestClient):
        response = client.get("/api/admin/bilibili/credentials")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["items"] == []

    def test_add_credential_missing_name(self, client: TestClient):
        response = client.post(
            "/api/admin/bilibili/credentials",
            json={"sessdata": "test", "bili_jct": "test", "buvid3": "test"},
        )
        assert response.status_code == 400
        assert "name_required" in response.json()["detail"]

    def test_add_credential_missing_sessdata(self, client: TestClient):
        response = client.post(
            "/api/admin/bilibili/credentials",
            json={"name": "test", "bili_jct": "test", "buvid3": "test"},
        )
        assert response.status_code == 400
        assert "sessdata_required" in response.json()["detail"]

    def test_add_credential_missing_bili_jct(self, client: TestClient):
        response = client.post(
            "/api/admin/bilibili/credentials",
            json={"name": "test", "sessdata": "test", "buvid3": "test"},
        )
        assert response.status_code == 400
        assert "bili_jct_required" in response.json()["detail"]

    def test_add_credential_missing_buvid3(self, client: TestClient):
        response = client.post(
            "/api/admin/bilibili/credentials",
            json={"name": "test", "sessdata": "test", "bili_jct": "test"},
        )
        assert response.status_code == 400
        assert "buvid3_required" in response.json()["detail"]

    def test_add_credential_success(self, client: TestClient, db_session: Session):
        response = client.post(
            "/api/admin/bilibili/credentials",
            json={
                "name": "test-credential",
                "sessdata": "test_sessdata",
                "bili_jct": "test_jct",
                "buvid3": "test_buvid3",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["item"]["name"] == "test-credential"
        assert data["item"]["is_active"] is True  # First credential auto-activated

    def test_add_second_credential_not_auto_activated(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliCredential

        # Add first credential
        cred1 = BilibiliCredential(
            name="cred1",
            sessdata="enc1",
            bili_jct="enc1",
            buvid3="buvid1",
            is_active=True,
        )
        db_session.add(cred1)
        db_session.commit()

        # Add second credential
        response = client.post(
            "/api/admin/bilibili/credentials",
            json={
                "name": "cred2",
                "sessdata": "sess2",
                "bili_jct": "jct2",
                "buvid3": "buvid2",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["item"]["is_active"] is False  # Second credential not auto-activated

    def test_activate_credential(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliCredential

        cred1 = BilibiliCredential(
            name="cred1",
            sessdata="enc1",
            bili_jct="enc1",
            buvid3="buvid1",
            is_active=True,
        )
        cred2 = BilibiliCredential(
            name="cred2",
            sessdata="enc2",
            bili_jct="enc2",
            buvid3="buvid2",
            is_active=False,
        )
        db_session.add_all([cred1, cred2])
        db_session.commit()
        db_session.refresh(cred2)

        response = client.post(
            f"/api/admin/bilibili/credentials/{cred2.id}/activate"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["active_credential_id"] == cred2.id

        # Verify cred1 is deactivated
        db_session.refresh(cred1)
        assert cred1.is_active is False

    def test_activate_credential_not_found(self, client: TestClient):
        response = client.post("/api/admin/bilibili/credentials/99999/activate")
        assert response.status_code == 404
        assert response.json()["detail"] == "credential_not_found"

    def test_delete_credential_not_found(self, client: TestClient):
        response = client.delete("/api/admin/bilibili/credentials/99999")
        assert response.status_code == 404
        assert response.json()["detail"] == "credential_not_found"

    def test_delete_credential_success(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliCredential

        credential = BilibiliCredential(
            name="to-delete",
            sessdata="encrypted",
            bili_jct="encrypted",
            buvid3="buvid",
            is_active=False,
        )
        db_session.add(credential)
        db_session.commit()
        db_session.refresh(credential)

        response = client.delete(f"/api/admin/bilibili/credentials/{credential.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["deleted_id"] == credential.id


class TestBilibiliPollAPI:
    """Tests for manual poll trigger endpoint."""

    def test_trigger_poll_no_videos(self, client: TestClient, db_session: Session):
        # No videos in database
        response = client.post("/api/admin/bilibili/poll")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        # With no enabled videos, should return 0 counts

    def test_trigger_poll_with_video_no_credential(self, client: TestClient, db_session: Session):
        from app.models.entities import BilibiliVideo

        video = BilibiliVideo(
            bvid="BV1xx411c7mD",
            aid=123456,
            title="Test Video",
            owner_mid=789012,
            poll_enabled=True,
        )
        db_session.add(video)
        db_session.commit()

        response = client.post("/api/admin/bilibili/poll")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
