import type { CircuitModel } from "../features/circuit/model/types";
import {
  buildIdempotencyKey,
  buildQiboTaskCode,
  buildSubmitFingerprint,
} from "../features/circuit/submission/circuit-task-submit";

describe("circuit task submit utility", () => {
  it("builds deterministic qibo code for supported gates", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "3", gate: "m", targets: [0], layer: 3 },
        { id: "2", gate: "cx", controls: [0], targets: [1], layer: 1 },
        { id: "1", gate: "h", targets: [0], layer: 0 },
      ],
    };

    const code = buildQiboTaskCode(model);

    const hIndex = code.indexOf("circuit.add(gates.H(0))");
    const cxIndex = code.indexOf("circuit.add(gates.CNOT(0, 1))");
    const mIndex = code.indexOf("circuit.add(gates.M(0))");
    expect(hIndex).toBeGreaterThan(-1);
    expect(cxIndex).toBeGreaterThan(hIndex);
    expect(mIndex).toBeGreaterThan(cxIndex);
    expect(code).not.toContain("circuit.add(gates.M(0, 1))");
  });

  it("auto-appends full measurement when model has no measurement gate", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [{ id: "1", gate: "h", targets: [0], layer: 0 }],
    };

    const code = buildQiboTaskCode(model);

    expect(code).toContain("circuit.add(gates.M(0, 1, 2))");
  });

  it("decomposes u gate into rz-ry-rz sequence", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "1", gate: "u", targets: [0], params: [1, 2, 3], layer: 0 }],
    };

    const code = buildQiboTaskCode(model);

    expect(code).toContain("circuit.add(gates.RZ(0, theta=2))");
    expect(code).toContain("circuit.add(gates.RY(0, theta=1))");
    expect(code).toContain("circuit.add(gates.RZ(0, theta=3))");
  });

  it("maps p/cp/ccx to deterministic qibo decomposition", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [
        { id: "1", gate: "p", targets: [0], params: [0.4], layer: 0 },
        { id: "2", gate: "cp", controls: [0], targets: [1], params: [0.4], layer: 1 },
        { id: "3", gate: "ccx", controls: [0, 1], targets: [2], layer: 2 },
      ],
    };

    const code = buildQiboTaskCode(model);

    expect(code).toContain("circuit.add(gates.RZ(0, theta=0.4))");

    const cpLines = [
      "circuit.add(gates.RZ(0, theta=0.2))",
      "circuit.add(gates.CNOT(0, 1))",
      "circuit.add(gates.RZ(1, theta=-0.2))",
      "circuit.add(gates.CNOT(0, 1))",
      "circuit.add(gates.RZ(1, theta=0.2))",
    ];
    let cursor = 0;
    for (const line of cpLines) {
      const nextIndex = code.indexOf(line, cursor);
      expect(nextIndex).toBeGreaterThanOrEqual(cursor);
      cursor = nextIndex + line.length;
    }

    expect(code).toContain("circuit.add(gates.H(2))");
    expect(code).toContain("circuit.add(gates.TDG(1))");
    expect(code).toContain("circuit.add(gates.M(0, 1, 2))");
  });

  it("throws explicit error when controlled gate lacks control bit", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [{ id: "1", gate: "cx", targets: [1], layer: 0 }],
    };

    expect(() => buildQiboTaskCode(model)).toThrowError("gate cx expects 1 control");
  });

  it("throws explicit error for unsupported gate mapping", () => {
    const model = {
      numQubits: 1,
      operations: [{ id: "1", gate: "foo", targets: [0], layer: 0 }],
    } as unknown as CircuitModel;

    expect(() => buildQiboTaskCode(model)).toThrowError("unsupported single-qubit gate: foo");
  });

  it("throws explicit error when cp parameter is missing", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [{ id: "1", gate: "cp", controls: [0], targets: [1], layer: 0 }],
    };

    expect(() => buildQiboTaskCode(model)).toThrowError("gate cp expects 1 parameters");
  });

  it("throws explicit error when ccx controls are incomplete", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [{ id: "1", gate: "ccx", controls: [0], targets: [2], layer: 0 }],
    };

    expect(() => buildQiboTaskCode(model)).toThrowError("gate ccx expects 2 controls");
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
    const fingerprintA = '{"numQubits":2,"operations":[{"gate":"h","layer":0,"targets":[0]}]}';
    const fingerprintB = '{"numQubits":2,"operations":[{"gate":"x","layer":0,"targets":[0]}]}';

    const keyA1 = buildIdempotencyKey(fingerprintA);
    const keyA2 = buildIdempotencyKey(fingerprintA);
    const keyB = buildIdempotencyKey(fingerprintB);

    expect(keyA1).toBe(keyA2);
    expect(keyA1).not.toBe(keyB);
  });
});
