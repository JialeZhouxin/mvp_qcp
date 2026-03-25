"""Tenant naming helpers."""

import re

from sqlmodel import Session, select

from app.models.tenant import Tenant

TENANT_SLUG_MAX_LENGTH = 64


def build_tenant_slug(seed: str) -> str:
    """Build a normalized tenant slug from a free-form seed string."""
    normalized = re.sub(r"[^a-z0-9]+", "-", seed.strip().lower())
    normalized = normalized.strip("-")
    if not normalized:
        normalized = "tenant"
    return normalized[:TENANT_SLUG_MAX_LENGTH].rstrip("-") or "tenant"


def ensure_unique_tenant_slug(session: Session, base_slug: str) -> str:
    """Return a slug that does not collide with existing tenant records."""
    candidate = base_slug
    suffix = 1
    while session.exec(select(Tenant).where(Tenant.slug == candidate)).first() is not None:
        suffix += 1
        trimmed = base_slug[: max(TENANT_SLUG_MAX_LENGTH - len(f"-{suffix}"), 1)].rstrip("-") or "tenant"
        candidate = f"{trimmed}-{suffix}"
    return candidate
