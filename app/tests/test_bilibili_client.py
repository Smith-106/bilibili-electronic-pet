"""Tests for Bilibili API client."""
import pytest
from unittest.mock import MagicMock, patch

from app.services.bilibili_client import (
    CredentialEncryption,
    BilibiliComment,
    BilibiliVideoInfo,
    RateLimiter,
)


class TestRateLimiter:
    """Tests for RateLimiter."""

    def test_rate_limiter_allows_calls_under_limit(self):
        limiter = RateLimiter(max_calls=10, period_seconds=60)
        for _ in range(10):
            assert limiter.acquire() is True

    def test_rate_limiter_blocks_over_limit(self):
        limiter = RateLimiter(max_calls=2, period_seconds=60)
        assert limiter.acquire() is True
        assert limiter.acquire() is True
        assert limiter.acquire() is False

    def test_rate_limiter_wait_time(self):
        limiter = RateLimiter(max_calls=1, period_seconds=60)
        limiter.acquire()
        wait = limiter.wait_time()
        assert wait > 0
        assert wait <= 60

    def test_rate_limiter_wait_time_empty(self):
        limiter = RateLimiter(max_calls=10, period_seconds=60)
        assert limiter.wait_time() == 0.0

    def test_rate_limiter_reuses_window_after_expiration(self):
        limiter = RateLimiter(max_calls=2, period_seconds=60)
        with patch("app.services.bilibili_client.time.time", side_effect=[0.0, 1.0, 61.0]):
            assert limiter.acquire() is True
            assert limiter.acquire() is True
            assert limiter.acquire() is True

    def test_rate_limiter_wait_time_prunes_expired_calls(self):
        limiter = RateLimiter(max_calls=1, period_seconds=60)
        with patch("app.services.bilibili_client.time.time", side_effect=[0.0, 61.0]):
            assert limiter.acquire() is True
            assert limiter.wait_time() == 0.0
        assert list(limiter.calls) == []


class TestCredentialEncryption:
    """Tests for CredentialEncryption."""

    def test_encrypt_decrypt_roundtrip(self):
        encryption = CredentialEncryption("test-secret-key-32-bytes-long!!")
        plaintext = "my-secret-sessdata-value"
        encrypted = encryption.encrypt(plaintext)
        decrypted = encryption.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_produces_different_ciphertext(self):
        encryption = CredentialEncryption("test-secret-key-32-bytes-long!!")
        plaintext = "my-secret-value"
        encrypted1 = encryption.encrypt(plaintext)
        encrypted2 = encryption.encrypt(plaintext)
        # Same plaintext should produce different ciphertext (due to IV)
        assert encrypted1 != encrypted2

    def test_encrypt_returns_base64(self):
        encryption = CredentialEncryption("test-secret-key-32-bytes-long!!")
        encrypted = encryption.encrypt("test-value")
        # Should be valid base64
        import base64
        try:
            base64.urlsafe_b64decode(encrypted)
            assert True
        except Exception:
            assert False, "Encrypted value is not valid base64"

    def test_init_fails_with_empty_key(self):
        """CredentialEncryption should fail-fast when key is empty."""
        from app.services.bilibili_client import CredentialEncryptionError
        with pytest.raises(CredentialEncryptionError) as exc_info:
            CredentialEncryption("")
        assert "BILIBILI_COOKIE_ENCRYPTION_KEY" in str(exc_info.value)

    def test_init_fails_with_none_key(self):
        """CredentialEncryption should fail-fast when key is None."""
        from app.services.bilibili_client import CredentialEncryptionError
        with pytest.raises(CredentialEncryptionError) as exc_info:
            CredentialEncryption(None)
        assert "BILIBILI_COOKIE_ENCRYPTION_KEY" in str(exc_info.value)

    def test_decrypt_fails_with_invalid_ciphertext(self):
        """Decrypt should fail-fast with invalid ciphertext, not return original."""
        from app.services.bilibili_client import CredentialEncryptionError
        encryption = CredentialEncryption("test-secret-key-32-bytes-long!!")
        with pytest.raises(CredentialEncryptionError) as exc_info:
            encryption.decrypt("not-valid-encrypted-data")
        assert "decrypt" in str(exc_info.value).lower()

    def test_encrypt_empty_string_returns_empty(self):
        """Encrypt should handle empty string gracefully."""
        encryption = CredentialEncryption("test-secret-key-32-bytes-long!!")
        assert encryption.encrypt("") == ""

    def test_decrypt_empty_string_returns_empty(self):
        """Decrypt should handle empty string gracefully."""
        encryption = CredentialEncryption("test-secret-key-32-bytes-long!!")
        assert encryption.decrypt("") == ""


class TestBilibiliComment:
    """Tests for BilibiliComment dataclass."""

    def test_comment_creation(self):
        comment = BilibiliComment(
            rpid=12345,
            oid=67890,
            mid=11111,
            content="test comment",
            parent_rpid=0,
            ctime=1700000000,
            like_count=10,
            member_name="test_user",
            member_avatar="https://example.com/avatar.jpg",
        )
        assert comment.rpid == 12345
        assert comment.oid == 67890
        assert comment.mid == 11111
        assert comment.content == "test comment"
        assert comment.parent_rpid == 0
        assert comment.like_count == 10
        assert comment.member_name == "test_user"


class TestBilibiliVideoInfo:
    """Tests for BilibiliVideoInfo dataclass."""

    def test_video_info_creation(self):
        video = BilibiliVideoInfo(
            bvid="BV1xx411c7mD",
            aid=123456,
            title="Test Video",
            description="Test description",
            owner_mid=789012,
            owner_name="test_uploader",
            view_count=1000,
            like_count=100,
            comment_count=50,
            pubdate=1700000000,
        )
        assert video.bvid == "BV1xx411c7mD"
        assert video.aid == 123456
        assert video.title == "Test Video"
        assert video.owner_mid == 789012
