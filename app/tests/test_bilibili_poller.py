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




    def test_bilibili_publisher_duplicate_does_not_call_external_api(self, db_session: Session, monkeypatch):
        from app.models.entities import PublishLog
        from app.services.bilibili_publisher import BilibiliPublisher
        from app.services.hashing import reply_hash
        from app.settings import settings

        monkeypatch.setattr(settings, "bilibili_enabled", True)
        monkeypatch.setattr(settings, "bilibili_publish_enabled", True)

        comment_id = "comment-bili-dup-1"
        reply_text = "reply text"
        canonical_comment_id = f"bilibili:{comment_id}"

        db_session.add(
            PublishLog(
                platform="bilibili",
                canonical_comment_id=canonical_comment_id,
                comment_id=comment_id,
                reply_hash=reply_hash(comment_id, reply_text),
                source="bilibili-api",
                status="published",
            )
        )
        db_session.commit()

        def fail_if_called(*args, **kwargs):
            raise AssertionError("reply_comment should not be called for duplicate payload")

        from app.services import bilibili_client as bilibili_client_module

        monkeypatch.setattr(bilibili_client_module.BilibiliClient, "reply_comment", fail_if_called)

        publisher = BilibiliPublisher(db_session)
        ok, reason, published_at, new_rpid = publisher.publish_reply(
            comment_id=comment_id,
            reply_text=reply_text,
            video_bvid="BV1xx411c7mD",
            oid=123456,
            trace_id="trace-bili-dup-1",
        )

        assert ok is False
        assert reason == "duplicate"
        assert published_at is None
        assert new_rpid is None
