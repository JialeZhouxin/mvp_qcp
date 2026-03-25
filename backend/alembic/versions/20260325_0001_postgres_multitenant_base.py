"""create multitenant baseline schema"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision = "20260325_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenant",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_tenant_slug", "tenant", ["slug"], unique=False)
    op.create_index("ix_tenant_status", "tenant", ["status"], unique=False)

    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("password_salt", sa.String(), nullable=True),
        sa.Column("token", sa.String(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_user_tenant_id", "user", ["tenant_id"], unique=False)
    op.create_index("ix_user_username", "user", ["username"], unique=False)
    op.create_index("ix_user_token", "user", ["token"], unique=False)
    op.create_index("ix_user_token_expires_at", "user", ["token_expires_at"], unique=False)

    op.create_table(
        "task",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("result_json", sa.String(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_tenant_id", "task", ["tenant_id"], unique=False)
    op.create_index("ix_task_user_id", "task", ["user_id"], unique=False)
    op.create_index("ix_task_status", "task", ["status"], unique=False)
    op.create_index("ix_task_tenant_user_created_at", "task", ["tenant_id", "user_id", "created_at"], unique=False)
    op.create_index("ix_task_tenant_status_created_at", "task", ["tenant_id", "status", "created_at"], unique=False)

    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("entry_type", sa.String(length=16), nullable=False),
        sa.Column("payload_json", sa.String(), nullable=False),
        sa.Column("last_task_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["last_task_id"], ["task.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "user_id", "name", name="uq_project_tenant_user_name"),
    )
    op.create_index("ix_project_tenant_id", "project", ["tenant_id"], unique=False)
    op.create_index("ix_project_user_id", "project", ["user_id"], unique=False)
    op.create_index("ix_project_name", "project", ["name"], unique=False)

    op.create_table(
        "idempotencyrecord",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["task.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "user_id", "idempotency_key", name="uq_idempotency_tenant_user_key"),
    )
    op.create_index("ix_idempotencyrecord_tenant_id", "idempotencyrecord", ["tenant_id"], unique=False)
    op.create_index("ix_idempotencyrecord_user_id", "idempotencyrecord", ["user_id"], unique=False)
    op.create_index("ix_idempotencyrecord_idempotency_key", "idempotencyrecord", ["idempotency_key"], unique=False)
    op.create_index("ix_idempotencyrecord_task_id", "idempotencyrecord", ["task_id"], unique=False)


def downgrade() -> None:
    index_names: Sequence[str] = (
        "ix_idempotencyrecord_task_id",
        "ix_idempotencyrecord_idempotency_key",
        "ix_idempotencyrecord_user_id",
        "ix_idempotencyrecord_tenant_id",
    )
    for index_name in index_names:
        op.drop_index(index_name, table_name="idempotencyrecord")
    op.drop_table("idempotencyrecord")

    for index_name in ("ix_project_name", "ix_project_user_id", "ix_project_tenant_id"):
        op.drop_index(index_name, table_name="project")
    op.drop_table("project")

    for index_name in (
        "ix_task_tenant_status_created_at",
        "ix_task_tenant_user_created_at",
        "ix_task_status",
        "ix_task_user_id",
        "ix_task_tenant_id",
    ):
        op.drop_index(index_name, table_name="task")
    op.drop_table("task")

    for index_name in ("ix_user_token_expires_at", "ix_user_token", "ix_user_username", "ix_user_tenant_id"):
        op.drop_index(index_name, table_name="user")
    op.drop_table("user")

    op.drop_index("ix_tenant_status", table_name="tenant")
    op.drop_index("ix_tenant_slug", table_name="tenant")
    op.drop_table("tenant")
