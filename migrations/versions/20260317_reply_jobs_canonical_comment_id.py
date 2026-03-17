"""add reply_jobs canonical_comment_id

Revision ID: 20260317_reply_jobs_canonical_comment_id
Revises: 20260317_canonical_comment_id
Create Date: 2026-03-17

"""

from typing import Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260317_reply_jobs_canonical_comment_id"
down_revision: Union[str, None] = "20260317_canonical_comment_id"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "sqlite":
        with op.batch_alter_table("reply_jobs") as batch_op:
            batch_op.add_column(sa.Column("canonical_comment_id", sa.String(length=128), nullable=True))
    else:
        op.add_column(
            "reply_jobs",
            sa.Column("canonical_comment_id", sa.String(length=128), nullable=True),
        )

    # backfill legacy rows (default bilibili)
    op.execute(
        "UPDATE reply_jobs SET canonical_comment_id = 'bilibili:' || comment_id WHERE canonical_comment_id IS NULL"
    )

    if dialect == "sqlite":
        with op.batch_alter_table("reply_jobs") as batch_op:
            batch_op.create_index("ix_reply_jobs_canonical_comment_id", ["canonical_comment_id"], unique=False)
    else:
        op.create_index("ix_reply_jobs_canonical_comment_id", "reply_jobs", ["canonical_comment_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "sqlite":
        with op.batch_alter_table("reply_jobs") as batch_op:
            batch_op.drop_index("ix_reply_jobs_canonical_comment_id")
            batch_op.drop_column("canonical_comment_id")
    else:
        op.drop_index("ix_reply_jobs_canonical_comment_id", table_name="reply_jobs")
        op.drop_column("reply_jobs", "canonical_comment_id")
