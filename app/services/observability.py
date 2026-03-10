from __future__ import annotations

from collections import deque
from collections.abc import Mapping
from datetime import datetime, timedelta, timezone
from threading import Lock
from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from app.db import SessionLocal
from app.models.entities import ObservabilityEvent


KNOWN_JOB_STATUSES = (
    "queued",
    "published",
    "manual_queue",
    "blocked",
    "dedupe_skipped",
    "skipped",
)

_MAX_EVENTS = 2000
_OBSERVABILITY_EVENTS: deque[dict[str, object]] = deque(maxlen=_MAX_EVENTS)
_OBSERVABILITY_LOCK = Lock()


def ensure_trace_id(trace_id: str | None = None) -> str:
    value = (trace_id or "").strip()
    if value:
        return value
    return uuid4().hex


def build_log_context(
    *,
    trace_id: str,
    comment_id: str | None = None,
    job_id: int | None = None,
    status: str | None = None,
    **extra: object,
) -> dict[str, object]:
    payload: dict[str, object | None] = {
        "trace_id": trace_id,
        "comment_id": comment_id,
        "job_id": job_id,
        "status": status,
    }
    payload.update(extra)
    return {key: value for key, value in payload.items() if value is not None}


def normalize_status_counts(raw: Mapping[str, int]) -> dict[str, int]:
    normalized = {status: int(raw.get(status, 0) or 0) for status in KNOWN_JOB_STATUSES}
    for status, count in raw.items():
        if status not in normalized:
            normalized[status] = int(count or 0)
    return normalized


def reset_observability_events() -> None:
    with _OBSERVABILITY_LOCK:
        _OBSERVABILITY_EVENTS.clear()


def record_observability_event(
    event_type: str,
    *,
    trace_id: str,
    comment_id: str | None = None,
    job_id: int | None = None,
    status: str | None = None,
    duration_ms: int | None = None,
    metadata: Mapping[str, object] | None = None,
    created_at: datetime | None = None,
) -> None:
    event = {
        "event_type": str(event_type).strip(),
        "trace_id": trace_id,
        "comment_id": comment_id,
        "job_id": job_id,
        "status": status,
        "duration_ms": int(duration_ms) if duration_ms is not None else None,
        "metadata": dict(metadata or {}),
        "created_at": created_at or datetime.now(timezone.utc),
    }
    if not event["event_type"]:
        return

    with _OBSERVABILITY_LOCK:
        _OBSERVABILITY_EVENTS.append(event)
    _persist_event_to_db(event)


def get_observability_summary(window_minutes: int = 60) -> dict[str, object]:
    safe_minutes = max(1, int(window_minutes or 60))
    threshold = datetime.now(timezone.utc) - timedelta(minutes=safe_minutes)
    summary = _get_observability_summary_from_db(window_minutes=safe_minutes, threshold=threshold)
    if summary is not None:
        return summary

    return _get_observability_summary_from_memory(window_minutes=safe_minutes, threshold=threshold)


def _persist_event_to_db(event: Mapping[str, object]) -> None:
    try:
        with SessionLocal() as db:
            db.add(
                ObservabilityEvent(
                    event_type=str(event["event_type"]),
                    trace_id=str(event["trace_id"]),
                    comment_id=str(event["comment_id"]) if event.get("comment_id") is not None else None,
                    job_id=int(event["job_id"]) if event.get("job_id") is not None else None,
                    status=str(event["status"]) if event.get("status") is not None else None,
                    duration_ms=int(event["duration_ms"]) if event.get("duration_ms") is not None else None,
                    event_metadata=dict(event.get("metadata") or {}),
                    created_at=event["created_at"] if isinstance(event.get("created_at"), datetime) else datetime.now(timezone.utc),
                )
            )
            db.commit()
    except SQLAlchemyError:
        return


def _get_observability_summary_from_db(*, window_minutes: int, threshold: datetime) -> dict[str, object] | None:
    try:
        with SessionLocal() as db:
            scoped_events_query = db.query(ObservabilityEvent).filter(ObservabilityEvent.created_at >= threshold)
            total_events = scoped_events_query.count()

            by_event_type_rows = (
                db.query(ObservabilityEvent.event_type, func.count(ObservabilityEvent.id))
                .filter(ObservabilityEvent.created_at >= threshold)
                .group_by(ObservabilityEvent.event_type)
                .order_by(ObservabilityEvent.event_type.asc())
                .all()
            )
            by_event_type = {str(event_type): int(count) for event_type, count in by_event_type_rows}

            job_finished_query = (
                db.query(ObservabilityEvent)
                .filter(
                    ObservabilityEvent.created_at >= threshold,
                    ObservabilityEvent.event_type == "job_finished",
                )
            )
            job_total = job_finished_query.count()
            manual_queue_count = job_finished_query.filter(ObservabilityEvent.status == "manual_queue").count()

            latency_rows = (
                db.query(ObservabilityEvent.duration_ms)
                .filter(
                    ObservabilityEvent.created_at >= threshold,
                    ObservabilityEvent.event_type == "job_finished",
                    ObservabilityEvent.duration_ms.is_not(None),
                    ObservabilityEvent.duration_ms >= 0,
                )
                .all()
            )
            latencies = [int(duration_ms) for (duration_ms,) in latency_rows if duration_ms is not None]
            avg_latency_ms = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

            publish_result_query = (
                db.query(ObservabilityEvent)
                .filter(
                    ObservabilityEvent.created_at >= threshold,
                    ObservabilityEvent.event_type == "publish_result",
                )
            )
            publish_total = publish_result_query.count()
            publish_success = publish_result_query.filter(ObservabilityEvent.status == "published").count()
    except SQLAlchemyError:
        return None

    return {
        "window_minutes": window_minutes,
        "totals": {
            "events": total_events,
            "jobs": job_total,
            "publish_results": publish_total,
        },
        "by_event_type": by_event_type,
        "rates": {
            "manual_queue_ratio": round(manual_queue_count / job_total, 4) if job_total else 0.0,
            "publish_success_rate": round(publish_success / publish_total, 4) if publish_total else 0.0,
        },
        "latency": {
            "avg_job_duration_ms": avg_latency_ms,
            "samples": len(latencies),
        },
    }


def _get_observability_summary_from_memory(*, window_minutes: int, threshold: datetime) -> dict[str, object]:
    with _OBSERVABILITY_LOCK:
        scoped_events = [event for event in _OBSERVABILITY_EVENTS if event["created_at"] >= threshold]

    total_events = len(scoped_events)
    by_event_type: dict[str, int] = {}
    for event in scoped_events:
        key = str(event.get("event_type") or "unknown")
        by_event_type[key] = by_event_type.get(key, 0) + 1

    job_finished_events = [event for event in scoped_events if event.get("event_type") == "job_finished"]
    job_total = len(job_finished_events)
    manual_queue_count = sum(1 for event in job_finished_events if event.get("status") == "manual_queue")

    latencies = [
        int(event["duration_ms"])
        for event in job_finished_events
        if isinstance(event.get("duration_ms"), int) and int(event["duration_ms"]) >= 0
    ]
    avg_latency_ms = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

    publish_result_events = [event for event in scoped_events if event.get("event_type") == "publish_result"]
    publish_total = len(publish_result_events)
    publish_success = sum(1 for event in publish_result_events if event.get("status") == "published")

    return {
        "window_minutes": window_minutes,
        "totals": {
            "events": total_events,
            "jobs": job_total,
            "publish_results": publish_total,
        },
        "by_event_type": dict(sorted(by_event_type.items())),
        "rates": {
            "manual_queue_ratio": round(manual_queue_count / job_total, 4) if job_total else 0.0,
            "publish_success_rate": round(publish_success / publish_total, 4) if publish_total else 0.0,
        },
        "latency": {
            "avg_job_duration_ms": avg_latency_ms,
            "samples": len(latencies),
        },
    }
