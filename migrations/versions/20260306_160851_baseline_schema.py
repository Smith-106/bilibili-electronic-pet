"""baseline schema

Revision ID: 20260306_160851
Revises:
Create Date: 2026-03-06 16:08:51
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260306_160851"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("comment_id", sa.String(length=64), nullable=False),
        sa.Column("video_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("parent_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id", name="uq_comments_comment_id"),
    )
    op.create_table(
        "reply_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("comment_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("length_mode", sa.String(length=16), nullable=False),
        sa.Column("style_mode", sa.String(length=32), nullable=False),
        sa.Column("reply_text", sa.Text(), nullable=True),
        sa.Column("risk_flags", sa.JSON(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reply_jobs_comment_id", "reply_jobs", ["comment_id"], unique=False)
    op.create_table(
        "user_state",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("recent_phrases", sa.JSON(), nullable=False),
        sa.Column("cooldown_enabled", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "publish_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("comment_id", sa.String(length=64), nullable=False),
        sa.Column("reply_hash", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id", "reply_hash", name="uq_publish_logs_comment_reply"),
    )
    op.create_index("ix_publish_logs_comment_id", "publish_logs", ["comment_id"], unique=False)
    op.create_table(
        "operation_audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("ok", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operation_audit_logs_action", "operation_audit_logs", ["action"], unique=False)
    op.create_index("ix_operation_audit_logs_target_id", "operation_audit_logs", ["target_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_operation_audit_logs_target_id", table_name="operation_audit_logs")
    op.drop_index("ix_operation_audit_logs_action", table_name="operation_audit_logs")
    op.drop_table("operation_audit_logs")
    op.drop_index("ix_publish_logs_comment_id", table_name="publish_logs")
    op.drop_table("publish_logs")
    op.drop_table("user_state")
    op.drop_index("ix_reply_jobs_comment_id", table_name="reply_jobs")
    op.drop_table("reply_jobs")
    op.drop_table("comments")
