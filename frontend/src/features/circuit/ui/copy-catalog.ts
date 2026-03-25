export const WORKBENCH_COPY = {
  toolbar: {
    undo: "撤销",
    redo: "重做",
    clearCircuit: "清空电路",
    resetWorkbench: "重置工作台",
    templateLabel: "模板",
    bellTemplate: "Bell 态",
    superpositionTemplate: "均匀叠加态",
    executionGateCountLabel: "时间步",
    executionGateCountAriaLabel: "执行门时间步滑块",
    executionGateCountValuePrefix: "执行前",
    executionGateCountValueUnit: "个门",
    zoomOutAriaLabel: "缩小画布",
    zoomInAriaLabel: "放大画布",
    zoomResetAriaLabel: "重置缩放",
  },
  submitPanel: {
    submit: "提交任务",
    submitting: "提交中...",
    taskId: "任务 ID",
    taskStatus: "任务状态",
    elapsed: "已耗时",
    seconds: "秒",
    deduplicatedHint: "检测到重复提交，系统已复用已有任务。",
  },
  qasmErrorPanel: {
    code: "错误码",
    column: "列",
    suggestion: "建议",
  },
  canvas: {
    suggestion: "建议",
  },
  editor: {
    maxQubitReached: "已达到最大量子比特限制，无法继续增加。",
    shrinkBlockedByOperation:
      "当前电路中存在使用高位量子比特的操作，请先删除相关门再减少 qubit。",
    minQubitReached: "已达到最小量子比特限制，无法继续减少。",
  },
  simulation: {
    validationFailedPrefix: "电路校验失败：",
    complexityTooHighPrefix: "本地模拟复杂度过高",
    simulationFailedPrefix: "本地模拟失败：",
  },
} as const;

