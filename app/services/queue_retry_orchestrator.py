from __future__ import annotations

import json
import re
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Literal


FailureCategory = Literal["channel_failure", "conflict_blocked", "logic_failure"]

_DISPATCH_ORDER: tuple[FailureCategory, ...] = (
    "channel_failure",
    "logic_failure",
    "conflict_blocked",
)

_CHANNEL_FAILURE_KEYWORDS = (
    "502",
    "503",
    "504",
    "bad gateway",
    "gateway timeout",
    "service unavailable",
    "connection reset",
    "connection refused",
    "econn",
    "etimedout",
    "timeout",
    "upstream",
    "host",
    "channel",
)

_CONFLICT_BLOCKED_KEYWORDS = (
    "conflict",
    "uncommitted",
    "overlap",
    "working tree",
    "workspace",
    "blocked",
    "lock",
)

_DEFAULT_COMPLETED_STATUSES = {"completed"}

_TEXT_FIELD_PATTERNS = {
    "status": re.compile(r"status\s*[:=]\s*([^\n\r]+)", re.IGNORECASE),
    "error_type": re.compile(r"error_type\s*[:=]\s*([^\n\r]+)", re.IGNORECASE),
    "message": re.compile(r"message\s*[:=]\s*([^\n\r]+)", re.IGNORECASE),
    "summary": re.compile(r"summary\s*[:=]\s*([^\n\r]+)", re.IGNORECASE),
}


def _to_lower_text(value: object) -> str:
    return str(value or "").strip().lower()


def _as_string_list(value: object) -> list[str]:
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def classify_failure_reason(
    failure_reason: str | None,
    *,
    failure_details: Mapping[str, object] | None = None,
) -> FailureCategory:
    text_parts = [_to_lower_text(failure_reason)]
    if failure_details:
        for key in ("message", "error_type", "status", "code", "host", "detail"):
            value = failure_details.get(key)
            if value is not None:
                text_parts.append(_to_lower_text(value))
    merged_text = " ".join(part for part in text_parts if part)

    if any(keyword in merged_text for keyword in _CONFLICT_BLOCKED_KEYWORDS):
        return "conflict_blocked"
    if any(keyword in merged_text for keyword in _CHANNEL_FAILURE_KEYWORDS):
        return "channel_failure"
    return "logic_failure"


def classify_solution_failure(solution: Mapping[str, object]) -> FailureCategory:
    failure_details_raw = solution.get("failure_details")
    failure_details = failure_details_raw if isinstance(failure_details_raw, Mapping) else None
    failure_reason = solution.get("failure_reason")
    return classify_failure_reason(
        None if failure_reason is None else str(failure_reason),
        failure_details=failure_details,
    )


def _is_completed_status(status: str, completed_statuses: set[str]) -> bool:
    return status in completed_statuses


def _resolve_item_id(solution: Mapping[str, object]) -> str | None:
    value = solution.get("item_id")
    if value is None:
        return None
    item_id = str(value).strip()
    return item_id or None


def build_retry_batches(
    solutions: Sequence[Mapping[str, object]],
    *,
    completed_statuses: Sequence[str] = ("completed",),
) -> dict[str, object]:
    completed_status_set = {
        _to_lower_text(status) for status in completed_statuses if _to_lower_text(status)
    } or _DEFAULT_COMPLETED_STATUSES

    statuses_by_item: dict[str, str] = {}
    dependencies_by_item: dict[str, list[str]] = {}
    classified_items: dict[FailureCategory, list[str]] = {
        "channel_failure": [],
        "conflict_blocked": [],
        "logic_failure": [],
    }

    for solution in solutions:
        item_id = _resolve_item_id(solution)
        if item_id is None:
            continue
        statuses_by_item[item_id] = _to_lower_text(solution.get("status"))
        dependencies_by_item[item_id] = _as_string_list(solution.get("depends_on"))

    for solution in solutions:
        item_id = _resolve_item_id(solution)
        if item_id is None:
            continue
        if statuses_by_item.get(item_id) != "failed":
            continue
        category = classify_solution_failure(solution)
        classified_items[category].append(item_id)

    retry_batches: dict[FailureCategory, list[str]] = {
        "channel_failure": [],
        "conflict_blocked": [],
        "logic_failure": [],
    }
    blocked: list[dict[str, object]] = []

    for category in _DISPATCH_ORDER:
        for item_id in classified_items[category]:
            block_reasons: list[str] = []
            if category == "conflict_blocked":
                block_reasons.append("workspace_conflict")

            for dependency in dependencies_by_item.get(item_id, []):
                dependency_status = statuses_by_item.get(dependency)
                if dependency_status is None:
                    block_reasons.append(f"dependency_missing:{dependency}")
                    continue
                if not _is_completed_status(dependency_status, completed_status_set):
                    block_reasons.append(f"dependency_not_completed:{dependency}")

            if block_reasons:
                blocked.append(
                    {
                        "item_id": item_id,
                        "category": category,
                        "blocked_by": sorted(set(block_reasons)),
                    }
                )
                continue

            retry_batches[category].append(item_id)

    executable_items = [
        item_id for category in _DISPATCH_ORDER for item_id in retry_batches[category]
    ]

    return {
        "dispatch_order": list(_DISPATCH_ORDER),
        "classified_items": classified_items,
        "retry_batches": retry_batches,
        "blocked": blocked,
        "executable_items": executable_items,
        "stats": {
            "failed_total": sum(len(items) for items in classified_items.values()),
            "executable_total": len(executable_items),
            "blocked_total": len(blocked),
        },
    }


def _extract_output_path(solution: Mapping[str, object]) -> str | None:
    candidates: list[object] = [solution.get("output_path"), solution.get("task_output_path")]

    for section_key in ("result", "failure_details"):
        section_value = solution.get(section_key)
        if isinstance(section_value, Mapping):
            candidates.extend(
                [
                    section_value.get("output_path"),
                    section_value.get("task_output_path"),
                    section_value.get("output_file"),
                    section_value.get("evidence_path"),
                ]
            )

    for candidate in candidates:
        if candidate is None:
            continue
        path_value = str(candidate).strip()
        if path_value:
            return path_value
    return None


def _extract_key_fields_from_text(output_text: str) -> dict[str, object]:
    fields: dict[str, object] = {}
    for key, pattern in _TEXT_FIELD_PATTERNS.items():
        match = pattern.search(output_text)
        if not match:
            continue
        fields[key] = match.group(1).strip()
    return fields


def _extract_key_fields_from_json(parsed_json: Mapping[str, object]) -> dict[str, object]:
    selected_fields: dict[str, object] = {}
    for key in (
        "status",
        "summary",
        "error_type",
        "message",
        "queue_id",
        "solution_id",
        "completed_count",
        "completed_count_delta",
    ):
        value = parsed_json.get(key)
        if value is not None:
            selected_fields[key] = value
    return selected_fields


def collect_task_output_records(
    solutions: Sequence[Mapping[str, object]],
    *,
    preview_chars: int = 240,
) -> list[dict[str, object]]:
    safe_preview_chars = max(32, int(preview_chars or 240))
    records: list[dict[str, object]] = []

    for solution in solutions:
        item_id = _resolve_item_id(solution) or "unknown"
        output_path = _extract_output_path(solution)
        status = _to_lower_text(solution.get("status")) or "unknown"
        record: dict[str, object] = {
            "item_id": item_id,
            "status": status,
            "output_path": output_path,
            "output_exists": False,
            "key_fields": {},
        }

        if output_path:
            file_path = Path(output_path)
            if file_path.exists() and file_path.is_file():
                output_text = file_path.read_text(encoding="utf-8", errors="ignore")
                key_fields: dict[str, object] = {}
                if file_path.suffix.lower() == ".json":
                    try:
                        parsed_json = json.loads(output_text)
                    except json.JSONDecodeError:
                        parsed_json = None
                    if isinstance(parsed_json, Mapping):
                        key_fields = _extract_key_fields_from_json(parsed_json)
                if not key_fields:
                    key_fields = _extract_key_fields_from_text(output_text)

                record["output_exists"] = True
                record["preview"] = output_text[:safe_preview_chars]
                record["key_fields"] = key_fields

        if status == "failed":
            record["failure_category"] = classify_solution_failure(solution)
        records.append(record)

    return records


def build_retry_round_summary(
    *,
    previous_completed_count: int,
    current_completed_count: int,
    retry_plan: Mapping[str, object],
    output_records: Sequence[Mapping[str, object]],
) -> dict[str, object]:
    previous = int(previous_completed_count)
    current = int(current_completed_count)
    completed_count_delta = current - previous
    blocked = list(retry_plan.get("blocked", [])) if isinstance(retry_plan.get("blocked"), Sequence) else []
    progress_state = "progressed" if completed_count_delta > 0 else ("blocked" if blocked else "stalled")

    summary: dict[str, object] = {
        "completed_count_before": previous,
        "completed_count_after": current,
        "completed_count_delta": completed_count_delta,
        "progress_state": progress_state,
        "retry_batches": dict(retry_plan.get("retry_batches", {}))
        if isinstance(retry_plan.get("retry_batches"), Mapping)
        else {},
        "blocked": blocked,
        "evidence_records": [dict(record) for record in output_records],
    }

    if completed_count_delta <= 0:
        summary["explanation"] = (
            "no_completed_increment_with_blocked_reasons"
            if blocked
            else "no_completed_increment_detected"
        )

    return summary


def orchestrate_retry_round(
    solutions: Sequence[Mapping[str, object]],
    *,
    previous_completed_count: int,
    current_completed_count: int,
) -> dict[str, object]:
    retry_plan = build_retry_batches(solutions)
    output_records = collect_task_output_records(solutions)
    return {
        "retry_plan": retry_plan,
        "round_summary": build_retry_round_summary(
            previous_completed_count=previous_completed_count,
            current_completed_count=current_completed_count,
            retry_plan=retry_plan,
            output_records=output_records,
        ),
    }
