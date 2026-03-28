import "katex/dist/katex.min.css";

import katex from "katex";

import { getGateCatalogItem } from "../gates/gate-catalog";
import { getGateMatrixPreview } from "../gates/gate-matrix-preview";
import type { GateName } from "../model/types";

interface GateMatrixTooltipProps {
  readonly gate: GateName;
  readonly accentColor: string;
}

const GATE_DESCRIPTIONS: Readonly<Record<GateName, string>> = Object.freeze({
  i: "恒等门，不改变量子态。",
  x: "对量子比特执行比特翻转。",
  y: "Pauli-Y 门，同时引入幅度翻转与相位变化。",
  z: "Pauli-Z 门，对 |1> 分量施加相位翻转。",
  h: "Hadamard 门，用于将计算基态变成叠加态。",
  sx: "X 门的平方根形式，常用于硬件原生门集。",
  sy: "Y 门的平方根形式，这里按 √Y 展示。",
  s: "相位门，对 |1> 分量施加 pi/2 相位。",
  sdg: "S 门的逆，对 |1> 分量施加 -pi/2 相位。",
  t: "T 门，对 |1> 分量施加 pi/4 相位。",
  tdg: "T 门的逆，对 |1> 分量施加 -pi/4 相位。",
  rx: "绕 X 轴旋转 theta。",
  ry: "绕 Y 轴旋转 theta。",
  rz: "绕 Z 轴旋转 theta。",
  u: "通用单比特门，使用 theta、phi、lambda 三个参数。",
  p: "单比特相位门，使用 lambda 参数。",
  cx: "受控 X 门，控制位为 1 时翻转目标位。",
  cy: "受控 Y 门，控制位为 1 时对目标位施加 Y。",
  ch: "受控 H 门，控制位为 1 时对目标位施加 Hadamard。",
  cp: "受控相位门，控制位为 1 时施加相位。",
  cz: "受控 Z 门，控制位为 1 时对目标位施加 Z。",
  ccx: "双控制 X 门，也就是 Toffoli 门。",
  ccz: "双控制 Z 门，两个控制位都为 1 时施加 Z。",
  swap: "交换两个量子比特的状态。",
  cswap: "受控交换门，也就是 Fredkin 门。",
  rxx: "双比特 XX 旋转门，参数为 theta。",
  ryy: "双比特 YY 旋转门，参数为 theta。",
  rzz: "双比特 ZZ 旋转门，参数为 theta。",
  rzx: "双比特 ZX 旋转门，参数为 theta。",
  m: "测量门，将量子态投影到经典结果。",
});

function renderMatrixLatex(latex: string): string {
  return katex.renderToString(latex, {
    displayMode: true,
    output: "html",
    throwOnError: false,
    strict: "ignore",
  });
}

function GateMatrixTooltip({ gate, accentColor }: GateMatrixTooltipProps) {
  const preview = getGateMatrixPreview(gate);
  const item = getGateCatalogItem(gate);
  const qubitCount = item.controlCount + item.targetCount;
  const matrixMarkup = renderMatrixLatex(preview.latex);

  return (
    <div
      role="tooltip"
      data-testid={`gate-matrix-tooltip-${gate}`}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        zIndex: 20,
        pointerEvents: "none",
        width: "max-content",
        maxWidth: "min(420px, calc(100vw - 32px))",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        background: "var(--surface-panel)",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
        padding: "8px 10px",
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 4,
          color: accentColor,
          fontSize: 12,
          lineHeight: 1.3,
        }}
      >
        {item.label} 门
      </strong>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: "var(--text-primary)" }}>
        {GATE_DESCRIPTIONS[gate]}
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 11, lineHeight: 1.35, color: "var(--text-secondary)" }}>
        作用于 {qubitCount} 个量子比特。
      </p>
      <div
        data-testid={`gate-matrix-formula-${gate}`}
        style={{
          marginTop: 6,
          color: "var(--text-primary)",
          fontSize: 11,
          lineHeight: 1.2,
          overflowX: "auto",
          overflowY: "hidden",
          maxWidth: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: matrixMarkup }}
      />
    </div>
  );
}

export default GateMatrixTooltip;
