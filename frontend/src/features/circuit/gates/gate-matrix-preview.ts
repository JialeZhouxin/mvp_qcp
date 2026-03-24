import type { GateName } from "../model/types";

export interface GateMatrixPreview {
  readonly descriptionZh: string;
  readonly qubitCount: number;
  readonly matrixLatex: string;
}

const latex = String.raw;

const MATRIX_PREVIEWS: Readonly<Record<GateName, GateMatrixPreview>> = Object.freeze({
  i: {
    descriptionZh: "恒等门，不改变量子态。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}1&0\\0&1\end{bmatrix}`,
  },
  x: {
    descriptionZh: "泡利 X 门，实现比特翻转。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}0&1\\1&0\end{bmatrix}`,
  },
  y: {
    descriptionZh: "泡利 Y 门，同时引入相位变化。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}0&-i\\i&0\end{bmatrix}`,
  },
  z: {
    descriptionZh: "泡利 Z 门，实现相位翻转。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}1&0\\0&-1\end{bmatrix}`,
  },
  h: {
    descriptionZh: "Hadamard 门，将基态变为叠加态。",
    qubitCount: 1,
    matrixLatex: latex`\frac{1}{\sqrt{2}}\begin{bmatrix}1&1\\1&-1\end{bmatrix}`,
  },
  s: {
    descriptionZh: "S 相位门，施加 \(\pi/2\) 相位。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}1&0\\0&i\end{bmatrix}`,
  },
  sdg: {
    descriptionZh: "S 逆门，抵消 S 门相位。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}1&0\\0&-i\end{bmatrix}`,
  },
  t: {
    descriptionZh: "T 相位门，施加 \(\pi/4\) 相位。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}1&0\\0&e^{i\pi/4}\end{bmatrix}`,
  },
  tdg: {
    descriptionZh: "T 逆门，抵消 T 门相位。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}1&0\\0&e^{-i\pi/4}\end{bmatrix}`,
  },
  rx: {
    descriptionZh: "绕 X 轴按角度 \(\theta\) 旋转。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}\cos\left(\frac{\theta}{2}\right)&-i\sin\left(\frac{\theta}{2}\right)\\-i\sin\left(\frac{\theta}{2}\right)&\cos\left(\frac{\theta}{2}\right)\end{bmatrix}`,
  },
  ry: {
    descriptionZh: "绕 Y 轴按角度 \(\theta\) 旋转。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}\cos\left(\frac{\theta}{2}\right)&-\sin\left(\frac{\theta}{2}\right)\\\sin\left(\frac{\theta}{2}\right)&\cos\left(\frac{\theta}{2}\right)\end{bmatrix}`,
  },
  rz: {
    descriptionZh: "绕 Z 轴按角度 \(\theta\) 旋转。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}e^{-i\theta/2}&0\\0&e^{i\theta/2}\end{bmatrix}`,
  },
  u: {
    descriptionZh: "通用单比特门，可组合任意单比特旋转。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}\cos\left(\frac{\theta}{2}\right)&-e^{i\lambda}\sin\left(\frac{\theta}{2}\right)\\e^{i\phi}\sin\left(\frac{\theta}{2}\right)&e^{i(\phi+\lambda)}\cos\left(\frac{\theta}{2}\right)\end{bmatrix}`,
  },
  p: {
    descriptionZh: "相位门，对 \(|1\rangle\) 分量施加相位。",
    qubitCount: 1,
    matrixLatex: latex`\begin{bmatrix}1&0\\0&e^{i\lambda}\end{bmatrix}`,
  },
  cx: {
    descriptionZh: "受控非门，控制比特为 1 时翻转目标比特。",
    qubitCount: 2,
    matrixLatex: latex`\begin{bmatrix}1&0&0&0\\0&1&0&0\\0&0&0&1\\0&0&1&0\end{bmatrix}`,
  },
  cp: {
    descriptionZh: "受控相位门，按条件施加相位旋转。",
    qubitCount: 2,
    matrixLatex: latex`\begin{bmatrix}1&0&0&0\\0&1&0&0\\0&0&1&0\\0&0&0&e^{i\lambda}\end{bmatrix}`,
  },
  cz: {
    descriptionZh: "受控 Z 门，条件触发相位翻转。",
    qubitCount: 2,
    matrixLatex: latex`\begin{bmatrix}1&0&0&0\\0&1&0&0\\0&0&1&0\\0&0&0&-1\end{bmatrix}`,
  },
  ccx: {
    descriptionZh: "Toffoli 门，双控制下翻转目标比特。",
    qubitCount: 3,
    matrixLatex: latex`\begin{bmatrix}1&0&0&0&0&0&0&0\\0&1&0&0&0&0&0&0\\0&0&1&0&0&0&0&0\\0&0&0&1&0&0&0&0\\0&0&0&0&1&0&0&0\\0&0&0&0&0&1&0&0\\0&0&0&0&0&0&0&1\\0&0&0&0&0&0&1&0\end{bmatrix}`,
  },
  swap: {
    descriptionZh: "交换门，互换两个量子比特状态。",
    qubitCount: 2,
    matrixLatex: latex`\begin{bmatrix}1&0&0&0\\0&0&1&0\\0&1&0&0\\0&0&0&1\end{bmatrix}`,
  },
  m: {
    descriptionZh: "测量门，将量子态投影到经典结果。",
    qubitCount: 1,
    matrixLatex: latex`\left\{P_0=\begin{bmatrix}1&0\\0&0\end{bmatrix},\;P_1=\begin{bmatrix}0&0\\0&1\end{bmatrix}\right\}`,
  },
});

export function getGateMatrixPreview(gate: GateName): GateMatrixPreview {
  return MATRIX_PREVIEWS[gate];
}
