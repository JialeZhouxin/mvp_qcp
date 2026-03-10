import pytest

from app.core.config import settings
from app.services.qibo_executor import execute_qibo_script


class StubBackend:
    def __init__(self, payload):
        self.payload = payload
        self.calls: list[tuple[str, int]] = []

    def execute(self, code: str, timeout_seconds: int):
        self.calls.append((code, timeout_seconds))
        return self.payload


def test_qibo_executor_normalizes_counts_and_probabilities(monkeypatch) -> None:
    backend = StubBackend({"counts": {"00": 3, "11": 1}})
    monkeypatch.setattr("app.services.qibo_executor.get_execution_backend", lambda: backend)

    result = execute_qibo_script("def main():\n    return {'counts': {'00': 3, '11': 1}}")

    assert result["counts"] == {"00": 3, "11": 1}
    assert result["probabilities"] == {"00": 0.75, "11": 0.25}
    assert backend.calls[0][1] == settings.qibo_exec_timeout_seconds


def test_qibo_executor_uses_existing_probabilities(monkeypatch) -> None:
    payload = {"counts": {"00": 1, "11": 3}, "probabilities": {"00": 0.1, "11": 0.9}}
    backend = StubBackend(payload)
    monkeypatch.setattr("app.services.qibo_executor.get_execution_backend", lambda: backend)

    result = execute_qibo_script("RESULT = {'counts': {'00': 1, '11': 3}}")

    assert result["probabilities"] == {"00": 0.1, "11": 0.9}


def test_qibo_executor_supports_bitstring_count_map(monkeypatch) -> None:
    backend = StubBackend({"00": 2, "11": 2})
    monkeypatch.setattr("app.services.qibo_executor.get_execution_backend", lambda: backend)

    result = execute_qibo_script("RESULT = {'00': 2, '11': 2}")

    assert result["counts"] == {"00": 2, "11": 2}
    assert result["probabilities"] == {"00": 0.5, "11": 0.5}


def test_qibo_executor_rejects_invalid_result(monkeypatch) -> None:
    backend = StubBackend(["not-a-dict"])
    monkeypatch.setattr("app.services.qibo_executor.get_execution_backend", lambda: backend)

    with pytest.raises(ValueError, match="execution result must be a dict"):
        execute_qibo_script("RESULT = []")
