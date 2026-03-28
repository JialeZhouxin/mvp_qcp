import type { GateName } from "../model/types";

export interface GateMatrixPreview {
  readonly latex: string;
}

const MATRIX_PREVIEWS: Readonly<Record<GateName, GateMatrixPreview>> = Object.freeze({
  i: {
    latex: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}`,
  },
  x: {
    latex: String.raw`\begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}`,
  },
  y: {
    latex: String.raw`\begin{bmatrix} 0 & -i \\ i & 0 \end{bmatrix}`,
  },
  z: {
    latex: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}`,
  },
  h: {
    latex: String.raw`\frac{1}{\sqrt{2}}\begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}`,
  },
  sx: {
    latex: String.raw`\frac{1}{2}\begin{bmatrix} 1+i & 1-i \\ 1-i & 1+i \end{bmatrix}`,
  },
  sy: {
    latex: String.raw`\frac{1}{\sqrt{2}}\begin{bmatrix} 1 & -1 \\ 1 & 1 \end{bmatrix}`,
  },
  s: {
    latex: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & i \end{bmatrix}`,
  },
  sdg: {
    latex: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & -i \end{bmatrix}`,
  },
  t: {
    latex: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & e^{i\pi/4} \end{bmatrix}`,
  },
  tdg: {
    latex: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & e^{-i\pi/4} \end{bmatrix}`,
  },
  rx: {
    latex: String.raw`\begin{bmatrix} \cos(\theta/2) & -i\sin(\theta/2) \\ -i\sin(\theta/2) & \cos(\theta/2) \end{bmatrix}`,
  },
  ry: {
    latex: String.raw`\begin{bmatrix} \cos(\theta/2) & -\sin(\theta/2) \\ \sin(\theta/2) & \cos(\theta/2) \end{bmatrix}`,
  },
  rz: {
    latex: String.raw`\begin{bmatrix} e^{-i\theta/2} & 0 \\ 0 & e^{i\theta/2} \end{bmatrix}`,
  },
  u: {
    latex: String.raw`\begin{bmatrix} \cos(\theta/2) & -e^{i\lambda}\sin(\theta/2) \\ e^{i\phi}\sin(\theta/2) & e^{i(\phi+\lambda)}\cos(\theta/2) \end{bmatrix}`,
  },
  p: {
    latex: String.raw`\begin{bmatrix} 1 & 0 \\ 0 & e^{i\lambda} \end{bmatrix}`,
  },
  cx: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 1 & 0 \end{bmatrix}`,
  },
  cy: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & -i \\ 0 & 0 & i & 0 \end{bmatrix}`,
  },
  ch: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & \frac{1}{\sqrt{2}} & \frac{1}{\sqrt{2}} \\ 0 & 0 & \frac{1}{\sqrt{2}} & -\frac{1}{\sqrt{2}} \end{bmatrix}`,
  },
  cp: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & e^{i\lambda} \end{bmatrix}`,
  },
  cz: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & -1 \end{bmatrix}`,
  },
  ccx: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 & 0 & 0 & 1 & 0 \end{bmatrix}`,
  },
  ccz: {
    latex: String.raw`\operatorname{diag}(1,1,1,1,1,1,1,-1)`,
  },
  swap: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}`,
  },
  cswap: {
    latex: String.raw`\begin{bmatrix} 1 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 1 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 & 0 & 1 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 1 \end{bmatrix}`,
  },
  rxx: {
    latex: String.raw`e^{-i(\theta/2)(X \otimes X)}`,
  },
  ryy: {
    latex: String.raw`e^{-i(\theta/2)(Y \otimes Y)}`,
  },
  rzz: {
    latex: String.raw`e^{-i(\theta/2)(Z \otimes Z)}`,
  },
  rzx: {
    latex: String.raw`e^{-i(\theta/2)(Z \otimes X)}`,
  },
  m: {
    latex: String.raw`P(0)=\begin{bmatrix} 1 & 0 \\ 0 & 0 \end{bmatrix}\quad P(1)=\begin{bmatrix} 0 & 0 \\ 0 & 1 \end{bmatrix}`,
  },
});

export function getGateMatrixPreview(gate: GateName): GateMatrixPreview {
  return MATRIX_PREVIEWS[gate];
}
