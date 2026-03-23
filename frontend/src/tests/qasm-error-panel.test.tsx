import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import QasmErrorPanel from "../features/circuit/components/QasmErrorPanel";

describe("QasmErrorPanel", () => {
  it("renders nothing when parse error is null", () => {
    const { container } = render(<QasmErrorPanel error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders parse error details when error exists", () => {
    render(
      <QasmErrorPanel
        error={{
          code: "MISSING_HEADER",
          message: "OPENQASM 3 header is required",
          line: 1,
          column: 1,
          excerpt: "qubit[1] q;",
        }}
      />,
    );

    expect(screen.getByText("qubit[1] q;")).toBeInTheDocument();
    expect(screen.getByTestId("qasm-fix-suggestion")).toBeInTheDocument();
  });
});


