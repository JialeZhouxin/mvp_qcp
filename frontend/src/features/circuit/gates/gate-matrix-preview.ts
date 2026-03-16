import type { GateName } from "../model/types";

export interface GateMatrixPreview {
  readonly title: string;
  readonly body: string;
}

function rows(lines: readonly string[]): string {
  return lines.join("\n");
}

const MATRIX_PREVIEWS: Readonly<Record<GateName, GateMatrixPreview>> = Object.freeze({
  i: { title: "I", body: rows(["[1, 0]", "[0, 1]"]) },
  x: { title: "X", body: rows(["[0, 1]", "[1, 0]"]) },
  y: { title: "Y", body: rows(["[0, -i]", "[i, 0]"]) },
  z: { title: "Z", body: rows(["[1, 0]", "[0, -1]"]) },
  h: { title: "H", body: rows(["1/sqrt(2) *", "[1, 1]", "[1, -1]"]) },
  s: { title: "S", body: rows(["[1, 0]", "[0, i]"]) },
  sdg: { title: "Sdg", body: rows(["[1, 0]", "[0, -i]"]) },
  t: { title: "T", body: rows(["[1, 0]", "[0, exp(i*pi/4)]"]) },
  tdg: { title: "Tdg", body: rows(["[1, 0]", "[0, exp(-i*pi/4)]"]) },
  rx: {
    title: "RX(theta)",
    body: rows(["[cos(theta/2), -i*sin(theta/2)]", "[-i*sin(theta/2), cos(theta/2)]"]),
  },
  ry: {
    title: "RY(theta)",
    body: rows(["[cos(theta/2), -sin(theta/2)]", "[sin(theta/2), cos(theta/2)]"]),
  },
  rz: {
    title: "RZ(theta)",
    body: rows(["[exp(-i*theta/2), 0]", "[0, exp(i*theta/2)]"]),
  },
  u: {
    title: "U(theta, phi, lambda)",
    body: rows([
      "[cos(theta/2), -exp(i*lambda)*sin(theta/2)]",
      "[exp(i*phi)*sin(theta/2), exp(i*(phi+lambda))*cos(theta/2)]",
    ]),
  },
  p: {
    title: "P(lambda)",
    body: rows(["[1, 0]", "[0, exp(i*lambda)]"]),
  },
  cx: {
    title: "CX",
    body: rows(["[1,0,0,0]", "[0,1,0,0]", "[0,0,0,1]", "[0,0,1,0]"]),
  },
  cp: {
    title: "CP(lambda)",
    body: rows(["[1,0,0,0]", "[0,1,0,0]", "[0,0,1,0]", "[0,0,0,exp(i*lambda)]"]),
  },
  cz: {
    title: "CZ",
    body: rows(["[1,0,0,0]", "[0,1,0,0]", "[0,0,1,0]", "[0,0,0,-1]"]),
  },
  ccx: {
    title: "CCX (Toffoli)",
    body: rows([
      "[1,0,0,0,0,0,0,0]",
      "[0,1,0,0,0,0,0,0]",
      "[0,0,1,0,0,0,0,0]",
      "[0,0,0,1,0,0,0,0]",
      "[0,0,0,0,1,0,0,0]",
      "[0,0,0,0,0,1,0,0]",
      "[0,0,0,0,0,0,0,1]",
      "[0,0,0,0,0,0,1,0]",
    ]),
  },
  swap: {
    title: "SWAP",
    body: rows(["[1,0,0,0]", "[0,0,1,0]", "[0,1,0,0]", "[0,0,0,1]"]),
  },
  m: {
    title: "M",
    body: rows(["Measurement gate:", "P(0) = |0><0|", "P(1) = |1><1|"]),
  },
});

export function getGateMatrixPreview(gate: GateName): GateMatrixPreview {
  return MATRIX_PREVIEWS[gate];
}

