"""make task code nullable for circuit tasks"""

from alembic import op
import sqlalchemy as sa

revision = "20260326_0003"
down_revision = "20260326_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("task", recreate="always") as batch_op:
            batch_op.alter_column("code", existing_type=sa.String(), nullable=True)
        return
    op.alter_column("task", "code", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("task", recreate="always") as batch_op:
            batch_op.alter_column("code", existing_type=sa.String(), nullable=False)
        return
    op.alter_column("task", "code", existing_type=sa.String(), nullable=False)
