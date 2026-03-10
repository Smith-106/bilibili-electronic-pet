"""add observability events table

Revision ID: 20260310_observability_events
Revises: 20260307_role_cards
Create Date: 2026-03-10 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260310_observability_events"
down_revision: Union[str, None] = "20260307_role_cards"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "observability_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("trace_id", sa.String(length=64), nullable=False),
        sa.Column("comment_id", sa.String(length=64), nullable=True),
        sa.Column("job_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_observability_events_event_type", "observability_events", ["event_type"], unique=False)
    op.create_index("ix_observability_events_trace_id", "observability_events", ["trace_id"], unique=False)
    op.create_index("ix_observability_events_comment_id", "observability_events", ["comment_id"], unique=False)
    op.create_index("ix_observability_events_job_id", "observability_events", ["job_id"], unique=False)
    op.create_index("ix_observability_events_status", "observability_events", ["status"], unique=False)
    op.create_index("ix_observability_events_created_at", "observability_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_observability_events_created_at", table_name="observability_events")
    op.drop_index("ix_observability_events_status", table_name="observability_events")
    op.drop_index("ix_observability_events_job_id", table_name="observability_events")
    op.drop_index("ix_observability_events_comment_id", table_name="observability_events")
    op.drop_index("ix_observability_events_trace_id", table_name="observability_events")
    op.drop_index("ix_observability_events_event_type", table_name="observability_events")
    op.drop_table("observability_events")
