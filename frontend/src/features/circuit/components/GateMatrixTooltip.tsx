import { useMemo } from "react";
import katex from "katex";

import { getGateMatrixPreview } from "../gates/gate-matrix-preview";
import type { GateName } from "../model/types";

interface GateMatrixTooltipProps {
  readonly gate: GateName;
  readonly accentColor: string;
}

const GATE_NAMES_ZH: Readonly<Record<GateName, string>> = Object.freeze({
  i: "恒等门 I",
  x: "泡利 X 门",
  y: "泡利 Y 门",
  z: "泡利 Z 门",
  h: "Hadamard 门",
  s: "S 相位门",
  sdg: "S 逆门",
  t: "T 相位门",
  tdg: "T 逆门",
  rx: "RX 旋转门",
  ry: "RY 旋转门",
  rz: "RZ 旋转门",
  u: "U 通用门",
  p: "P 相位门",
  cx: "CX 受控非门",
  cp: "CP 受控相位门",
  cz: "CZ 受控 Z 门",
  ccx: "CCX Toffoli 门",
  swap: "SWAP 交换门",
  m: "测量门 M",
});

function GateMatrixTooltip({ gate, accentColor }: GateMatrixTooltipProps) {
  const preview = getGateMatrixPreview(gate);
  const matrixHtml = useMemo(
    () =>
      katex.renderToString(preview.matrixLatex, {
        throwOnError: false,
        displayMode: true,
        strict: "ignore",
      }),
    [preview.matrixLatex],
  );

  return (
    <div
      role="tooltip"
      data-testid={`gate-matrix-tooltip-${gate}`}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        zIndex: 20,
        width: 228,
        border: "1px solid #dbe3ee",
        borderRadius: 8,
        background: "#fff",
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
        padding: 8,
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
        {GATE_NAMES_ZH[gate]}
      </strong>

      <p
        style={{
          margin: "0 0 4px",
          fontSize: 11,
          lineHeight: 1.35,
          color: "#1f2937",
        }}
      >
        {preview.descriptionZh}
      </p>

      <p
        style={{
          margin: "0 0 6px",
          fontSize: 11,
          lineHeight: 1.3,
          color: "#475569",
        }}
      >
        作用于 {preview.qubitCount} 个量子比特
      </p>

      <div
        style={{
          overflowX: "auto",
          fontSize: 11,
          lineHeight: 1.2,
          color: "#0f172a",
        }}
        dangerouslySetInnerHTML={{ __html: matrixHtml }}
      />
    </div>
  );
}

export default GateMatrixTooltip;
