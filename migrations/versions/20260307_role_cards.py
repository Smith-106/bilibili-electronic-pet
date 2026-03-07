"""add role cards table

Revision ID: 20260307_role_cards
Revises: 20260307_knowledge_entries
Create Date: 2026-03-07 00:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260307_role_cards"
down_revision: Union[str, None] = "20260307_knowledge_entries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "role_cards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("tone", sa.JSON(), nullable=False),
        sa.Column("constraints", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_role_cards_key", "role_cards", ["key"], unique=True)
    op.create_index("ix_role_cards_enabled", "role_cards", ["enabled"], unique=False)
    op.create_index("ix_role_cards_is_active", "role_cards", ["is_active"], unique=False)
    op.create_index("ix_role_cards_updated_at", "role_cards", ["updated_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_role_cards_updated_at", table_name="role_cards")
    op.drop_index("ix_role_cards_is_active", table_name="role_cards")
    op.drop_index("ix_role_cards_enabled", table_name="role_cards")
    op.drop_index("ix_role_cards_key", table_name="role_cards")
    op.drop_table("role_cards")
