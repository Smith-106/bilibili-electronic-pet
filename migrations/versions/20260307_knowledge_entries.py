"""add knowledge entries table

Revision ID: 20260307_knowledge_entries
Revises: 20260306_160851
Create Date: 2026-03-07 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260307_knowledge_entries"
down_revision: Union[str, None] = "20260306_160851"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "knowledge_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_knowledge_entries_category", "knowledge_entries", ["category"], unique=False)
    op.create_index("ix_knowledge_entries_enabled", "knowledge_entries", ["enabled"], unique=False)
    op.create_index("ix_knowledge_entries_updated_at", "knowledge_entries", ["updated_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_knowledge_entries_updated_at", table_name="knowledge_entries")
    op.drop_index("ix_knowledge_entries_enabled", table_name="knowledge_entries")
    op.drop_index("ix_knowledge_entries_category", table_name="knowledge_entries")
    op.drop_table("knowledge_entries")
