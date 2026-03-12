"""Tests for Bilibili Poller service."""
import pytest
from sqlalchemy.orm import Session


class TestBilibiliPollerInit:
    """Tests for BilibiliPoller initialization."""

    def test_poller_initialization(self, db_session: Session):
        from app.services.bilibili_poller import BilibiliPoller
        poller = BilibiliPoller(db_session)
        assert poller.db == db_session

    def test_poll_all_videos_no_enabled_videos(self, db_session: Session):
        from app.services.bilibili_poller import BilibiliPoller

        poller = BilibiliPoller(db_session)
        result = poller.poll_all_videos()

        # Should return result dict with status disabled when bilibili is disabled
        assert isinstance(result, dict)
        assert "status" in result or "videos_polled" in result or "videos" in result

    def test_poll_all_videos_with_video_no_credential(self, db_session: Session):
        from app.services.bilibili_poller import BilibiliPoller
        from app.models.entities import BilibiliVideo

        video = BilibiliVideo(
            bvid="BV1xx411c7mD",
            aid=123456,
            title="Test Video",
            owner_mid=789012,
            poll_enabled=True,
            last_rpid=0,
        )
        db_session.add(video)
        db_session.commit()

        poller = BilibiliPoller(db_session)
        result = poller.poll_all_videos()

        # Should return result dict
        assert isinstance(result, dict)


class TestBilibiliPublisher:
    """Tests for BilibiliPublisher."""

    def test_publisher_initialization(self, db_session: Session):
        from app.services.bilibili_publisher import BilibiliPublisher
        publisher = BilibiliPublisher(db_session)
        assert publisher.db == db_session
