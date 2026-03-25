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

For local legacy data migration:

1. Set `SQLITE_SOURCE_DATABASE_URL` to the old SQLite file.
2. Set `DATABASE_URL` to the empty target database.
3. Run `python scripts/migrate_sqlite_to_postgres.py` in `backend/`.

## Auth and tenant behavior

- Registering a user now auto-creates a tenant.
- `POST /api/auth/register` returns `tenant_id`, `tenant_slug`, and `tenant_name`.
- `POST /api/auth/login` returns the same tenant metadata.
- Existing business queries now scope by both `tenant_id` and `user_id`.

## Notes

- SQLite remains available for tests and temporary local development.
- Production intent is PostgreSQL with Alembic-managed schema changes.
- The one-time migration script clears legacy tokens during import and requires the target database to be empty.
