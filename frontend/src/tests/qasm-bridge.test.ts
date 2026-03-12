import type { CircuitModel } from "../features/circuit/model/types";
import { fromQasm3, toQasm3 } from "../features/circuit/qasm/qasm-bridge";

const SAMPLE_MODEL: CircuitModel = {
  numQubits: 2,
  operations: [
    { id: "1", gate: "h", targets: [0], layer: 0 },
    { id: "2", gate: "cx", controls: [0], targets: [1], layer: 1 },
    { id: "3", gate: "m", targets: [0], layer: 2 },
    { id: "4", gate: "m", targets: [1], layer: 3 },
  ],
};

describe("qasm bridge", () => {
  it("serializes circuit model to normalized openqasm3", () => {
    const qasm = toQasm3(SAMPLE_MODEL);

    expect(qasm).toContain("OPENQASM 3;");
    expect(qasm).toContain('include "stdgates.inc";');
    expect(qasm).toContain("h q[0];");
    expect(qasm).toContain("cx q[0], q[1];");
    expect(qasm).toContain("c[0] = measure q[0];");
  });

  it("parses openqasm and supports u1 alias normalization", () => {
    const qasm = `
OPENQASM 3;
qubit[1] q;
u1(pi/2) q[0];
`;
    const result = fromQasm3(qasm);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.model.operations[0].gate).toBe("u");
    expect(result.model.operations[0].params).toEqual([0, 0, Math.PI / 2]);
  });

  it("returns parse error for invalid qasm", () => {
    const result = fromQasm3("OPENQASM 3;\nqubit[1] q\nx q[0];");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("INVALID_SYNTAX");
  });
});

