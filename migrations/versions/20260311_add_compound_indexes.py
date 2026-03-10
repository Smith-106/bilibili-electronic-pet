"""add compound indexes for list queries

Revision ID: 20260311_add_compound_indexes
Revises: 20260310_observability_events
Create Date: 2026-03-11 00:10:00
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260311_add_compound_indexes"
down_revision: Union[str, None] = "20260310_observability_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_reply_jobs_status_created_at_id",
        "reply_jobs",
        ["status", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_operation_audit_logs_action_ok_created_at_id",
        "operation_audit_logs",
        ["action", "ok", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_operation_audit_logs_target_id_created_at_id",
        "operation_audit_logs",
        ["target_id", "created_at", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_operation_audit_logs_target_id_created_at_id", table_name="operation_audit_logs")
    op.drop_index("ix_operation_audit_logs_action_ok_created_at_id", table_name="operation_audit_logs")
    op.drop_index("ix_reply_jobs_status_created_at_id", table_name="reply_jobs")
