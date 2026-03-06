from __future__ import annotations

from collections.abc import Mapping
from uuid import uuid4


KNOWN_JOB_STATUSES = (
    "queued",
    "published",
    "manual_queue",
    "blocked",
    "dedupe_skipped",
    "skipped",
)


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
