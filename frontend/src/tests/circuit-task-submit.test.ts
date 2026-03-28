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

  it("builds deterministic payloads for newly supported gates", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [
        { id: "1", gate: "sx", targets: [0], layer: 0 },
        { id: "2", gate: "sy", targets: [1], layer: 1 },
        { id: "3", gate: "cy", controls: [0], targets: [1], layer: 2 },
        { id: "4", gate: "ch", controls: [1], targets: [2], layer: 3 },
        { id: "5", gate: "cswap", controls: [0], targets: [1, 2], layer: 4 },
        { id: "6", gate: "ccz", controls: [0, 1], targets: [2], layer: 5 },
        { id: "7", gate: "rxx", targets: [0, 1], params: [0.25], layer: 6 },
        { id: "8", gate: "rzx", targets: [2, 1], params: [0.5], layer: 7 },
      ],
    };

    expect(buildCircuitTaskPayload(model)).toEqual({
      num_qubits: 3,
      operations: [
        { gate: "sx", targets: [0] },
        { gate: "sy", targets: [1] },
        { gate: "cy", targets: [1], controls: [0] },
        { gate: "ch", targets: [2], controls: [1] },
        { gate: "cswap", targets: [1, 2], controls: [0] },
        { gate: "ccz", targets: [2], controls: [0, 1] },
        { gate: "rxx", targets: [0, 1], params: [0.25] },
        { gate: "rzx", targets: [2, 1], params: [0.5] },
      ],
    });
  });
});
