import { getGateMatrixPreview } from "../../features/circuit/gates/gate-matrix-preview";
import type { GateName } from "../../features/circuit/model/types";

interface GateMatrixTooltipProps {
  readonly gate: GateName;
  readonly accentColor: string;
}

const GATE_DESCRIPTIONS: Readonly<Record<GateName, string>> = Object.freeze({
  i: "保持量子态不变，常用于占位或对齐电路层。",
  x: "实现比特翻转，将 |0> 与 |1> 互换。",
  y: "绕 Y 轴旋转 pi，包含相位变化与比特翻转。",
  z: "绕 Z 轴旋转 pi，仅改变相位不改测量概率。",
  h: "创建叠加态，将基态映射到均匀叠加。",
  s: "相位门，对 |1> 态施加 pi/2 相位。",
  sdg: "S 门的逆操作，对 |1> 态施加 -pi/2 相位。",
  t: "对 |1> 态施加 pi/4 相位，常用于容错门集。",
  tdg: "T 门的逆操作，对 |1> 态施加 -pi/4 相位。",
  rx: "按参数 theta 绕 X 轴旋转。",
  ry: "按参数 theta 绕 Y 轴旋转。",
  rz: "按参数 theta 绕 Z 轴旋转。",
  u: "通用单比特门，可表示任意单比特旋转。",
  p: "相位门，对 |1> 态施加可调相位 lambda。",
  cx: "受控非门，控制位为 1 时翻转目标位。",
  cp: "受控相位门，控制位为 1 时对目标态施加相位。",
  cz: "受控 Z 门，控制位与目标位同时为 1 时施加负相位。",
  ccx: "Toffoli 门，两个控制位为 1 时翻转目标位。",
  swap: "交换两个量子位的状态。",
  m: "测量门，将量子态投影到经典比特结果。",
});

function GateMatrixTooltip({ gate, accentColor }: GateMatrixTooltipProps) {
  const preview = getGateMatrixPreview(gate);
  const description = GATE_DESCRIPTIONS[gate];

  return (
    <div
      role="tooltip"
      data-testid={`gate-matrix-tooltip-${gate}`}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        zIndex: 20,
        width: 300,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
        padding: 12,
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 10,
          color: accentColor,
          fontSize: 14,
        }}
      >
        {preview.title}
      </strong>

      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#334155" }}>
          Matrix:
        </div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            lineHeight: 1.4,
            color: "#0f172a",
          }}
        >
          {preview.body}
        </pre>
      </div>

      <div>
        <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#334155" }}>
          Description:
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#334155" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export default GateMatrixTooltip;

