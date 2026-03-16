from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.api.gateway as gateway_api
from app.db import Base, get_db
from app.models.entities import PublishLog
from app.services.hashing import reply_hash, sign_payload
from app.settings import settings


@pytest.fixture()
def gateway_test_client(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    test_app = FastAPI()
    test_app.include_router(gateway_api.router)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    test_app.dependency_overrides[get_db] = override_get_db

    monkeypatch.setattr(settings, "api_key", "")
    monkeypatch.setattr(settings, "gateway_token", "")
    monkeypatch.setattr(settings, "gateway_hmac_secret", "")

    with TestClient(test_app) as client:
        yield client, testing_session_local

    test_app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_gateway_publish_rejects_invalid_token(gateway_test_client, monkeypatch):
    client, _ = gateway_test_client
    monkeypatch.setattr(settings, "gateway_token", "gateway-token")

    response = client.post(
        "/gateway/publish",
        json={"comment_id": "comment-1", "reply_text": "reply text"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "unauthorized"


def test_gateway_publish_rejects_invalid_signature(gateway_test_client, monkeypatch):
    client, _ = gateway_test_client
    monkeypatch.setattr(settings, "gateway_hmac_secret", "gateway-hmac")

    response = client.post(
        "/gateway/publish",
        json={"comment_id": "comment-2", "reply_text": "reply text"},
        headers={"X-Signature": "invalid-signature"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_signature"


def test_gateway_publish_success_uses_adapter_reason_and_records_log(gateway_test_client, monkeypatch):
    client, testing_session_local = gateway_test_client
    monkeypatch.setattr(settings, "gateway_token", "gateway-token")
    monkeypatch.setattr(settings, "gateway_hmac_secret", "gateway-hmac")

    captured: dict[str, object] = {}

    def fake_publish_gateway_reply(comment_id, reply_text, force_publish=False, source="bili-pet-bot", trace_id=None):
        captured["comment_id"] = comment_id
        captured["reply_text"] = reply_text
        captured["force_publish"] = force_publish
        captured["source"] = source
        captured["trace_id"] = trace_id
        return True, "official_publish_ok", datetime(2026, 3, 7, 1, 0, 0)

    monkeypatch.setattr(gateway_api, "publish_gateway_reply", fake_publish_gateway_reply)

    payload = {
        "comment_id": "comment-3",
        "reply_text": "reply text",
        "force_publish": True,
        "source": "gateway",
        "trace_id": "trace-3",
    }
    signature = sign_payload(payload, "gateway-hmac")

    response = client.post(
        "/gateway/publish",
        json=payload,
        headers={
            "Authorization": "Bearer gateway-token",
            "X-Signature": signature,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"ok", "published", "reason", "comment_id", "published_at", "trace_id"}
    assert body["ok"] is True
    assert body["published"] is True
    assert body["reason"] == "official_publish_ok"
    assert body["comment_id"] == "comment-3"
    assert body["trace_id"] == "trace-3"
    assert captured == {
        "comment_id": "comment-3",
        "reply_text": "reply text",
        "force_publish": True,
        "source": "gateway",
        "trace_id": "trace-3",
    }

    with testing_session_local() as db:
        logs = db.query(PublishLog).all()
        assert len(logs) == 1
        assert logs[0].comment_id == "comment-3"
        assert logs[0].canonical_comment_id == "bilibili:comment-3"
        assert logs[0].platform == "bilibili"
        assert logs[0].status == "published"
        assert logs[0].reply_hash == reply_hash("comment-3", "reply text")


def test_gateway_publish_duplicate_replay_skips_adapter(gateway_test_client, monkeypatch):
    client, testing_session_local = gateway_test_client

    with testing_session_local() as db:
        db.add(PublishLog(platform="bilibili", canonical_comment_id="bilibili:comment-4", comment_id="comment-4", reply_hash=reply_hash("comment-4", "reply text"), source="gateway", status="published"))
        db.commit()

    def fail_if_called(*args, **kwargs):
        raise AssertionError("publish_gateway_reply should not be called for duplicate payload")

    monkeypatch.setattr(gateway_api, "publish_gateway_reply", fail_if_called)

    response = client.post(
        "/gateway/publish",
        json={"comment_id": "comment-4", "reply_text": "reply text", "source": "gateway", "trace_id": "trace-4"},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"ok", "published", "duplicate", "reason", "trace_id"}
    assert body["ok"] is True
    assert body["published"] is False
    assert body["duplicate"] is True
    assert body["reason"] == "idempotent_replay"
    assert body["trace_id"] == "trace-4"


def test_gateway_publish_bilibili_route_returns_platform_disabled(gateway_test_client, monkeypatch):
    client, _ = gateway_test_client
    monkeypatch.setattr(settings, "platform_bilibili_enabled", False)

    response = client.post(
        "/gateway/publish/bilibili",
        json={"comment_id": "comment-bili-disabled-1", "reply_text": "reply text"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "platform_disabled: bilibili"


def test_gateway_publish_douyin_route_returns_platform_disabled(gateway_test_client, monkeypatch):
    client, _ = gateway_test_client
    monkeypatch.setattr(settings, "platform_douyin_enabled", False)

    response = client.post(
        "/gateway/publish/douyin",
        json={"comment_id": "comment-dy-1", "reply_text": "reply text"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "platform_disabled: douyin"


def test_gateway_publish_kuaishou_route_returns_platform_disabled(gateway_test_client, monkeypatch):
    client, _ = gateway_test_client
    monkeypatch.setattr(settings, "platform_kuaishou_enabled", False)

    response = client.post(
        "/gateway/publish/kuaishou",
        json={"comment_id": "comment-ks-1", "reply_text": "reply text"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "platform_disabled: kuaishou"


def test_gateway_publish_bilibili_route_uses_platform_adapter_and_source(gateway_test_client, monkeypatch):
    client, testing_session_local = gateway_test_client
    monkeypatch.setattr(settings, "platform_bilibili_enabled", True)
    monkeypatch.setattr(settings, "platform_bilibili_publish_source", "bilibili-open")

    captured: dict[str, object] = {}

    def fake_publish_platform_reply(platform, comment_id, reply_text, force_publish=False, trace_id=None):
        captured["platform"] = platform
        captured["comment_id"] = comment_id
        captured["reply_text"] = reply_text
        captured["force_publish"] = force_publish
        captured["trace_id"] = trace_id
        return True, "platform_publish_ok", datetime(2026, 3, 7, 2, 0, 0)

    monkeypatch.setattr(gateway_api, "publish_platform_reply", fake_publish_platform_reply)

    response = client.post(
        "/gateway/publish/bilibili",
        json={
            "comment_id": "comment-bili-1",
            "reply_text": "reply text",
            "force_publish": True,
            "trace_id": "trace-bili-1",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"ok", "published", "reason", "comment_id", "published_at", "trace_id"}
    assert body["ok"] is True
    assert body["published"] is True
    assert body["reason"] == "platform_publish_ok"
    assert body["comment_id"] == "comment-bili-1"
    assert captured == {
        "platform": "bilibili",
        "comment_id": "comment-bili-1",
        "reply_text": "reply text",
        "force_publish": True,
        "trace_id": "trace-bili-1",
    }

    with testing_session_local() as db:
        logs = db.query(PublishLog).filter(PublishLog.canonical_comment_id == "bilibili:comment-bili-1").all()
        assert len(logs) == 1
        assert logs[0].source == "bilibili-open"


def test_gateway_publish_bilibili_route_duplicate_replay_keeps_contract(gateway_test_client, monkeypatch):
    client, testing_session_local = gateway_test_client
    monkeypatch.setattr(settings, "platform_bilibili_enabled", True)

    with testing_session_local() as db:
        db.add(PublishLog(platform="bilibili", canonical_comment_id="bilibili:comment-bili-dup-1", comment_id="comment-bili-dup-1", reply_hash=reply_hash("comment-bili-dup-1", "reply text"), source="bilibili-open", status="published"))
        db.commit()

    def fail_if_called(*args, **kwargs):
        raise AssertionError("publish_platform_reply should not be called for duplicate payload")

    monkeypatch.setattr(gateway_api, "publish_platform_reply", fail_if_called)

    response = client.post(
        "/gateway/publish/bilibili",
        json={
            "comment_id": "comment-bili-dup-1",
            "reply_text": "reply text",
            "trace_id": "trace-bili-dup-1",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"ok", "published", "duplicate", "reason", "trace_id"}
    assert body["ok"] is True
    assert body["published"] is False
    assert body["duplicate"] is True
    assert body["reason"] == "idempotent_replay"
    assert body["trace_id"] == "trace-bili-dup-1"


def test_gateway_publish_douyin_route_uses_platform_source_fallback(gateway_test_client, monkeypatch):
    client, testing_session_local = gateway_test_client
    monkeypatch.setattr(settings, "platform_douyin_enabled", True)
    monkeypatch.setattr(settings, "platform_douyin_publish_source", "")

    def fake_publish_platform_reply(platform, comment_id, reply_text, force_publish=False, trace_id=None):
        _ = platform, comment_id, reply_text, force_publish, trace_id
        return True, "platform_publish_ok", datetime(2026, 3, 7, 2, 30, 0)

    monkeypatch.setattr(gateway_api, "publish_platform_reply", fake_publish_platform_reply)

    response = client.post(
        "/gateway/publish/douyin",
        json={
            "comment_id": "comment-douyin-1",
            "reply_text": "reply text",
            "trace_id": "trace-douyin-1",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["published"] is True

    with testing_session_local() as db:
        logs = db.query(PublishLog).filter(PublishLog.canonical_comment_id == "douyin:comment-douyin-1").all()
        assert len(logs) == 1
        assert logs[0].source == "douyin-bot"


def test_gateway_publish_kuaishou_route_uses_configured_platform_source(gateway_test_client, monkeypatch):
    client, testing_session_local = gateway_test_client
    monkeypatch.setattr(settings, "platform_kuaishou_enabled", True)
    monkeypatch.setattr(settings, "platform_kuaishou_publish_source", "kuaishou-open")

    def fake_publish_platform_reply(platform, comment_id, reply_text, force_publish=False, trace_id=None):
        _ = platform, comment_id, reply_text, force_publish, trace_id
        return True, "platform_publish_ok", datetime(2026, 3, 7, 2, 45, 0)

    monkeypatch.setattr(gateway_api, "publish_platform_reply", fake_publish_platform_reply)

    response = client.post(
        "/gateway/publish/kuaishou",
        json={
            "comment_id": "comment-kuaishou-1",
            "reply_text": "reply text",
            "trace_id": "trace-kuaishou-1",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["published"] is True

    with testing_session_local() as db:
        logs = db.query(PublishLog).filter(PublishLog.canonical_comment_id == "kuaishou:comment-kuaishou-1").all()
        assert len(logs) == 1
        assert logs[0].source == "kuaishou-open"


def test_gateway_publish_failure_returns_traceable_reason(gateway_test_client, monkeypatch):
    client, testing_session_local = gateway_test_client

    def fake_publish_gateway_reply(comment_id, reply_text, force_publish=False, source="bili-pet-bot", trace_id=None):
        _ = comment_id, reply_text, force_publish, source, trace_id
        return False, "real_publish_error:ReadTimeout", None

    monkeypatch.setattr(gateway_api, "publish_gateway_reply", fake_publish_gateway_reply)

    response = client.post(
        "/gateway/publish",
        json={"comment_id": "comment-5", "reply_text": "reply text", "source": "gateway", "trace_id": "trace-5"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is False
    assert body["published"] is False
    assert body["reason"] == "timeout"
    assert body["trace_id"] == "trace-5"

    with testing_session_local() as db:
        logs = db.query(PublishLog).filter(PublishLog.canonical_comment_id == "bilibili:comment-5").all()
        assert len(logs) == 1
        assert logs[0].status == "failed"
        assert logs[0].failure_reason == "timeout"


@pytest.mark.parametrize(
    ("publisher_reason", "expected_reason"),
    [
        ("upstream_status_502", "5xx"),
        ("invalid_signature", "auth"),
        ("", "invalid_response"),
    ],
)
def test_gateway_publish_failure_reason_is_standardized(
    gateway_test_client,
    monkeypatch,
    publisher_reason,
    expected_reason,
):
    client, _ = gateway_test_client

    def fake_publish_gateway_reply(comment_id, reply_text, force_publish=False, source="bili-pet-bot", trace_id=None):
        _ = comment_id, reply_text, force_publish, source, trace_id
        return False, publisher_reason, None

    monkeypatch.setattr(gateway_api, "publish_gateway_reply", fake_publish_gateway_reply)

    response = client.post(
        "/gateway/publish",
        json={"comment_id": "comment-failed-standard-1", "reply_text": "reply text"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is False
    assert body["published"] is False
    assert body["reason"] == expected_reason
