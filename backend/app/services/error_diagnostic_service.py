from typing import Any

PHASE_SUBMIT = "SUBMIT"
PHASE_QUEUE = "QUEUE"
PHASE_EXECUTION = "EXECUTION"
PHASE_RESULT = "RESULT"


def _resolve_phase(code: str) -> str:
    if code.startswith("QUEUE_"):
        return PHASE_QUEUE
    if code in {"INVALID_EXEC_RESULT"}:
        return PHASE_RESULT
    if code in {
        "EXECUTION_TIMEOUT",
        "SANDBOX_VALIDATION_ERROR",
        "SANDBOX_EXECUTION_ERROR",
        "DOCKER_UNAVAILABLE",
        "DOCKER_API_ERROR",
        "CONTAINER_EXEC_ERROR",
        "CONTAINER_EXIT_ERROR",
        "RUNNER_ERROR",
        "WORKER_EXEC_ERROR",
    }:
        return PHASE_EXECUTION
    return PHASE_SUBMIT


def _resolve_summary(code: str, phase: str) -> str:
    if code == "EXECUTION_TIMEOUT":
        return "任务执行超时，未在限定时间内完成。"
    if code == "SANDBOX_VALIDATION_ERROR":
        return "提交内容未通过安全校验。"
    if code == "QUEUE_OVERLOADED":
        return "队列拥塞，暂时无法接收更多任务。"
    if phase == PHASE_QUEUE:
        return "任务进入队列失败。"
    if phase == PHASE_EXECUTION:
        return "任务在执行阶段失败。"
    if phase == PHASE_RESULT:
        return "任务结果格式不符合平台约定。"
    return "任务提交阶段发生异常。"


def _resolve_suggestions(code: str, phase: str) -> list[str]:
    if code == "EXECUTION_TIMEOUT":
        return [
            "降低线路复杂度（减少量子比特数、深度或门数量）后重试。",
            "确认算法不会进入长时间循环。",
        ]
    if code == "SANDBOX_VALIDATION_ERROR":
        return [
            "检查是否使用了平台禁用的模块或系统调用。",
            "只保留量子线路构建与结果返回的必要代码。",
        ]
    if code == "QUEUE_OVERLOADED":
        return ["稍后重试提交任务。", "优先减少短时间内的批量并发提交。"]
    if phase == PHASE_QUEUE:
        return ["检查队列与 Worker 服务状态。", "稍后重试，如持续失败请记录错误码反馈平台维护者。"]
    if phase == PHASE_EXECUTION:
        return ["检查输入参数、门配置与语法是否正确。", "使用更小样例验证后逐步放大规模。"]
    if phase == PHASE_RESULT:
        return ["确保返回值为平台约定结构，例如 {'counts': {...}}。"]
    return ["检查请求参数并重试。"]


def build_task_diagnostic(code: str, message: str) -> dict[str, Any]:
    normalized_code = code.strip() or "UNKNOWN_TASK_ERROR"
    normalized_message = message.strip() or "unknown error"
    phase = _resolve_phase(normalized_code)
    return {
        "code": normalized_code,
        "message": normalized_message,
        "phase": phase,
        "summary": _resolve_summary(normalized_code, phase),
        "suggestions": _resolve_suggestions(normalized_code, phase),
    }


def normalize_task_diagnostic(payload: dict[str, Any]) -> dict[str, Any]:
    code = str(payload.get("code", "UNKNOWN_TASK_ERROR"))
    message = str(payload.get("message", "unknown error"))
    base = build_task_diagnostic(code, message)
    if "phase" in payload:
        base["phase"] = str(payload["phase"])
    if "summary" in payload:
        base["summary"] = str(payload["summary"])
    if isinstance(payload.get("suggestions"), list):
        base["suggestions"] = [str(item) for item in payload["suggestions"]]
    return base
