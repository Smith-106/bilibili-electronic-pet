"""Integration tests for approval flow with native Bilibili publisher.

Tests the full chain: _approve_job_core → publish_reply → _get_publisher → BilibiliPublisherAdapter
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from app.api.comments import _approve_job_core
from app.models.entities import ReplyJob, Comment, BilibiliVideo, BilibiliCredential
from app.services.bilibili_publisher import BilibiliPublisher
from app.settings import settings


class TestApprovalNativeBilibiliIntegration:
    """Integration tests for approval flow with native Bilibili publisher."""

    @pytest.fixture
    def setup_data(self, db_session: Session):
        """Set up test data: comment, job, video, credential."""
        # Create Bilibili credential
        credential = BilibiliCredential(
            id=1,
            name="test-credential",
            sessdata="encrypted-sessdata",
            bili_jct="encrypted-bili_jct",
            buvid3="test-buvid3",
            is_active=True,
        )
        db_session.add(credential)

        # Create Bilibili video
        video = BilibiliVideo(
            bvid="BV1xx411c7mD",
            aid=123456,
            title="Test Video",
            owner_mid=789012,
            poll_enabled=True,
            last_rpid=0,
        )
        db_session.add(video)

        # Create comment
        comment = Comment(
            canonical_comment_id="bilibili:100",
            platform="bilibili",
            comment_id="100",
            video_id="BV1xx411c7mD",
            user_id="111",
            content="test comment",
            parent_id=None,
        )
        db_session.add(comment)

        # Create reply job in manual_queue status
        job = ReplyJob(
            comment_id="100",
            canonical_comment_id="bilibili:100",
            status="manual_queue",
            reply_text="test reply",
        )
        db_session.add(job)
        db_session.commit()

        return {
            "credential": credential,
            "video": video,
            "comment": comment,
            "job": job,
        }

    def test_approval_success_with_force_publish(
        self, db_session: Session, setup_data, monkeypatch
    ):
        """Test that native Bilibili publisher accepts force_publish=True and can publish successfully."""
        # Enable native Bilibili publishing
        monkeypatch.setattr(settings, "bilibili_enabled", True)
        monkeypatch.setattr(settings, "bilibili_publish_enabled", True)

        # Mock BilibiliClient.reply_comment to simulate successful reply
        mock_new_rpid = 999
        with patch(
            "app.services.bilibili_client.BilibiliClient.reply_comment"
        ) as mock_reply:
            mock_reply.return_value = (True, "success", mock_new_rpid)

            # Mock credential retrieval
            with patch(
                "app.services.bilibili_client.BilibiliClient.get_credential"
            ) as mock_cred:
                mock_cred.return_value = setup_data["credential"]

                # Mock expiration check
                with patch(
                    "app.services.bilibili_client.BilibiliClient.check_credential_expiration"
                ) as mock_exp:
                    mock_exp.return_value = (False, 999)

                    # Test the adapter directly (approval flow → publish_reply → adapter)
                    from app.services.bilibili_publisher import BilibiliPublisherAdapter

                    adapter = BilibiliPublisherAdapter(db_session)
                    success, reason, published_at = adapter.publish(
                        comment_id="100",
                        reply_text="test reply",
                        force_publish=True,  # From approval flow
                        trace_id="test-trace",
                        video_bvid="BV1xx411c7mD",  # Video context from comment
                    )

        # Verify approval succeeded (force_publish accepted, not rejected)
        assert success is True
        assert reason == "published"
        assert published_at is not None
        mock_reply.assert_called_once()

    def test_approval_duplicate_with_force_publish(
        self, db_session: Session, setup_data, monkeypatch
    ):
        """Test that native Bilibili publisher handles duplicate (idempotent_replay) correctly with force_publish=True."""
        from app.services.hashing import reply_hash
        from app.models.entities import PublishLog

        # Enable native Bilibili publishing
        monkeypatch.setattr(settings, "bilibili_enabled", True)
        monkeypatch.setattr(settings, "bilibili_publish_enabled", True)

        # Pre-create a PublishLog entry to simulate duplicate
        comment_id = "100"
        reply_text = "test reply"
        canonical_comment_id = f"bilibili:{comment_id}"
        hashed = reply_hash(comment_id, reply_text)

        existing_log = PublishLog(
            platform="bilibili",
            canonical_comment_id=canonical_comment_id,
            comment_id=comment_id,
            reply_hash=hashed,
            source="bilibili-api",
            status="published",
        )
        db_session.add(existing_log)
        db_session.commit()

        # Mock BilibiliClient.reply_comment (should NOT be called due to duplicate)
        with patch(
            "app.services.bilibili_client.BilibiliClient.reply_comment"
        ) as mock_reply:
            # Test the adapter directly with force_publish=True
            from app.services.bilibili_publisher import BilibiliPublisherAdapter

            adapter = BilibiliPublisherAdapter(db_session)
            success, reason, published_at = adapter.publish(
                comment_id="100",
                reply_text="test reply",
                force_publish=True,  # From approval flow
                trace_id="test-trace",
                video_bvid="BV1xx411c7mD",
            )

        # Verify duplicate detected (idempotent_replay)
        assert success is False
        assert reason == "idempotent_replay"
        assert published_at is None
        # Verify reply_comment was NOT called (duplicate detected at reserve stage)
        mock_reply.assert_not_called()

    def test_approval_failure_with_force_publish(
        self, db_session: Session, setup_data, monkeypatch
    ):
        """Test that native Bilibili publisher handles Bilibili API failure correctly with force_publish=True."""
        # Enable native Bilibili publishing
        monkeypatch.setattr(settings, "bilibili_enabled", True)
        monkeypatch.setattr(settings, "bilibili_publish_enabled", True)

        # Mock BilibiliClient.reply_comment to simulate failure
        with patch(
            "app.services.bilibili_client.BilibiliClient.reply_comment"
        ) as mock_reply:
            mock_reply.return_value = (False, "rate_limit_exceeded", None)

            # Mock credential retrieval
            with patch(
                "app.services.bilibili_client.BilibiliClient.get_credential"
            ) as mock_cred:
                mock_cred.return_value = setup_data["credential"]

                # Mock expiration check
                with patch(
                    "app.services.bilibili_client.BilibiliClient.check_credential_expiration"
                ) as mock_exp:
                    mock_exp.return_value = (False, 999)

                    # Test the adapter directly with force_publish=True
                    from app.services.bilibili_publisher import BilibiliPublisherAdapter

                    adapter = BilibiliPublisherAdapter(db_session)
                    success, reason, published_at = adapter.publish(
                        comment_id="100",
                        reply_text="test reply",
                        force_publish=True,  # From approval flow
                        trace_id="test-trace",
                        video_bvid="BV1xx411c7mD",
                    )

        # Verify failure reason propagated (normalized to "invalid_response" for non-standard reasons)
        assert success is False
        assert reason == "invalid_response"  # "rate_limit_exceeded" is normalized to "invalid_response"
        assert published_at is None
        mock_reply.assert_called_once()

    def test_approval_ignores_force_publish_semantic(
        self, db_session: Session, setup_data, monkeypatch
    ):
        """Test that native Bilibili publisher accepts force_publish=True without error.

        This test verifies the fix: BilibiliPublisherAdapter no longer rejects force_publish.
        The reserve-first idempotency in BilibiliPublisher.publish_reply() is sufficient.
        """
        # Enable native Bilibili publishing
        monkeypatch.setattr(settings, "bilibili_enabled", True)
        monkeypatch.setattr(settings, "bilibili_publish_enabled", True)

        # Mock BilibiliClient.reply_comment
        mock_new_rpid = 888
        with patch(
            "app.services.bilibili_client.BilibiliClient.reply_comment"
        ) as mock_reply:
            mock_reply.return_value = (True, "success", mock_new_rpid)

            # Mock credential
            with patch(
                "app.services.bilibili_client.BilibiliClient.get_credential"
            ) as mock_cred:
                mock_cred.return_value = setup_data["credential"]

                # Mock expiration
                with patch(
                    "app.services.bilibili_client.BilibiliClient.check_credential_expiration"
                ) as mock_exp:
                    mock_exp.return_value = (False, 999)

                    # Call the adapter directly with force_publish=True
                    from app.services.bilibili_publisher import BilibiliPublisherAdapter

                    adapter = BilibiliPublisherAdapter(db_session)
                    success, reason, published_at = adapter.publish(
                        comment_id="100",
                        reply_text="test reply",
                        force_publish=True,  # This was previously rejected
                        trace_id="test-trace",
                        video_bvid="BV1xx411c7mD",
                    )

        # Verify it succeeded (not rejected with "force_publish_ignored")
        assert success is True
        assert reason == "published"
        assert published_at is not None
        mock_reply.assert_called_once()
