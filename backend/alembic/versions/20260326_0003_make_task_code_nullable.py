"""make task code nullable for circuit tasks"""

from alembic import op
import sqlalchemy as sa

revision = "20260326_0003"
down_revision = "20260326_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("task", "code", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column("task", "code", existing_type=sa.String(), nullable=False)
