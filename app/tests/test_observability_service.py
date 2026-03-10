from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.services import observability


def _build_session_factory():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return engine, session_local


def test_observability_summary_prefers_db_when_memory_is_empty(monkeypatch):
    engine, session_local = _build_session_factory()
    monkeypatch.setattr(observability, "SessionLocal", session_local)
    observability.reset_observability_events()

    created_at = datetime.now(timezone.utc)
    observability.record_observability_event(
        "job_finished",
        trace_id="trace-db-preferred",
        comment_id="comment-1",
        status="published",
        duration_ms=35,
        created_at=created_at,
    )
    observability.record_observability_event(
        "publish_result",
        trace_id="trace-db-preferred",
        comment_id="comment-1",
        status="published",
        created_at=created_at,
    )

    observability.reset_observability_events()
    summary = observability.get_observability_summary(window_minutes=60)

    assert summary["totals"]["events"] == 2
    assert summary["by_event_type"]["job_finished"] == 1
    assert summary["by_event_type"]["publish_result"] == 1
    assert summary["rates"]["publish_success_rate"] == 1.0
    assert summary["latency"]["samples"] == 1
    engine.dispose()


def test_observability_summary_falls_back_to_memory_when_db_fails(monkeypatch):
    observability.reset_observability_events()

    class BrokenSession:
        def __enter__(self):
            raise SQLAlchemyError("db unavailable")

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(observability, "SessionLocal", lambda: BrokenSession())

    observability.record_observability_event(
        "job_finished",
        trace_id="trace-memory-fallback",
        comment_id="comment-fallback",
        status="manual_queue",
        duration_ms=12,
        created_at=datetime.now(timezone.utc),
    )

    summary = observability.get_observability_summary(window_minutes=60)

    assert summary["totals"]["events"] == 1
    assert summary["totals"]["jobs"] == 1
    assert summary["rates"]["manual_queue_ratio"] == 1.0
    assert summary["latency"]["avg_job_duration_ms"] == 12.0
