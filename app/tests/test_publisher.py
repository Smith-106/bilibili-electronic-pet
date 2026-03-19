from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.services.publisher import (
    _PUBLISH_CIRCUIT_STATE,
    _get_publisher,
    ManualQueuePublisher,
    RealPublishPublisher,
    WebhookPublisher,
    publish_gateway_reply,
    publish_platform_reply,
    publish_reply,
)
from app.settings import settings


class DummyResponse:
    def __init__(self, payload: dict):
        self._payload = payload
        self.content = b"{}"

    def json(self) -> dict:
        return self._payload


@pytest.fixture(autouse=True)
def reset_publish_circuit_state():
    for state in _PUBLISH_CIRCUIT_STATE.values():
        state.consecutive_failures = 0
        state.opened_until = None
        state.half_open_probe_in_flight = False


def test_publish_reply_manual_queue_mode(monkeypatch):
    monkeypatch.setattr(settings, "publisher_mode", "manual_queue")
    published, reason, published_at = publish_reply("comment-1", "reply text")

    assert published is False
    assert reason == "manual_queue"
    assert published_at is None


def test_publish_reply_webhook_mode_keeps_missing_url_behavior(monkeypatch):
    monkeypatch.setattr(settings, "publisher_mode", "webhook")
    monkeypatch.setattr(settings, "publisher_webhook_url", "")

    published, reason, published_at = publish_reply("comment-1", "reply text")

    assert published is False
    assert reason == "invalid_response"
    assert published_at is None


def test_publish_reply_real_publish_mode_success(monkeypatch):
    monkeypatch.setattr(settings, "publisher_mode", "real_publish")
    monkeypatch.setattr(settings, "publisher_real_publish_url", "https://publisher.example.com/reply")
    monkeypatch.setattr(settings, "publisher_real_publish_token", "token-123")
    monkeypatch.setattr(settings, "publisher_hmac_secret", "hmac-secret")

    captured: dict[str, dict] = {}

    def fake_send(self, payload: dict, headers: dict):
        captured["payload"] = payload
        captured["headers"] = headers
        return DummyResponse({"ok": True, "published": True, "reason": "official_publish_ok"})

    monkeypatch.setattr(RealPublishPublisher, "_send", fake_send)

    published, reason, published_at = publish_reply("comment-2", "reply text", force_publish=True, trace_id="trace-2")

    assert published is True
    assert reason == "official_publish_ok"
    assert isinstance(published_at, datetime)
    assert captured["payload"]["force_publish"] is True
    assert captured["payload"]["trace_id"] == "trace-2"
    assert captured["headers"]["Authorization"] == "Bearer token-123"
    assert "X-Signature" in captured["headers"]




def test_publish_platform_reply_uses_platform_source(monkeypatch):
    monkeypatch.setattr(settings, "publisher_real_publish_url", "https://publisher.example.com/reply")
    monkeypatch.setattr(settings, "platform_douyin_enabled", True)
    monkeypatch.setattr(settings, "platform_douyin_publish_source", "douyin-open")

    captured: dict[str, dict] = {}

    def fake_send(self, payload: dict, headers: dict):
        captured["payload"] = payload
        captured["headers"] = headers
        return DummyResponse({"ok": True, "published": True, "reason": "platform_ok"})

    monkeypatch.setattr(RealPublishPublisher, "_send", fake_send)

    published, reason, published_at = publish_platform_reply(
        platform="douyin",
        comment_id="comment-4",
        reply_text="reply text",
        trace_id="trace-platform",
    )

    assert published is True
    assert reason == "platform_ok"
    assert isinstance(published_at, datetime)
    assert captured["payload"]["source"] == "douyin-open"
    assert captured["payload"]["trace_id"] == "trace-platform"


def test_publish_platform_reply_disabled_platform_falls_back_to_manual_queue(monkeypatch):
    monkeypatch.setattr(settings, "platform_douyin_enabled", False)

    published, reason, published_at = publish_platform_reply(
        platform="douyin",
        comment_id="comment-disabled",
        reply_text="reply text",
        trace_id="trace-disabled",
    )

    assert published is False
    assert reason == "manual_queue"
    assert published_at is None




def test_publish_gateway_reply_preserves_source_and_reason(monkeypatch):
    monkeypatch.setattr(settings, "publisher_real_publish_url", "https://publisher.example.com/reply")
    monkeypatch.setattr(settings, "publisher_real_publish_token", "")
    monkeypatch.setattr(settings, "publisher_hmac_secret", "")

    def fake_send(self, payload: dict, headers: dict):
        assert payload["source"] == "gateway"
        assert payload["trace_id"] == "trace-gateway"
        assert headers["Content-Type"] == "application/json"
        return DummyResponse({"ok": False, "published": False, "reason": "remote_declined"})

    monkeypatch.setattr(RealPublishPublisher, "_send", fake_send)

    published, reason, published_at = publish_gateway_reply(
        "comment-3",
        "reply text",
        source="gateway",
        trace_id="trace-gateway",
    )

    assert published is False
    assert reason == "invalid_response"
    assert published_at is None


def test_publish_reply_real_publish_mode_classifies_timeout(monkeypatch):
    monkeypatch.setattr(settings, "publisher_mode", "real_publish")
    monkeypatch.setattr(settings, "publisher_real_publish_url", "https://publisher.example.com/reply")
    monkeypatch.setattr(settings, "publisher_circuit_breaker_enabled", True)
    monkeypatch.setattr(settings, "publisher_circuit_failure_threshold", 5)
    monkeypatch.setattr(settings, "publisher_circuit_open_seconds", 10)

    request = httpx.Request("POST", "https://publisher.example.com/reply")

    def fake_send(self, payload: dict, headers: dict):
        _ = payload, headers
        raise httpx.ReadTimeout("timeout", request=request)

    monkeypatch.setattr(RealPublishPublisher, "_send", fake_send)

    published, reason, published_at = publish_reply("comment-timeout", "reply text")

    assert published is False
    assert reason == "timeout"
    assert published_at is None


def test_publish_reply_real_publish_mode_opens_circuit_after_threshold(monkeypatch):
    monkeypatch.setattr(settings, "publisher_mode", "real_publish")
    monkeypatch.setattr(settings, "publisher_real_publish_url", "https://publisher.example.com/reply")
    monkeypatch.setattr(settings, "publisher_circuit_breaker_enabled", True)
    monkeypatch.setattr(settings, "publisher_circuit_failure_threshold", 1)
    monkeypatch.setattr(settings, "publisher_circuit_open_seconds", 30)

    calls = {"count": 0}
    request = httpx.Request("POST", "https://publisher.example.com/reply")

    def fake_send(self, payload: dict, headers: dict):
        _ = payload, headers
        calls["count"] += 1
        raise httpx.ConnectError("connection failed", request=request)

    monkeypatch.setattr(RealPublishPublisher, "_send", fake_send)

    first_published, first_reason, _ = publish_reply("comment-circuit-1", "reply text")
    second_published, second_reason, second_published_at = publish_reply("comment-circuit-2", "reply text")

    assert first_published is False
    assert first_reason == "invalid_response"
    assert second_published is False
    assert second_reason == "invalid_response"
    assert second_published_at is None
    assert calls["count"] == 1


def test_publish_reply_real_publish_mode_recovers_after_open_window(monkeypatch):
    monkeypatch.setattr(settings, "publisher_mode", "real_publish")
    monkeypatch.setattr(settings, "publisher_real_publish_url", "https://publisher.example.com/reply")
    monkeypatch.setattr(settings, "publisher_circuit_breaker_enabled", True)
    monkeypatch.setattr(settings, "publisher_circuit_failure_threshold", 1)
    monkeypatch.setattr(settings, "publisher_circuit_open_seconds", 30)

    calls = {"count": 0}
    request = httpx.Request("POST", "https://publisher.example.com/reply")

    def failing_send(self, payload: dict, headers: dict):
        _ = payload, headers
        calls["count"] += 1
        raise httpx.ConnectError("connection failed", request=request)

    monkeypatch.setattr(RealPublishPublisher, "_send", failing_send)
    first_published, _, _ = publish_reply("comment-recover-1", "reply text")
    blocked_published, _, _ = publish_reply("comment-recover-2", "reply text")

    state = _PUBLISH_CIRCUIT_STATE["real_publish"]
    state.opened_until = datetime.now(timezone.utc) - timedelta(seconds=1)

    def success_send(self, payload: dict, headers: dict):
        _ = payload, headers
        calls["count"] += 1
        return DummyResponse({"ok": True, "published": True, "reason": "publish_ok"})

    monkeypatch.setattr(RealPublishPublisher, "_send", success_send)
    recovered_published, recovered_reason, recovered_published_at = publish_reply("comment-recover-3", "reply text")

    assert first_published is False
    assert blocked_published is False
    assert recovered_published is True
    assert recovered_reason == "publish_ok"
    assert isinstance(recovered_published_at, datetime)
    assert calls["count"] == 2


def test_publisher_selection_manual_queue_with_bilibili_disabled(monkeypatch):
    """Test manual_queue mode when Bilibili is disabled."""
    monkeypatch.setattr(settings, "publisher_mode", "manual_queue")
    monkeypatch.setattr(settings, "bilibili_enabled", False)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", False)

    publisher = _get_publisher()
    assert isinstance(publisher, ManualQueuePublisher)


def test_publisher_selection_native_bilibili_overrides_webhook_mode(monkeypatch):
    """Test native Bilibili publisher takes precedence over webhook mode."""
    monkeypatch.setattr(settings, "publisher_mode", "webhook")
    monkeypatch.setattr(settings, "bilibili_enabled", True)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", True)
    monkeypatch.setattr(settings, "bilibili_sessdata", "test-sessdata")
    monkeypatch.setattr(settings, "bilibili_bili_jct", "test-bili-jct")
    monkeypatch.setattr(settings, "bilibili_buvid3", "test-buvid3")
    monkeypatch.setattr(settings, "bilibili_buvid4", "test-buvid4")
    monkeypatch.setattr(settings, "bilibili_cookie_encryption_key", "test-key-32-bytes-long-enough")

    from app.services.bilibili_publisher import BilibiliPublisherAdapter
    publisher = _get_publisher()
    assert isinstance(publisher, BilibiliPublisherAdapter)


def test_publisher_selection_native_bilibili_overrides_real_publish_mode(monkeypatch):
    """Test native Bilibili publisher takes precedence over real_publish mode."""
    monkeypatch.setattr(settings, "publisher_mode", "real_publish")
    monkeypatch.setattr(settings, "bilibili_enabled", True)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", True)
    monkeypatch.setattr(settings, "bilibili_sessdata", "test-sessdata")
    monkeypatch.setattr(settings, "bilibili_bili_jct", "test-bili-jct")
    monkeypatch.setattr(settings, "bilibili_buvid3", "test-buvid3")
    monkeypatch.setattr(settings, "bilibili_buvid4", "test-buvid4")
    monkeypatch.setattr(settings, "bilibili_cookie_encryption_key", "test-key-32-bytes-long-enough")

    from app.services.bilibili_publisher import BilibiliPublisherAdapter
    publisher = _get_publisher()
    assert isinstance(publisher, BilibiliPublisherAdapter)


def test_publisher_selection_webhook_mode_without_bilibili(monkeypatch):
    """Test webhook mode is used when Bilibili is not enabled."""
    monkeypatch.setattr(settings, "publisher_mode", "webhook")
    monkeypatch.setattr(settings, "bilibili_enabled", False)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", False)
    monkeypatch.setattr(settings, "publisher_webhook_url", "https://webhook.example.com")
    monkeypatch.setattr(settings, "publisher_webhook_token", "test-token")
    monkeypatch.setattr(settings, "publisher_hmac_secret", "test-hmac")

    publisher = _get_publisher()
    assert isinstance(publisher, WebhookPublisher)


def test_publisher_selection_fallback_for_unknown_mode(monkeypatch):
    """Test fallback to ManualQueuePublisher for unknown publisher_mode."""
    monkeypatch.setattr(settings, "publisher_mode", "unknown_mode")
    monkeypatch.setattr(settings, "bilibili_enabled", False)
    monkeypatch.setattr(settings, "bilibili_publish_enabled", False)

    publisher = _get_publisher()
    assert isinstance(publisher, ManualQueuePublisher)
