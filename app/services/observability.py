from __future__ import annotations

from collections import deque
from collections.abc import Mapping
from datetime import datetime, timedelta, timezone
from threading import Lock
from uuid import uuid4


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


def get_observability_summary(window_minutes: int = 60) -> dict[str, object]:
    safe_minutes = max(1, int(window_minutes or 60))
    threshold = datetime.now(timezone.utc) - timedelta(minutes=safe_minutes)

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
        "window_minutes": safe_minutes,
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
