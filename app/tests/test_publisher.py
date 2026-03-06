from datetime import datetime

from app.services.publisher import RealPublishPublisher, publish_gateway_reply, publish_reply
from app.settings import settings


class DummyResponse:
    def __init__(self, payload: dict):
        self._payload = payload
        self.content = b"{}"

    def json(self) -> dict:
        return self._payload


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
    assert reason == "webhook_url_missing"
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
    assert reason == "remote_declined"
    assert published_at is None
