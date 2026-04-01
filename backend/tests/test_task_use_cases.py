from dataclasses import dataclass

import pytest

from app.models.task import TaskType
from app.services.circuit_payload import CircuitPayloadValidationError
from app.services.task_submit_shared import (
    TaskSubmitCommand,
    TaskSubmitDependencyUnavailableError,
    TaskSubmitOutcome,
    TaskSubmitValidationError,
)
from app.use_cases.task_use_cases import SubmitCircuitTaskUseCase, SubmitTaskUseCase


@dataclass
class SubmitRecorder:
    outcome: TaskSubmitOutcome
    last_command: TaskSubmitCommand | None = None

    def submit(self, command: TaskSubmitCommand) -> TaskSubmitOutcome:
        self.last_command = command
        return self.outcome


def test_submit_task_use_case_submits_code_command() -> None:
    recorder = SubmitRecorder(
        outcome=TaskSubmitOutcome(
            task_id=11,
            status="PENDING",
            task_type="code",
            deduplicated=False,
            queue_depth=1,
        )
    )
    use_case = SubmitTaskUseCase(recorder)  # type: ignore[arg-type]

    outcome = use_case.execute(tenant_id=1, user_id=2, code="print('ok')", idempotency_key="key-1")

    assert outcome.task_id == 11
    assert recorder.last_command is not None
    assert recorder.last_command.task_type == TaskType.CODE
    assert recorder.last_command.code == "print('ok')"
    assert recorder.last_command.raw_idempotency_key == "key-1"


def test_submit_circuit_task_use_case_rejects_unavailable_dependency() -> None:
    recorder = SubmitRecorder(
        outcome=TaskSubmitOutcome(
            task_id=21,
            status="PENDING",
            task_type="circuit",
            deduplicated=False,
            queue_depth=0,
        )
    )
    use_case = SubmitCircuitTaskUseCase(
        recorder,  # type: ignore[arg-type]
        availability_checker=lambda: False,
    )

    with pytest.raises(TaskSubmitDependencyUnavailableError) as exc_info:
        use_case.execute(
            tenant_id=1,
            user_id=2,
            payload={"num_qubits": 1, "operations": []},
            idempotency_key=None,
        )

    assert exc_info.value.code == "CIRCUIT_EXECUTOR_UNAVAILABLE"
    assert recorder.last_command is None


def test_submit_circuit_task_use_case_maps_validation_error() -> None:
    recorder = SubmitRecorder(
        outcome=TaskSubmitOutcome(
            task_id=31,
            status="PENDING",
            task_type="circuit",
            deduplicated=False,
            queue_depth=0,
        )
    )
    use_case = SubmitCircuitTaskUseCase(
        recorder,  # type: ignore[arg-type]
        availability_checker=lambda: True,
        payload_normalizer=lambda _payload: (_ for _ in ()).throw(
            CircuitPayloadValidationError(
                code="CIRCUIT_GATE_TARGET_REQUIRED",
                message="targets is required",
            )
        ),
    )

    with pytest.raises(TaskSubmitValidationError) as exc_info:
        use_case.execute(
            tenant_id=1,
            user_id=2,
            payload={"num_qubits": 1, "operations": [{"gate": "x"}]},
            idempotency_key="key-2",
        )

    assert exc_info.value.code == "CIRCUIT_GATE_TARGET_REQUIRED"
    assert recorder.last_command is None


def test_submit_circuit_task_use_case_normalizes_payload_before_submit() -> None:
    recorder = SubmitRecorder(
        outcome=TaskSubmitOutcome(
            task_id=41,
            status="PENDING",
            task_type="circuit",
            deduplicated=False,
            queue_depth=3,
        )
    )
    use_case = SubmitCircuitTaskUseCase(
        recorder,  # type: ignore[arg-type]
        availability_checker=lambda: True,
        payload_normalizer=lambda _payload: {
            "num_qubits": 2,
            "operations": [{"gate": "h", "targets": [0]}],
        },
    )

    outcome = use_case.execute(
        tenant_id=5,
        user_id=6,
        payload={"num_qubits": 999, "operations": []},
        idempotency_key="dedupe-key",
    )

    assert outcome.task_id == 41
    assert recorder.last_command is not None
    assert recorder.last_command.task_type == TaskType.CIRCUIT
    assert recorder.last_command.code is None
    assert recorder.last_command.payload_json == '{"num_qubits":2,"operations":[{"gate":"h","targets":[0]}]}'
    assert recorder.last_command.raw_idempotency_key == "dedupe-key"
