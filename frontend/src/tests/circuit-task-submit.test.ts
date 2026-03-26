import type { CircuitModel } from "../features/circuit/model/types";
import {
  buildCircuitTaskPayload,
  buildIdempotencyKey,
  buildSubmitFingerprint,
} from "../features/circuit/submission/circuit-task-submit";

describe("circuit task submit utility", () => {
  it("builds deterministic circuit payload for supported gates", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "3", gate: "m", targets: [0], layer: 3 },
        { id: "2", gate: "cx", controls: [0], targets: [1], layer: 1 },
        { id: "1", gate: "h", targets: [0], layer: 0 },
      ],
    };

    const payload = buildCircuitTaskPayload(model);

    expect(payload).toEqual({
      num_qubits: 2,
      operations: [
        { gate: "h", targets: [0] },
        { gate: "cx", targets: [1], controls: [0] },
        { gate: "m", targets: [0] },
      ],
    });
  });

  it("keeps parameter arrays in payload without serializing to python code", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "1", gate: "u", targets: [0], params: [1, 2, 3], layer: 0 }],
    };

    const payload = buildCircuitTaskPayload(model);

    expect(payload).toEqual({
      num_qubits: 1,
      operations: [{ gate: "u", targets: [0], params: [1, 2, 3] }],
    });
  });

  it("throws explicit error when controlled gate lacks control bit", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [{ id: "1", gate: "cx", targets: [1], layer: 0 }],
    };

    expect(() => buildCircuitTaskPayload(model)).toThrowError("gate cx expects 1 control");
  });

  it("throws explicit error for unsupported gate mapping", () => {
    const model = {
      numQubits: 1,
      operations: [{ id: "1", gate: "foo", targets: [0], layer: 0 }],
    } as unknown as CircuitModel;

    expect(() => buildCircuitTaskPayload(model)).toThrowError("unsupported gate: foo");
  });

  it("builds stable fingerprint regardless of operation array order", () => {
    const modelA: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "2", gate: "rx", targets: [1], params: [0.25], layer: 1 },
        { id: "1", gate: "h", targets: [0], layer: 0 },
      ],
    };
    const modelB: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "1", gate: "h", targets: [0], layer: 0 },
        { id: "2", gate: "rx", targets: [1], params: [0.25], layer: 1 },
      ],
    };

    const fingerprintA = buildSubmitFingerprint(modelA);
    const fingerprintB = buildSubmitFingerprint(modelB);

    expect(fingerprintA).toBe(fingerprintB);
  });

  it("builds stable idempotency key and changes when fingerprint changes", () => {
    const fingerprintA = JSON.stringify({
      num_qubits: 2,
      operations: [{ gate: "h", targets: [0] }],
    });
    const fingerprintB = JSON.stringify({
      num_qubits: 2,
      operations: [{ gate: "x", targets: [0] }],
    });

    const keyA1 = buildIdempotencyKey(fingerprintA);
    const keyA2 = buildIdempotencyKey(fingerprintA);
    const keyB = buildIdempotencyKey(fingerprintB);

    expect(keyA1).toBe(keyA2);
    expect(keyA1).not.toBe(keyB);
  });
});
