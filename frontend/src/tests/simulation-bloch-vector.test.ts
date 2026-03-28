import { simulateCircuitAnalysis } from "../features/circuit/simulation/simulation-core";

describe("simulateCircuitAnalysis Bloch vectors", () => {
  it("returns +Z for the default |0> state", () => {
    const result = simulateCircuitAnalysis({
      numQubits: 1,
      operations: [],
    });

    expect(result.blochVectors).toHaveLength(1);
    expect(result.blochVectors[0]?.x ?? 0).toBeCloseTo(0, 6);
    expect(result.blochVectors[0]?.y ?? 0).toBeCloseTo(0, 6);
    expect(result.blochVectors[0]?.z ?? 0).toBeCloseTo(1, 6);
  });

  it("returns +X for |+> and near-zero vectors for Bell-state single-qubit marginals", () => {
    const plus = simulateCircuitAnalysis({
      numQubits: 1,
      operations: [{ id: "h-0", gate: "h", targets: [0], layer: 0 }],
    });
    expect(plus.blochVectors[0]?.x ?? 0).toBeCloseTo(1, 6);
    expect(plus.blochVectors[0]?.y ?? 0).toBeCloseTo(0, 6);
    expect(plus.blochVectors[0]?.z ?? 0).toBeCloseTo(0, 6);

    const bell = simulateCircuitAnalysis({
      numQubits: 2,
      operations: [
        { id: "h-0", gate: "h", targets: [0], layer: 0 },
        { id: "cx-0", gate: "cx", targets: [1], controls: [0], layer: 1 },
      ],
    });

    expect(bell.blochVectors).toHaveLength(2);
    for (const vector of bell.blochVectors) {
      expect(vector.x).toBeCloseTo(0, 6);
      expect(vector.y).toBeCloseTo(0, 6);
      expect(vector.z).toBeCloseTo(0, 6);
    }
  });

  it("supports sx and sy as expected single-qubit rotations", () => {
    const sx = simulateCircuitAnalysis({
      numQubits: 1,
      operations: [{ id: "sx-0", gate: "sx", targets: [0], layer: 0 }],
    });
    expect(sx.blochVectors[0]?.x ?? 0).toBeCloseTo(0, 6);
    expect(sx.blochVectors[0]?.y ?? 0).toBeCloseTo(-1, 6);
    expect(sx.blochVectors[0]?.z ?? 0).toBeCloseTo(0, 6);

    const sy = simulateCircuitAnalysis({
      numQubits: 1,
      operations: [{ id: "sy-0", gate: "sy", targets: [0], layer: 0 }],
    });
    expect(sy.blochVectors[0]?.x ?? 0).toBeCloseTo(1, 6);
    expect(sy.blochVectors[0]?.y ?? 0).toBeCloseTo(0, 6);
    expect(sy.blochVectors[0]?.z ?? 0).toBeCloseTo(0, 6);
  });

  it("supports rxx and cswap in the local simulator", () => {
    const rxx = simulateCircuitAnalysis({
      numQubits: 2,
      operations: [{ id: "rxx-0", gate: "rxx", targets: [0, 1], params: [Math.PI], layer: 0 }],
    });
    expect(rxx.probabilities["11"]).toBeCloseTo(1, 6);

    const cswap = simulateCircuitAnalysis({
      numQubits: 3,
      operations: [
        { id: "x-0", gate: "x", targets: [0], layer: 0 },
        { id: "x-2", gate: "x", targets: [2], layer: 1 },
        { id: "cswap-0", gate: "cswap", controls: [0], targets: [1, 2], layer: 2 },
      ],
    });
    expect(cswap.probabilities["011"]).toBeCloseTo(1, 6);
  });
});
