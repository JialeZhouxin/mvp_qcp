"""add circuit task fields"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision = "20260326_0002"
down_revision = "20260325_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "task",
        sa.Column(
            "task_type", sa.String(length=16), nullable=False, server_default="code"
        ),
    )
    op.add_column("task", sa.Column("payload_json", sa.String(), nullable=True))
    op.create_index("ix_task_task_type", "task", ["task_type"], unique=False)

    op.execute("UPDATE task SET task_type = 'code' WHERE task_type IS NULL")

    op.alter_column("task", "task_type", server_default=None)


def downgrade() -> None:
    index_names: Sequence[str] = ("ix_task_task_type",)
    for index_name in index_names:
        op.drop_index(index_name, table_name="task")
    op.drop_column("task", "payload_json")
    op.drop_column("task", "task_type")
