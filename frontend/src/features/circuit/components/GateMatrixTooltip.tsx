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
  i: "保持量子状态不变。",
  x: "对量子比特执行比特翻转。",
  y: "同时引入比特翻转和相位变化。",
  z: "对量子态执行相位翻转。",
  h: "将量子比特变为叠加态。",
  s: "施加四分之一周期相位。",
  sdg: "施加 S 门的逆相位。",
  t: "施加八分之一周期相位。",
  tdg: "施加 T 门的逆相位。",
  rx: "绕 X 轴执行旋转。",
  ry: "绕 Y 轴执行旋转。",
  rz: "绕 Z 轴执行旋转。",
  u: "执行通用单比特旋转。",
  p: "施加可调相位偏移。",
  cx: "控制位为 1 时翻转目标位。",
  cp: "控制位为 1 时施加相位。",
  cz: "控制位为 1 时施加 Z 相位翻转。",
  ccx: "两个控制位同时满足时翻转目标位。",
  swap: "交换两个量子比特的状态。",
  m: "将量子态投影到测量结果。",
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
        width: "max-content",
        maxWidth: "min(420px, calc(100vw - 32px))",
        border: "1px solid #dbe5f0",
        borderRadius: 8,
        background: "#fff",
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
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: "#1f2937" }}>
        {GATE_DESCRIPTIONS[gate]}
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 11, lineHeight: 1.35, color: "#475569" }}>
        作用于 {qubitCount} 个量子比特。
      </p>
      <div
        data-testid={`gate-matrix-formula-${gate}`}
        style={{
          marginTop: 6,
          color: "#0f172a",
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
