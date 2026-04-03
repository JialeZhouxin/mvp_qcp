# Backend Database Migration Update (2026-03-25)

## Summary

- Backend data model is now explicitly multitenant.
- `tenant` table is the root boundary for `user`, `task`, `project`, and `idempotencyrecord`.
- Runtime startup no longer auto-creates tables in `app/main.py`.
- Schema creation and evolution now use Alembic.

## New schema workflow

1. Configure `DATABASE_URL`.
2. Run `alembic upgrade head` in `backend/`.
3. Start the API and worker processes.

## Auth and tenant behavior

- Registering a user now auto-creates a tenant.
- `POST /api/auth/register` returns `tenant_id`, `tenant_slug`, and `tenant_name`.
- `POST /api/auth/login` returns the same tenant metadata.
- Existing business queries now scope by both `tenant_id` and `user_id`.

## Notes

- Production database is PostgreSQL with Alembic-managed schema changes.
- Unit tests use `sqlite:///:memory:` as a lightweight isolation strategy; this does not affect production architecture.
