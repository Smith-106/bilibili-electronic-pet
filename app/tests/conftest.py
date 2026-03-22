from collections.abc import Callable, Generator
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.db as db_module
import app.main as main_module
import app.models.entities
import app.workers.jobs as jobs_module
from app.api import comments as comments_api
from app.db import Base, get_db
from app.models.entities import Comment, ReplyJob
from app.settings import settings


@pytest.fixture(autouse=True)
def reset_settings() -> Generator[None, None, None]:
    snapshot = settings.model_dump()
    settings.bilibili_cookie_encryption_key = "test-key-32-bytes-long-enough"
    yield
    for key, value in snapshot.items():
        setattr(settings, key, value)


@pytest.fixture()
def session_factory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Generator[sessionmaker[Session], None, None]:
    database_path = tmp_path / "test.sqlite3"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(db_module, "engine", engine)
    monkeypatch.setattr(db_module, "SessionLocal", testing_session_local)
    monkeypatch.setattr(jobs_module, "SessionLocal", testing_session_local)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    main_module.app.dependency_overrides[get_db] = override_get_db

    try:
        yield testing_session_local
    finally:
        main_module.app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(
    session_factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[TestClient, None, None]:
    _ = session_factory
    monkeypatch.setattr(settings, "api_key", "")
    with TestClient(main_module.app) as api_client:
        yield api_client


@pytest.fixture()
def db_session(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def task_delay_spy(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    calls: list[dict] = []

    def fake_delay(payload: dict) -> dict:
        calls.append(payload)
        return {"task_id": "fake-task-id"}

    monkeypatch.setattr(comments_api.process_comment_event_task, "delay", fake_delay)
    return calls


@pytest.fixture()
def make_comment(db_session: Session) -> Callable[..., Comment]:
    def factory(
        *,
        comment_id: str = "comment-1",
        video_id: str = "video-1",
        user_id: str = "user-1",
        content: str = "这是一条评论",
        parent_id: str | None = None,
        platform: str = "bilibili",
    ) -> Comment:
        item = Comment(
            platform=platform,
            canonical_comment_id=f"{platform}:{comment_id}",
            comment_id=comment_id,
            video_id=video_id,
            user_id=user_id,
            content=content,
            parent_id=parent_id,
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        return item

    return factory


@pytest.fixture()
def make_job(db_session: Session) -> Callable[..., ReplyJob]:
    def factory(
        *,
        comment_id: str = "comment-1",
        status: str = "manual_queue",
        length_mode: str = "medium",
        style_mode: str = "normal",
        reply_text: str | None = "默认回复",
        risk_flags: dict | None = None,
        attempts: int = 0,
        created_at: datetime | None = None,
    ) -> ReplyJob:
        item = ReplyJob(
            comment_id=comment_id,
            canonical_comment_id=f"bilibili:{comment_id}",
            status=status,
            length_mode=length_mode,
            style_mode=style_mode,
            reply_text=reply_text,
            risk_flags=risk_flags or {},
            attempts=attempts,
        )
        if created_at is not None:
            item.created_at = created_at

        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        return item

    return factory
