from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import comments as comments_api
from app.api.comments import router as comments_router
from app.db import Base, get_db
from app.models.entities import Comment
from app.services.collector import has_collector_source_mapper
from app.services.platforms import get_platform_config, get_platform_publish_source, get_supported_platforms
from app.settings import settings


@pytest.fixture
def client_and_state(monkeypatch) -> Generator[tuple[TestClient, sessionmaker, list[dict]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    app = FastAPI()
    app.include_router(comments_router)

    monkeypatch.setattr(settings, "api_key", "")

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    queued_payloads: list[dict] = []

    def fake_enqueue_comment_event(event):
        queued_payloads.append(event.model_dump())

    monkeypatch.setattr(comments_api, "enqueue_comment_event", fake_enqueue_comment_event)

    with TestClient(app) as client:
        yield client, testing_session_local, queued_payloads

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_webhook_ingest_creates_comment_and_enqueue_job(client_and_state):
    client, session_local, queued_payloads = client_and_state

    response = client.post(
        "/api/events/comment",
        json={
            "comment_id": "c-webhook-1",
            "video_id": "v-1",
            "user_id": "u-1",
            "content": "hello webhook",
            "parent_id": None,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["queued"] is True
    assert payload["comment_id"] == "c-webhook-1"
    assert isinstance(payload["trace_id"], str) and payload["trace_id"]
    assert len(queued_payloads) == 1
    assert queued_payloads[0]["comment_id"] == "c-webhook-1"
    assert queued_payloads[0]["trace_id"] == payload["trace_id"]

    with session_local() as db:
        record = db.query(Comment).filter(Comment.comment_id == "c-webhook-1").first()
        assert record is not None
        assert record.video_id == "v-1"


def test_poller_ingest_creates_comment_and_enqueue_job(client_and_state):
    client, session_local, queued_payloads = client_and_state

    response = client.post(
        "/api/events/comment/poller",
        json={
            "id": "c-poller-1",
            "oid": "v-2",
            "mid": 9527,
            "message": "hello poller",
            "root": "p-2",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["queued"] is True
    assert payload["comment_id"] == "c-poller-1"
    assert isinstance(payload["trace_id"], str) and payload["trace_id"]
    assert len(queued_payloads) == 1
    assert queued_payloads[0]["comment_id"] == "c-poller-1"
    assert queued_payloads[0]["user_id"] == "9527"
    assert queued_payloads[0]["trace_id"] == payload["trace_id"]

    with session_local() as db:
        record = db.query(Comment).filter(Comment.comment_id == "c-poller-1").first()
        assert record is not None
        assert record.parent_id == "p-2"


def test_duplicate_comment_id_is_ignored_across_sources(client_and_state):
    client, session_local, queued_payloads = client_and_state

    first = client.post(
        "/api/events/comment",
        json={
            "comment_id": "c-dup-1",
            "video_id": "v-dup",
            "user_id": "u-dup",
            "content": "first",
        },
    )
    second = client.post(
        "/api/events/comment/poller",
        json={
            "id": "c-dup-1",
            "oid": "v-dup",
            "mid": "u-dup",
            "message": "second",
        },
    )

    assert first.status_code == 200
    assert second.status_code == 200
    second_payload = second.json()
    assert second_payload["ok"] is True
    assert second_payload["message"] == "duplicate_ignored"
    assert second_payload["comment_id"] == "c-dup-1"
    assert isinstance(second_payload["trace_id"], str) and second_payload["trace_id"]
    assert len(queued_payloads) == 1

    with session_local() as db:
        count = db.query(Comment).filter(Comment.comment_id == "c-dup-1").count()
        assert count == 1


def test_douyin_ingest_returns_platform_disabled_when_switch_off(client_and_state, monkeypatch):
    client, session_local, queued_payloads = client_and_state
    _ = session_local
    monkeypatch.setattr(comments_api.settings, "platform_douyin_enabled", False)

    response = client.post(
        "/api/events/comment/douyin",
        json={
            "item_id": "c-douyin-disabled-1",
            "aweme_id": "v-douyin-disabled-1",
            "sec_uid": "u-douyin-disabled-1",
            "text": "hello douyin",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "platform_disabled: douyin"
    assert not queued_payloads


def test_kuaishou_ingest_returns_platform_disabled_when_switch_off(client_and_state, monkeypatch):
    client, session_local, queued_payloads = client_and_state
    _ = session_local
    monkeypatch.setattr(comments_api.settings, "platform_kuaishou_enabled", False)

    response = client.post(
        "/api/events/comment/kuaishou",
        json={
            "comment_id_str": "c-kuaishou-disabled-1",
            "photo_id": "v-kuaishou-disabled-1",
            "author_id": "u-kuaishou-disabled-1",
            "message": "hello kuaishou",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "platform_disabled: kuaishou"
    assert not queued_payloads


def test_bilibili_ingest_returns_platform_disabled_when_switch_off(client_and_state, monkeypatch):
    client, session_local, queued_payloads = client_and_state
    _ = session_local
    monkeypatch.setattr(comments_api.settings, "platform_bilibili_enabled", False)

    response = client.post(
        "/api/events/comment/bilibili",
        json={
            "rpid": "c-bilibili-disabled-1",
            "aid": "v-bilibili-disabled-1",
            "mid": "u-bilibili-disabled-1",
            "message": "hello bilibili",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "platform_disabled: bilibili"
    assert not queued_payloads


def test_platform_config_mapping_remains_consistent(monkeypatch):
    for platform in get_supported_platforms():
        config = get_platform_config(platform)
        assert config["collector_source"] == platform
        assert has_collector_source_mapper(config["collector_source"]) is True

        expected_publish_source = f"{platform}-publish-source"
        monkeypatch.setattr(comments_api.settings, config["source_attr"], expected_publish_source)
        assert get_platform_publish_source(platform) == expected_publish_source

        monkeypatch.setattr(comments_api.settings, config["enabled_attr"], False)
        assert comments_api.is_platform_enabled(platform) is False
        monkeypatch.setattr(comments_api.settings, config["enabled_attr"], True)
        assert comments_api.is_platform_enabled(platform) is True


def test_bilibili_ingest_uses_platform_route_mapping(client_and_state, monkeypatch):
    client, session_local, queued_payloads = client_and_state
    monkeypatch.setattr(comments_api.settings, "platform_bilibili_enabled", True)

    response = client.post(
        "/api/events/comment/bilibili",
        json={
            "rpid": "c-bili-route-1",
            "aid": "v-bili-route-1",
            "mid": 12345,
            "message": "hello bilibili route",
            "root": "p-bili-route-1",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["queued"] is True
    assert payload["comment_id"] == "c-bili-route-1"
    assert len(queued_payloads) == 1
    assert queued_payloads[0]["user_id"] == "12345"

    with session_local() as db:
        record = db.query(Comment).filter(Comment.comment_id == "c-bili-route-1").first()
        assert record is not None
        assert record.video_id == "v-bili-route-1"


def test_platform_ingest_routes_through_unified_collector_selector(client_and_state, monkeypatch):
    client, session_local, queued_payloads = client_and_state
    _ = session_local
    monkeypatch.setattr(comments_api.settings, "platform_bilibili_enabled", True)
    monkeypatch.setattr(comments_api.settings, "platform_douyin_enabled", True)
    monkeypatch.setattr(comments_api.settings, "platform_kuaishou_enabled", True)

    calls: list[tuple[str, dict]] = []
    original = comments_api.collect_platform_event_via_config

    def fake_collect_platform_event_via_config(raw_payload: dict, platform: str):
        calls.append((platform, raw_payload))
        return original(raw_payload, platform)

    monkeypatch.setattr(comments_api, "collect_platform_event_via_config", fake_collect_platform_event_via_config)

    bilibili_response = client.post(
        "/api/events/comment/bilibili",
        json={
            "rpid": "c-bili-selector-1",
            "aid": "v-bili-selector-1",
            "mid": 67890,
            "message": "hello selector",
        },
    )
    douyin_response = client.post(
        "/api/events/comment/douyin",
        json={
            "item_id": "c-douyin-selector-1",
            "aweme_id": "v-douyin-selector-1",
            "sec_uid": "u-douyin-selector-1",
            "text": "hello douyin selector",
        },
    )
    kuaishou_response = client.post(
        "/api/events/comment/kuaishou",
        json={
            "comment_id_str": "c-kuaishou-selector-1",
            "photo_id": "v-kuaishou-selector-1",
            "author_id": "u-kuaishou-selector-1",
            "message": "hello kuaishou selector",
        },
    )

    assert bilibili_response.status_code == 200
    assert douyin_response.status_code == 200
    assert kuaishou_response.status_code == 200
    assert bilibili_response.json()["ok"] is True
    assert douyin_response.json()["ok"] is True
    assert kuaishou_response.json()["ok"] is True
    assert bilibili_response.json()["comment_id"] == "c-bili-selector-1"
    assert douyin_response.json()["comment_id"] == "c-douyin-selector-1"
    assert kuaishou_response.json()["comment_id"] == "c-kuaishou-selector-1"
    assert len(calls) == 3
    assert calls[0][0] == "bilibili"
    assert calls[1][0] == "douyin"
    assert calls[2][0] == "kuaishou"
    assert calls[0][1]["rpid"] == "c-bili-selector-1"
    assert calls[1][1]["item_id"] == "c-douyin-selector-1"
    assert calls[2][1]["comment_id_str"] == "c-kuaishou-selector-1"
    assert len(queued_payloads) == 3


def test_kuaishou_ingest_uses_platform_route_mapping(client_and_state, monkeypatch):
    client, session_local, queued_payloads = client_and_state
    monkeypatch.setattr(comments_api.settings, "platform_kuaishou_enabled", True)

    response = client.post(
        "/api/events/comment/kuaishou",
        json={
            "comment_id_str": "c-ks-route-1",
            "photo_id": "v-ks-route-1",
            "author_id": "u-ks-route-1",
            "message": "hello kuaishou route",
            "root_comment_id": "p-ks-route-1",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["queued"] is True
    assert payload["comment_id"] == "c-ks-route-1"
    assert len(queued_payloads) == 1
    assert queued_payloads[0]["video_id"] == "v-ks-route-1"

    with session_local() as db:
        record = db.query(Comment).filter(Comment.comment_id == "c-ks-route-1").first()
        assert record is not None
        assert record.parent_id == "p-ks-route-1"
