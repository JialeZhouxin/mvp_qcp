import ast
import builtins
import multiprocessing as mp
from typing import Any

ALLOWED_IMPORTS = {"qibo", "math", "numpy"}
DISALLOWED_CALLS = {"eval", "exec", "compile", "open", "input"}
DISALLOWED_ATTRIBUTES = {"system", "popen", "remove", "unlink", "rmdir", "mkdir", "makedirs"}
FATAL_BASE_EXCEPTIONS = (KeyboardInterrupt, SystemExit, GeneratorExit)


class SandboxValidationError(ValueError):
    pass


class SandboxExecutionError(RuntimeError):
    pass


def _safe_import(
    name: str,
    globals_: dict[str, Any] | None = None,
    locals_: dict[str, Any] | None = None,
    fromlist: tuple[str, ...] = (),
    level: int = 0,
) -> Any:
    root = name.split(".", 1)[0]
    if root not in ALLOWED_IMPORTS:
        raise SandboxValidationError(f"import not allowed: {name}")
    return builtins.__import__(name, globals_, locals_, fromlist, level)


def validate_code(code: str) -> None:
    """Validate user code AST against import/call/attribute restrictions."""
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        raise SandboxValidationError(f"syntax error: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = []
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif node.module:
                names = [node.module]
            for module_name in names:
                root = module_name.split(".", 1)[0]
                if root not in ALLOWED_IMPORTS:
                    raise SandboxValidationError(f"import not allowed: {module_name}")

        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in DISALLOWED_CALLS:
                raise SandboxValidationError(f"call not allowed: {node.func.id}")

        if isinstance(node, ast.Attribute) and node.attr in DISALLOWED_ATTRIBUTES:
            raise SandboxValidationError(f"attribute not allowed: {node.attr}")


def _run_user_code(code: str, output_queue: mp.Queue) -> None:
    """Execute user code in isolated process and return result/error via queue."""
    safe_builtins = {
        "abs": abs,
        "all": all,
        "any": any,
        "bool": bool,
        "dict": dict,
        "enumerate": enumerate,
        "float": float,
        "int": int,
        "len": len,
        "list": list,
        "max": max,
        "min": min,
        "print": print,
        "range": range,
        "round": round,
        "set": set,
        "str": str,
        "sum": sum,
        "tuple": tuple,
        "zip": zip,
        "__import__": _safe_import,
    }

    globals_ns: dict[str, Any] = {"__builtins__": safe_builtins}

    try:
        compiled = compile(code, "<user_code>", "exec")
        exec(compiled, globals_ns, globals_ns)

        if "main" in globals_ns and callable(globals_ns["main"]):
            result = globals_ns["main"]()
        else:
            result = globals_ns.get("RESULT")

        if result is None:
            raise SandboxExecutionError("RESULT or main() return is required")

        output_queue.put({"ok": True, "result": result})
    except BaseException as exc:  # pragma: no cover
        if isinstance(exc, FATAL_BASE_EXCEPTIONS):
            raise
        output_queue.put({"ok": False, "error": str(exc)})


def run_with_limits(code: str, timeout_seconds: int) -> Any:
    """Run validated user code in a subprocess with a hard timeout."""
    validate_code(code)

    queue: mp.Queue = mp.Queue(maxsize=1)
    process = mp.Process(target=_run_user_code, args=(code, queue), daemon=True)
    process.start()
    process.join(timeout_seconds)

    if process.is_alive():
        process.terminate()
        process.join(1)
        raise SandboxExecutionError(f"execution timeout: {timeout_seconds}s")

    if queue.empty():
        raise SandboxExecutionError("no execution result returned")

    payload = queue.get_nowait()
    if not payload.get("ok"):
        raise SandboxExecutionError(payload.get("error", "sandbox execution failed"))

    return payload.get("result")
