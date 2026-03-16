"""canonical comment id + publish reservation status

Revision ID: 20260317_canonical_comment_id
Revises: 20260312_bilibili_integration
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260317_canonical_comment_id"
down_revision: Union[str, None] = "20260312_bilibili_integration"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # --- comments ---
    if dialect == "sqlite":
        with op.batch_alter_table("comments") as batch_op:
            batch_op.add_column(sa.Column("platform", sa.String(length=32), nullable=False, server_default="bilibili"))
            batch_op.add_column(sa.Column("canonical_comment_id", sa.String(length=128), nullable=True))
    else:
        op.add_column(
            "comments",
            sa.Column("platform", sa.String(length=32), nullable=False, server_default="bilibili"),
        )
        op.add_column(
            "comments",
            sa.Column("canonical_comment_id", sa.String(length=128), nullable=True),
        )

    # backfill
    if dialect == "sqlite":
        op.execute(
            "UPDATE comments SET canonical_comment_id = 'bilibili:' || comment_id WHERE canonical_comment_id IS NULL"
        )
    else:
        op.execute(
            "UPDATE comments SET canonical_comment_id = 'bilibili:' || comment_id WHERE canonical_comment_id IS NULL"
        )

    # enforce not null + unique constraint swap
    if dialect == "sqlite":
        with op.batch_alter_table("comments") as batch_op:
            batch_op.alter_column("canonical_comment_id", existing_type=sa.String(length=128), nullable=False)
            batch_op.drop_constraint("uq_comments_comment_id", type_="unique")
            batch_op.create_unique_constraint("uq_comments_canonical_comment_id", ["canonical_comment_id"])
            batch_op.create_index("ix_comments_canonical_comment_id", ["canonical_comment_id"], unique=False)
            batch_op.create_index("ix_comments_platform", ["platform"], unique=False)
    else:
        op.alter_column("comments", "canonical_comment_id", existing_type=sa.String(length=128), nullable=False)
        op.drop_constraint("uq_comments_comment_id", "comments", type_="unique")
        op.create_unique_constraint("uq_comments_canonical_comment_id", "comments", ["canonical_comment_id"])
        op.create_index("ix_comments_canonical_comment_id", "comments", ["canonical_comment_id"], unique=False)
        op.create_index("ix_comments_platform", "comments", ["platform"], unique=False)

    # --- publish_logs ---
    if dialect == "sqlite":
        with op.batch_alter_table("publish_logs") as batch_op:
            batch_op.add_column(sa.Column("platform", sa.String(length=32), nullable=False, server_default="bilibili"))
            batch_op.add_column(sa.Column("canonical_comment_id", sa.String(length=128), nullable=True))
            batch_op.add_column(sa.Column("status", sa.String(length=16), nullable=False, server_default="published"))
            batch_op.add_column(sa.Column("published_at", sa.DateTime(), nullable=True))
            batch_op.add_column(sa.Column("failure_reason", sa.String(length=64), nullable=True))
    else:
        op.add_column(
            "publish_logs",
            sa.Column("platform", sa.String(length=32), nullable=False, server_default="bilibili"),
        )
        op.add_column(
            "publish_logs",
            sa.Column("canonical_comment_id", sa.String(length=128), nullable=True),
        )
        op.add_column(
            "publish_logs",
            sa.Column("status", sa.String(length=16), nullable=False, server_default="published"),
        )
        op.add_column("publish_logs", sa.Column("published_at", sa.DateTime(), nullable=True))
        op.add_column("publish_logs", sa.Column("failure_reason", sa.String(length=64), nullable=True))

    # backfill
    op.execute(
        "UPDATE publish_logs SET canonical_comment_id = 'bilibili:' || comment_id WHERE canonical_comment_id IS NULL"
    )

    # swap unique constraint
    if dialect == "sqlite":
        with op.batch_alter_table("publish_logs") as batch_op:
            batch_op.alter_column("canonical_comment_id", existing_type=sa.String(length=128), nullable=False)
            batch_op.drop_constraint("uq_publish_logs_comment_reply", type_="unique")
            batch_op.create_unique_constraint(
                "uq_publish_logs_canonical_reply",
                ["canonical_comment_id", "reply_hash"],
            )
            batch_op.create_index("ix_publish_logs_canonical_comment_id", ["canonical_comment_id"], unique=False)
            batch_op.create_index("ix_publish_logs_platform", ["platform"], unique=False)
    else:
        op.alter_column("publish_logs", "canonical_comment_id", existing_type=sa.String(length=128), nullable=False)
        op.drop_constraint("uq_publish_logs_comment_reply", "publish_logs", type_="unique")
        op.create_unique_constraint(
            "uq_publish_logs_canonical_reply",
            "publish_logs",
            ["canonical_comment_id", "reply_hash"],
        )
        op.create_index(
            "ix_publish_logs_canonical_comment_id",
            "publish_logs",
            ["canonical_comment_id"],
            unique=False,
        )
        op.create_index("ix_publish_logs_platform", "publish_logs", ["platform"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # Best-effort downgrade: constraints back to legacy keys.
    if dialect == "sqlite":
        with op.batch_alter_table("publish_logs") as batch_op:
            batch_op.drop_index("ix_publish_logs_platform")
            batch_op.drop_index("ix_publish_logs_canonical_comment_id")
            batch_op.drop_constraint("uq_publish_logs_canonical_reply", type_="unique")
            batch_op.create_unique_constraint("uq_publish_logs_comment_reply", ["comment_id", "reply_hash"])
            batch_op.drop_column("failure_reason")
            batch_op.drop_column("published_at")
            batch_op.drop_column("status")
            batch_op.drop_column("canonical_comment_id")
            batch_op.drop_column("platform")
    else:
        op.drop_index("ix_publish_logs_platform", table_name="publish_logs")
        op.drop_index("ix_publish_logs_canonical_comment_id", table_name="publish_logs")
        op.drop_constraint("uq_publish_logs_canonical_reply", "publish_logs", type_="unique")
        op.create_unique_constraint("uq_publish_logs_comment_reply", "publish_logs", ["comment_id", "reply_hash"])
        op.drop_column("publish_logs", "failure_reason")
        op.drop_column("publish_logs", "published_at")
        op.drop_column("publish_logs", "status")
        op.drop_column("publish_logs", "canonical_comment_id")
        op.drop_column("publish_logs", "platform")

    if dialect == "sqlite":
        with op.batch_alter_table("comments") as batch_op:
            batch_op.drop_index("ix_comments_platform")
            batch_op.drop_index("ix_comments_canonical_comment_id")
            batch_op.drop_constraint("uq_comments_canonical_comment_id", type_="unique")
            batch_op.create_unique_constraint("uq_comments_comment_id", ["comment_id"])
            batch_op.drop_column("canonical_comment_id")
            batch_op.drop_column("platform")
    else:
        op.drop_index("ix_comments_platform", table_name="comments")
        op.drop_index("ix_comments_canonical_comment_id", table_name="comments")
        op.drop_constraint("uq_comments_canonical_comment_id", "comments", type_="unique")
        op.create_unique_constraint("uq_comments_comment_id", "comments", ["comment_id"])
        op.drop_column("comments", "canonical_comment_id")
        op.drop_column("comments", "platform")
