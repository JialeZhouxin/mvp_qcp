import { listCircuitTemplates, loadCircuitTemplate } from "../features/circuit/model/templates";

describe("circuit templates", () => {
  it("includes qft and grover templates in list", () => {
    const ids = listCircuitTemplates().map((template) => template.id);
    expect(ids).toContain("bell");
    expect(ids).toContain("superposition");
    expect(ids).toContain("qft");
    expect(ids).toContain("grover");
  });

  it("builds qft with configurable qubit count", () => {
    const model = loadCircuitTemplate("qft", { numQubits: 4 });

    expect(model.numQubits).toBe(4);
    expect(model.operations.filter((operation) => operation.gate === "h")).toHaveLength(4);
    expect(model.operations.filter((operation) => operation.gate === "cp")).toHaveLength(6);
    expect(model.operations.filter((operation) => operation.gate === "swap")).toHaveLength(2);
    expect(model.operations.filter((operation) => operation.gate === "m")).toHaveLength(4);
  });

  it("rejects invalid qft qubit count", () => {
    expect(() => loadCircuitTemplate("qft", { numQubits: 1 })).toThrow(
      "between 2 and 32",
    );
  });

  it("builds grover template with ancilla qubit and terminal measurement", () => {
    const model = loadCircuitTemplate("grover");

    expect(model.numQubits).toBe(5);
    expect(model.operations.some((operation) => operation.gate === "ccx")).toBe(true);
    expect(model.operations.some((operation) => operation.gate === "ccz")).toBe(true);
    expect(model.operations.some((operation) => operation.targets.includes(4))).toBe(true);
    expect(model.operations.filter((operation) => operation.gate === "m")).toHaveLength(5);
  });
});
