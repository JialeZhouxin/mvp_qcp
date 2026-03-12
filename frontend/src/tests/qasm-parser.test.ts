import { parseQasm3 } from "../features/circuit/qasm/qasm-parser";

describe("parseQasm3", () => {
  it("parses valid openqasm3 subset into circuit model", () => {
    const source = `
OPENQASM 3;
include "stdgates.inc";
qubit[2] q;
bit[2] c;
h q[0];
cx q[0], q[1];
c[0] = measure q[0];
`;
    const result = parseQasm3(source);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.model.numQubits).toBe(2);
    expect(result.model.operations).toHaveLength(3);
    expect(result.model.operations[0].gate).toBe("h");
    expect(result.model.operations[1].gate).toBe("cx");
    expect(result.model.operations[2].gate).toBe("m");
  });

  it("parses u2 alias as normalized u gate", () => {
    const source = `
OPENQASM 3;
qubit[1] q;
u2(pi/2, pi) q[0];
`;
    const result = parseQasm3(source);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const operation = result.model.operations[0];
    expect(operation.gate).toBe("u");
    expect(operation.params).toHaveLength(3);
  });

  it("fails when statement misses semicolon", () => {
    const source = `
OPENQASM 3
qubit[1] q;
`;
    const result = parseQasm3(source);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("INVALID_SYNTAX");
    expect(result.error.line).toBe(2);
  });

  it("fails with unsupported gate", () => {
    const source = `
OPENQASM 3;
qubit[1] q;
fsim(0.1, 0.2) q[0];
`;
    const result = parseQasm3(source);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("UNSUPPORTED_GATE");
  });

  it("fails when operand index is out of range", () => {
    const source = `
OPENQASM 3;
qubit[1] q;
x q[2];
`;
    const result = parseQasm3(source);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("INVALID_OPERAND");
  });

  it("fails when measurement is not terminal", () => {
    const source = `
OPENQASM 3;
qubit[2] q;
bit[2] c;
c[0] = measure q[0];
h q[1];
`;
    const result = parseQasm3(source);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("INVALID_CIRCUIT");
  });
});
