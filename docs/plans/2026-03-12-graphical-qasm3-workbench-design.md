# 图形化量子编程工作台（OpenQASM 3）设计文档

**日期：**2026-03-12  
**状态：**已确认（待进入 spec-workflow Requirements 阶段）

## 1. 背景与目标

当前 MVP 交互链路是“提交 Python 代码 -> 后端异步执行 -> 返回结果 -> 绘制直方图”。目标升级为 IBM 类基础体验：

1. 用户通过拖拽量子门构建线路，而非以代码编辑为主入口。
2. 前端每次电路变更都在浏览器本地触发实时仿真。
3. 结果展示为全部 `2^n` 基态分布，但按阈值过滤低概率态。
4. 页面采用双栏：左侧图形电路，右侧可编辑 OpenQASM 3，并支持双向同步。
5. 保留现有代码编辑模式，迁移为独立页面入口。

## 2. 明确边界（MVP）

### 2.1 必做

1. 图形化量子线路编辑（拖拽/删除/参数编辑）。
2. OpenQASM 3 可编辑文本视图。
3. 左右双向同步。
4. 浏览器本地实时仿真（Web Worker）。
5. 基态概率直方图渲染与过滤。
6. 复杂度硬限制与可解释错误提示。

### 2.2 暂不做

1. 真机执行或后端仿真兜底。
2. 多人协作、共享编辑。
3. OpenQASM 3 全语法支持（只做约定子集）。
4. 噪声模型与高级可视化分析。

## 3. 关键产品约束

1. 本地执行约束：不依赖后端执行仿真。
2. 复杂度限制：
   - `qubits <= 10`
   - `depth <= 200`
   - `total_gates <= 1000`
3. 图表过滤阈值：`epsilon = 2^-(n+2)`（`n` 为 qubit 数）。
4. 非法 QASM 处理：拒绝同步，左侧保持上一次有效电路状态。
5. 门集分层：
   - P0：`I, X, Y, Z, H, S, SDG, T, TDG, RX, RY, RZ, U, CX, CZ, SWAP, M`
   - P1：`CRX, CRY, CRZ, CU1/CU2/CU3(映射), TOFFOLI(CCX)`
   - P2：`fSim, C^n NOT (n > 2)`（后续）

## 4. 架构设计

## 4.1 页面与路由

1. 新增主页面：`/tasks/circuit`
2. 保留旧页面：`/tasks/code`
3. 两个页面共享现有登录态与导航体系。

## 4.2 前端模块拆分

1. `CircuitWorkbenchPage`：页面编排与状态聚合。
2. `GatePalette`：门库面板与拖拽源。
3. `CircuitCanvas`：线路画布、层结构编辑、门参数编辑。
4. `QasmEditorPane`：OpenQASM 3 可编辑器与语法错误展示。
5. `ProbabilityHistogram`：基态概率可视化与统计信息展示。
6. `useCircuitWorkbench`：统一状态机与调度逻辑。

## 4.3 核心服务层

1. `CircuitModel`：电路唯一真源（内存对象）。
2. `QasmBridge`：`CircuitModel <-> OpenQASM 3 子集` 转换。
3. `ComplexityGuard`：复杂度评估与限额校验。
4. `SimulationWorker`：Web Worker 内部仿真执行。
5. `SimulationScheduler`：防抖、取消、超时控制。

## 5. 数据模型

```ts
type GateName =
  | "i" | "x" | "y" | "z" | "h" | "s" | "sdg" | "t" | "tdg"
  | "rx" | "ry" | "rz" | "u"
  | "cx" | "cz" | "swap"
  | "m";

interface Operation {
  id: string;
  gate: GateName;
  targets: number[];
  controls?: number[];
  params?: number[];
  layer: number;
}

interface CircuitModel {
  numQubits: number;
  operations: Operation[];
}
```

约束：

1. `targets` 与 `controls` 不得重叠。
2. 参数门参数数量固定（如 `rx/ry/rz` 为 1，`u` 为 3）。
3. `layer` 单调非降，用于深度计算与渲染排序。

## 6. OpenQASM 3 子集规范

## 6.1 支持语法

1. 头部：
   - `OPENQASM 3;`
   - `include "stdgates.inc";`
2. 寄存器声明：
   - `qubit[n] q;`
   - `bit[n] c;`
3. 门调用：
   - 单比特：`x q[0];`
   - 双比特：`cx q[0], q[1];`
   - 参数门：`rz(theta) q[1];`、`u(a,b,c) q[0];`
4. 测量：
   - `c[i] = measure q[i];`

## 6.2 暂不支持

1. 自定义 gate、`defcal`、控制流、循环、经典寄存器运算。
2. `fSim`、任意 `C^n NOT(n>2)`。

## 6.3 别名策略

1. 接受 `u1/u2/u3` 输入，但转换为内部统一表示。
2. 输出 QASM 时使用规范化格式，避免无意义文本抖动。

## 7. 同步与执行时序

1. 左侧编辑 -> 更新 `CircuitModel` -> 生成 QASM -> 调度仿真。
2. 右侧编辑 -> 防抖触发解析：
   - 解析成功：覆盖 `CircuitModel` -> 调度仿真
   - 解析失败：错误面板提示，左侧不变，不触发仿真
3. 仿真调度：
   - 防抖：200ms
   - 取消策略：新任务到来即取消旧任务
   - 超时：1s（软超时，显示明确错误）
4. 主线程职责：UI 交互与渲染；Worker 职责：纯计算。

## 8. 概率图表规则

1. 输入：完整基态概率分布（长度 `2^n`）。
2. 过滤：仅显示 `p > 2^-(n+2)` 的态。
3. 必须展示统计：
   - 总态数
   - 渲染态数
   - 隐藏态数
   - 概率和（校验可解释性）
4. 若全部被过滤，显示“当前阈值下无可见态”。

## 9. 错误处理原则

1. 不做静默降级，不做伪成功。
2. 错误可定位：至少包含类型、消息、行号（QASM 解析错误场景）。
3. 复杂度超限显示“当前值/上限值”。
4. 仿真失败不清空上次成功图表，但当前状态标记为失败。

## 10. 验收标准

1. 拖拽构建电路后自动触发本地仿真并更新直方图。
2. 右侧 QASM 合法编辑可反向同步左侧电路。
3. 右侧 QASM 非法编辑不影响左侧上一次有效状态。
4. 复杂度限制生效且错误信息清晰。
5. 页面提供 `/tasks/circuit` 与 `/tasks/code` 双入口，不破坏现有鉴权流程。

