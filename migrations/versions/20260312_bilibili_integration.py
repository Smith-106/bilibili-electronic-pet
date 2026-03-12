"""add bilibili integration tables

Revision ID: 20260312_bilibili_integration
Revises: 20260311_add_compound_indexes
Create Date: 2026-03-12 12:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260312_bilibili_integration"
down_revision: Union[str, None] = "20260311_add_compound_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # BilibiliCredential table
    op.create_table(
        "bilibili_credentials",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("sessdata", sa.Text(), nullable=False),
        sa.Column("bili_jct", sa.String(length=128), nullable=False),
        sa.Column("buvid3", sa.String(length=128), nullable=False),
        sa.Column("buvid4", sa.String(length=128), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bilibili_credentials_is_active", "bilibili_credentials", ["is_active"], unique=False)
    op.create_index("ix_bilibili_credentials_updated_at", "bilibili_credentials", ["updated_at"], unique=False)

    # BilibiliVideo table
    op.create_table(
        "bilibili_videos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("bvid", sa.String(length=20), nullable=False),
        sa.Column("aid", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=256), nullable=True),
        sa.Column("owner_mid", sa.Integer(), nullable=True),
        sa.Column("poll_enabled", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("last_polled_at", sa.DateTime(), nullable=True),
        sa.Column("last_rpid", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bvid", name="uq_bilibili_videos_bvid"),
    )
    op.create_index("ix_bilibili_videos_poll_enabled", "bilibili_videos", ["poll_enabled"], unique=False)
    op.create_index("ix_bilibili_videos_last_polled_at", "bilibili_videos", ["last_polled_at"], unique=False)
    op.create_index("ix_bilibili_videos_updated_at", "bilibili_videos", ["updated_at"], unique=False)
    # Composite index for efficient polling queries
    op.create_index(
        "ix_bilibili_videos_poll_enabled_last_polled",
        "bilibili_videos",
        ["poll_enabled", "last_polled_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_bilibili_videos_poll_enabled_last_polled", table_name="bilibili_videos")
    op.drop_index("ix_bilibili_videos_last_polled_at", table_name="bilibili_videos")
    op.drop_index("ix_bilibili_videos_poll_enabled", table_name="bilibili_videos")
    op.drop_index("ix_bilibili_videos_updated_at", table_name="bilibili_videos")
    op.drop_table("bilibili_videos")

    op.drop_index("ix_bilibili_credentials_updated_at", table_name="bilibili_credentials")
    op.drop_index("ix_bilibili_credentials_is_active", table_name="bilibili_credentials")
    op.drop_table("bilibili_credentials")
