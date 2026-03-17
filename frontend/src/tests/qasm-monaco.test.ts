import { buildQasmErrorMarkers } from "../features/circuit/qasm/qasm-monaco";

describe("qasm monaco helpers", () => {
  it("returns empty markers when no parse error", () => {
    expect(buildQasmErrorMarkers(null, 8)).toEqual([]);
  });

  it("maps parse error to monaco marker payload", () => {
    const markers = buildQasmErrorMarkers(
      {
        code: "INVALID_SYNTAX",
        message: "statement must end with ';'",
        line: 3,
        column: 2,
        excerpt: "x q[0]",
      },
      8,
    );

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      startLineNumber: 3,
      startColumn: 2,
      endLineNumber: 3,
      message: "statement must end with ';'",
      severity: 8,
      source: "qasm-parser",
      code: "INVALID_SYNTAX",
    });
    expect(markers[0].endColumn).toBeGreaterThan(markers[0].startColumn);
  });
});
