from __future__ import annotations

import json

from app.services.queue_retry_orchestrator import (
    build_retry_batches,
    build_retry_round_summary,
    classify_failure_reason,
    collect_task_output_records,
    orchestrate_retry_round,
)


def test_classify_failure_reason_supports_three_failure_groups():
    assert classify_failure_reason("502 Bad Gateway from upstream host api.example.com") == "channel_failure"
    assert classify_failure_reason("Pre-existing uncommitted changes conflict with target files") == "conflict_blocked"
    assert classify_failure_reason("assertion failed: state transition mismatch") == "logic_failure"


def test_build_retry_batches_groups_failures_and_only_dispatches_executable_items():
    solutions = [
        {
            "item_id": "S-1",
            "status": "failed",
            "depends_on": [],
            "failure_reason": "502 Bad Gateway",
        },
        {
            "item_id": "S-2",
            "status": "failed",
            "depends_on": ["S-1"],
            "failure_reason": "AssertionError in retry pipeline",
        },
        {
            "item_id": "S-3",
            "status": "failed",
            "depends_on": [],
            "failure_reason": "workspace conflict detected in uncommitted files",
        },
        {
            "item_id": "S-0",
            "status": "completed",
            "depends_on": [],
        },
    ]

    plan = build_retry_batches(solutions)

    assert plan["classified_items"]["channel_failure"] == ["S-1"]
    assert plan["classified_items"]["logic_failure"] == ["S-2"]
    assert plan["classified_items"]["conflict_blocked"] == ["S-3"]

    assert plan["retry_batches"]["channel_failure"] == ["S-1"]
    assert plan["retry_batches"]["logic_failure"] == []
    assert plan["retry_batches"]["conflict_blocked"] == []
    assert plan["executable_items"] == ["S-1"]

    blocked_index = {item["item_id"]: item for item in plan["blocked"]}
    assert blocked_index["S-2"]["blocked_by"] == ["dependency_not_completed:S-1"]
    assert blocked_index["S-3"]["blocked_by"] == ["workspace_conflict"]


def test_collect_task_output_records_extracts_machine_readable_evidence(tmp_path):
    json_output = tmp_path / "S-1.output.json"
    txt_output = tmp_path / "S-2.output"
    json_output.write_text(
        json.dumps(
            {
                "status": "completed",
                "summary": "batch completed",
                "queue_id": "QUE-20260309195125",
                "solution_id": "SOL-ISS-20260309-013-1",
                "completed_count_delta": 1,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    txt_output.write_text(
        "status=failed\nerror_type=execution_failure\nmessage=workspace still blocked",
        encoding="utf-8",
    )

    solutions = [
        {
            "item_id": "S-1",
            "status": "completed",
            "result": {"output_path": str(json_output)},
        },
        {
            "item_id": "S-2",
            "status": "failed",
            "failure_reason": "workspace conflict",
            "failure_details": {"output_path": str(txt_output)},
        },
    ]

    records = collect_task_output_records(solutions)
    record_index = {record["item_id"]: record for record in records}

    assert record_index["S-1"]["output_exists"] is True
    assert record_index["S-1"]["key_fields"]["completed_count_delta"] == 1
    assert record_index["S-1"]["key_fields"]["queue_id"] == "QUE-20260309195125"
    assert record_index["S-2"]["output_exists"] is True
    assert record_index["S-2"]["key_fields"]["error_type"] == "execution_failure"
    assert record_index["S-2"]["failure_category"] == "conflict_blocked"


def test_build_retry_round_summary_reports_blocked_reason_when_no_increment():
    retry_plan = {
        "retry_batches": {
            "channel_failure": [],
            "logic_failure": [],
            "conflict_blocked": [],
        },
        "blocked": [
            {
                "item_id": "S-2",
                "category": "conflict_blocked",
                "blocked_by": ["workspace_conflict"],
            }
        ],
    }
    summary = build_retry_round_summary(
        previous_completed_count=3,
        current_completed_count=3,
        retry_plan=retry_plan,
        output_records=[],
    )

    assert summary["completed_count_delta"] == 0
    assert summary["progress_state"] == "blocked"
    assert summary["explanation"] == "no_completed_increment_with_blocked_reasons"
    assert summary["blocked"][0]["item_id"] == "S-2"


def test_orchestrate_retry_round_returns_progress_when_completed_count_increases(tmp_path):
    output_file = tmp_path / "S-1.output"
    output_file.write_text("status=completed\nsummary=ok", encoding="utf-8")
    solutions = [
        {
            "item_id": "S-1",
            "status": "failed",
            "depends_on": [],
            "failure_reason": "502 bad gateway",
            "result": {"output_path": str(output_file)},
        }
    ]

    result = orchestrate_retry_round(
        solutions,
        previous_completed_count=1,
        current_completed_count=2,
    )

    assert result["retry_plan"]["retry_batches"]["channel_failure"] == ["S-1"]
    assert result["round_summary"]["completed_count_delta"] == 1
    assert result["round_summary"]["progress_state"] == "progressed"
