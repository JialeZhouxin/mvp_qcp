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

  it("serializes and parses p/cp/ccx deterministically", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [
        { id: "1", gate: "p", targets: [0], params: [Math.PI / 3], layer: 0 },
        { id: "2", gate: "cp", controls: [0], targets: [1], params: [Math.PI / 2], layer: 1 },
        { id: "3", gate: "ccx", controls: [0, 1], targets: [2], layer: 2 },
      ],
    };
    const qasm = toQasm3(model);
    const pValue = Number((Math.PI / 3).toFixed(12)).toString();
    const cpValue = Number((Math.PI / 2).toFixed(12)).toString();

    expect(qasm).toContain(`p(${pValue}) q[0];`);
    expect(qasm).toContain(`cp(${cpValue}) q[0], q[1];`);
    expect(qasm).toContain("ccx q[0], q[1], q[2];");

    const parsed = fromQasm3(qasm);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.model.operations).toHaveLength(3);
    expect(parsed.model.operations[0]).toMatchObject({ gate: "p", targets: [0] });
    expect(parsed.model.operations[0].params?.[0]).toBeCloseTo(Math.PI / 3, 9);
    expect(parsed.model.operations[1]).toMatchObject({ gate: "cp", controls: [0], targets: [1] });
    expect(parsed.model.operations[1].params?.[0]).toBeCloseTo(Math.PI / 2, 9);
    expect(parsed.model.operations[2]).toMatchObject({
      gate: "ccx",
      controls: [0, 1],
      targets: [2],
    });
  });

  it("throws explicit serialization error when cp control is missing", () => {
    const model = {
      numQubits: 2,
      operations: [{ id: "1", gate: "cp", targets: [1], params: [0.5], layer: 0 }],
    } as unknown as CircuitModel;

    expect(() => toQasm3(model)).toThrowError("gate cp expects 1 control");
  });
});
