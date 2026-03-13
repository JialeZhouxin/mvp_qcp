import type {
  QasmParseError,
  QasmParseErrorCode,
} from "../qasm/qasm-errors";

export type SimulationUiState = "IDLE" | "RUNNING" | "READY" | "ERROR";

export interface LocalizedMessage {
  readonly title: string;
  readonly detail: string;
  readonly suggestion?: string;
}

export type CanvasMessageCode =
  | "CELL_OCCUPIED"
  | "PENDING_TWO_QUBIT"
  | "LAYER_MISMATCH"
  | "SAME_QUBIT"
  | "INVALID_PARAM"
  | "VALIDATION_ERROR";

interface CanvasMessageContext {
  readonly qubit?: number;
  readonly layer?: number;
  readonly gate?: string;
  readonly sourceQubit?: number;
  readonly reason?: string;
}

const SIMULATION_STATE_LABELS: Record<SimulationUiState, string> = {
  IDLE: "等待仿真",
  RUNNING: "仿真中...",
  READY: "结果已更新",
  ERROR: "仿真失败",
};

function getQasmSuggestion(code: QasmParseErrorCode): string {
  switch (code) {
    case "MISSING_HEADER":
      return "请在文件开头补充 OPENQASM 3;。";
    case "MISSING_DECLARATION":
      return "请先声明量子位，例如 qubit[2] q;。";
    case "INVALID_SYNTAX":
      return "请检查分号、括号和语句顺序。";
    case "INVALID_CIRCUIT":
      return "请检查量子位索引、层次和门参数是否有效。";
    case "INVALID_PARAMETER":
      return "请确认参数是有限实数。";
    case "INVALID_OPERAND":
      return "请确认门操作数格式，例如 q[0]。";
    case "UNSUPPORTED_STATEMENT":
      return "请删除当前不支持的语句，仅保留支持的门操作。";
    case "UNSUPPORTED_GATE":
      return "请改用当前工作台支持的门集合。";
    default:
      return "请修正语法后重试。";
  }
}

export function toSimulationStateLabel(state: SimulationUiState): string {
  return SIMULATION_STATE_LABELS[state];
}

export function toCanvasMessage(
  code: CanvasMessageCode,
  context: CanvasMessageContext = {},
): LocalizedMessage {
  if (code === "CELL_OCCUPIED") {
    return {
      title: "无法放置量子门",
      detail: `q${context.qubit ?? 0} 的第 ${context.layer ?? 0} 层已存在操作。`,
      suggestion: "请删除当前门或选择其他空白格。",
    };
  }
  if (code === "PENDING_TWO_QUBIT") {
    return {
      title: "等待选择目标量子位",
      detail: `正在放置 ${String(context.gate ?? "").toUpperCase()}，源位 q${
        context.sourceQubit ?? 0
      }，层 ${context.layer ?? 0}。`,
      suggestion: "请在同一层选择另一个量子位完成放置。",
    };
  }
  if (code === "LAYER_MISMATCH") {
    return {
      title: "目标层不正确",
      detail: "第二步必须与第一步在同一层。",
      suggestion: "请点击与第一步相同层的目标量子位。",
    };
  }
  if (code === "SAME_QUBIT") {
    return {
      title: "目标量子位无效",
      detail: "双比特门的控制位和目标位不能是同一个量子位。",
      suggestion: "请选择另一个量子位作为目标位。",
    };
  }
  if (code === "INVALID_PARAM") {
    return {
      title: "参数无效",
      detail: "门参数必须是有限数值。",
      suggestion: "请填写合法数值，例如 0、1.57 或 -3.14。",
    };
  }
  return {
    title: "线路校验失败",
    detail: context.reason ?? "线路不满足约束。",
    suggestion: "请检查线路结构后重试。",
  };
}

export function toQasmErrorMessage(error: QasmParseError): LocalizedMessage {
  return {
    title: "QASM 解析错误",
    detail: `第 ${error.line} 行：${error.message}`,
    suggestion: getQasmSuggestion(error.code),
  };
}
