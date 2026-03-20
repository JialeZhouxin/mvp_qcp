from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
FRONTEND_CONTRACT_PATH = REPO_ROOT / "frontend" / "src" / "api" / "generated" / "contracts.ts"

sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402

TARGET_SCHEMAS = [
    "LoginRequest",
    "LoginResponse",
    "RegisterRequest",
    "RegisterResponse",
    "ProjectItemResponse",
    "ProjectDetailResponse",
    "ProjectListResponse",
    "ProjectSaveRequest",
    "TaskSubmitRequest",
    "TaskSubmitResponse",
    "TaskStatusResponse",
    "TaskResultResponse",
    "TaskDiagnostic",
    "TaskCenterListItem",
    "TaskCenterListResponse",
    "TaskCenterDetailResponse",
    "TaskStatusStreamEvent",
    "TaskHeartbeatEvent",
]

TYPE_ALIASES = {
    "ProjectEntryType": '"code" | "circuit"',
}


def load_components() -> dict[str, Any]:
    return app.openapi().get("components", {}).get("schemas", {})


def load_openapi() -> dict[str, Any]:
    return app.openapi()


def resolve_ref(schema: dict[str, Any]) -> str:
    ref = schema["$ref"]
    return ref.rsplit("/", 1)[-1]


def to_ts_type(schema: dict[str, Any]) -> str:
    if "$ref" in schema:
        return resolve_ref(schema)

    if "enum" in schema:
        return " | ".join(json.dumps(item) for item in schema["enum"])

    any_of = schema.get("anyOf")
    if any_of:
        return " | ".join(to_ts_type(option) for option in any_of)

    schema_type = schema.get("type")
    if schema_type == "string":
        return "string"
    if schema_type == "integer":
        return "number"
    if schema_type == "number":
        return "number"
    if schema_type == "boolean":
        return "boolean"
    if schema_type == "null":
        return "null"
    if schema_type == "array":
        return f"{to_ts_type(schema['items'])}[]"
    if schema_type == "object":
        properties = schema.get("properties")
        if properties:
            required = set(schema.get("required", []))
            parts: list[str] = []
            for key, value in properties.items():
                optional = "" if key in required else "?"
                parts.append(f"{key}{optional}: {to_ts_type(value)};")
            return "{ " + " ".join(parts) + " }"
        if schema.get("additionalProperties") is True:
            return "Record<string, unknown>"
        if isinstance(schema.get("additionalProperties"), dict):
            return f"Record<string, {to_ts_type(schema['additionalProperties'])}>"
        return "Record<string, unknown>"
    return "unknown"


def render_interface(name: str, schema: dict[str, Any]) -> str:
    if name in TYPE_ALIASES:
        return f"export type {name} = {TYPE_ALIASES[name]};"

    if schema.get("enum"):
        return f"export type {name} = {to_ts_type(schema)};"

    if schema.get("type") != "object" or not schema.get("properties"):
        return f"export type {name} = {to_ts_type(schema)};"

    required = set(schema.get("required", []))
    lines = [f"export interface {name} {{"]
    for key, value in schema["properties"].items():
        optional = "" if key in required else "?"
        lines.append(f"  {key}{optional}: {to_ts_type(value)};")
    lines.append("}")
    return "\n".join(lines)


def main() -> None:
    openapi_schema = load_openapi()
    components = openapi_schema.get("components", {}).get("schemas", {})
    missing = [name for name in TARGET_SCHEMAS if name not in components]
    if missing:
        raise SystemExit(f"missing schemas: {', '.join(missing)}")

    stream_events = openapi_schema.get("paths", {}).get("/api/tasks/stream", {}).get("get", {}).get(
        "x-sse-events", {}
    )
    if stream_events != {
        "task_status": "TaskStatusStreamEvent",
        "heartbeat": "TaskHeartbeatEvent",
    }:
        raise SystemExit("missing or invalid x-sse-events contract for /api/tasks/stream")

    FRONTEND_CONTRACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    blocks = ["// Generated from backend OpenAPI. Do not edit by hand.\n"]
    blocks.append(render_interface("ProjectEntryType", {"enum": ["code", "circuit"]}))
    for name in TARGET_SCHEMAS:
        blocks.append(render_interface(name, components[name]))
    blocks.append(
        "\n".join(
            [
                "export type TaskStreamMessage =",
                '  | { event: "task_status"; data: TaskStatusStreamEvent }',
                '  | { event: "heartbeat"; data: TaskHeartbeatEvent };',
            ]
        )
    )

    FRONTEND_CONTRACT_PATH.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")
    print(f"wrote {FRONTEND_CONTRACT_PATH}")


if __name__ == "__main__":
    main()
