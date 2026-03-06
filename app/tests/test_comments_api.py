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


def test_poller_missing_fields_returns_clear_error(client_and_state):
    client, session_local, queued_payloads = client_and_state

    response = client.post(
        "/api/events/comment/poller",
        json={
            "id": "c-missing-1",
            "oid": "v-missing",
            "mid": "u-missing",
        },
    )

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "invalid_poller_payload" in detail
    assert "missing_fields=content" in detail
    assert not queued_payloads

    with session_local() as db:
        count = db.query(Comment).filter(Comment.comment_id == "c-missing-1").count()
        assert count == 0
