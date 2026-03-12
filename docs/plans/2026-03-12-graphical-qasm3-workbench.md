# Graphical QASM3 Workbench Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在前端实现“拖拽构建量子电路 + 可编辑 OpenQASM 3 + 浏览器本地实时仿真 + 基态概率直方图”的主工作台，并保留旧代码提交流程为独立入口。

**Architecture:** 采用前端本地执行架构：`CircuitModel` 作为唯一真源，`QasmBridge` 负责双向转换，`SimulationWorker` 负责计算，主线程仅负责 UI 与状态编排。通过复杂度限制和显式错误通路保障交互性能与可调试性。

**Tech Stack:** React 18 + TypeScript + Vite + Vitest + Monaco + ECharts + Web Worker。

---

### Task 1: 建立电路领域模型与复杂度守卫

**Files:**
- Create: `frontend/src/features/circuit/model/types.ts`
- Create: `frontend/src/features/circuit/model/circuit-model.ts`
- Create: `frontend/src/features/circuit/model/complexity-guard.ts`
- Test: `frontend/src/tests/circuit-complexity.test.ts`

**Step 1: 写失败测试（复杂度上限与深度计算）**

```ts
import { evaluateComplexity } from "../features/circuit/model/complexity-guard";

it("rejects circuit when qubits > 10", () => {
  const result = evaluateComplexity({ numQubits: 11, operations: [] });
  expect(result.ok).toBe(false);
  expect(result.code).toBe("QUBIT_LIMIT_EXCEEDED");
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- circuit-complexity.test.ts`  
Expected: FAIL with module/function missing.

**Step 3: 最小实现**

```ts
export const MAX_QUBITS = 10;
export const MAX_DEPTH = 200;
export const MAX_GATES = 1000;
```

补齐：
1. `CircuitModel` 基础类型与不可变更新工具。
2. 深度计算函数（按 `layer` 最大值推导）。
3. 复杂度评估函数返回 `{ ok, code?, details }`。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- circuit-complexity.test.ts`  
Expected: PASS.

### Task 2: 实现概率过滤与统计模块

**Files:**
- Create: `frontend/src/features/circuit/simulation/probability-filter.ts`
- Test: `frontend/src/tests/probability-filter.test.ts`

**Step 1: 写失败测试（epsilon 与隐藏计数）**

```ts
import { filterProbabilities } from "../features/circuit/simulation/probability-filter";

it("filters low-probability states using epsilon=2^-(n+2)", () => {
  const result = filterProbabilities(3, { "000": 0.5, "001": 0.01, "111": 0.49 });
  expect(result.hiddenCount).toBeGreaterThanOrEqual(0);
  expect(result.visible["000"]).toBe(0.5);
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- probability-filter.test.ts`  
Expected: FAIL.

**Step 3: 最小实现**

```ts
const epsilon = 2 ** -(numQubits + 2);
```

补齐：
1. 过滤 `p <= epsilon`。
2. 输出 `totalCount/visibleCount/hiddenCount/probabilitySum`。
3. 对浮点和异常值（负值、NaN）显式报错。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- probability-filter.test.ts`  
Expected: PASS.

### Task 3: 实现 OpenQASM 3 子集双向桥接

**Files:**
- Create: `frontend/src/features/circuit/qasm/qasm-bridge.ts`
- Create: `frontend/src/features/circuit/qasm/qasm-errors.ts`
- Test: `frontend/src/tests/qasm-bridge.test.ts`

**Step 1: 写失败测试（左->右与右->左）**

```ts
it("serializes circuit model to normalized OpenQASM 3", () => {
  const qasm = toQasm3(sampleCircuit);
  expect(qasm).toContain('OPENQASM 3;');
  expect(qasm).toContain('include "stdgates.inc";');
});

it("rejects invalid qasm and returns line-aware error", () => {
  const parsed = fromQasm3("OPENQASM 3; bad syntax;");
  expect(parsed.ok).toBe(false);
  expect(parsed.error?.line).toBeDefined();
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- qasm-bridge.test.ts`  
Expected: FAIL.

**Step 3: 最小实现**

```ts
export function toQasm3(model: CircuitModel): string {}
export function fromQasm3(source: string): ParseResult {}
```

补齐：
1. 支持约定子集语句。
2. 非法语法/不支持门返回结构化错误。
3. `u1/u2/u3` 做兼容解析和内部归一化。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- qasm-bridge.test.ts`  
Expected: PASS.

### Task 4: 实现浏览器仿真 Worker 与调度器

**Files:**
- Create: `frontend/src/features/circuit/simulation/simulation-worker.ts`
- Create: `frontend/src/features/circuit/simulation/simulation-client.ts`
- Create: `frontend/src/features/circuit/simulation/scheduler.ts`
- Test: `frontend/src/tests/simulation-scheduler.test.ts`

**Step 1: 写失败测试（取消旧任务和超时）**

```ts
it("drops stale worker result when a newer version exists", async () => {
  const result = await runScheduledSimulation(...);
  expect(result.version).toBe(latestVersion);
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- simulation-scheduler.test.ts`  
Expected: FAIL.

**Step 3: 最小实现**

```ts
const DEBOUNCE_MS = 200;
const SIM_TIMEOUT_MS = 1000;
```

补齐：
1. Worker 消息协议（request/result/error）。
2. 调度版本号机制（防止旧结果覆盖新结果）。
3. 超时与取消错误码标准化。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- simulation-scheduler.test.ts`  
Expected: PASS.

### Task 5: 构建图形化编辑核心 UI（左栏）

**Files:**
- Create: `frontend/src/components/circuit/GatePalette.tsx`
- Create: `frontend/src/components/circuit/CircuitCanvas.tsx`
- Create: `frontend/src/components/circuit/CircuitToolbar.tsx`
- Test: `frontend/src/tests/circuit-canvas.test.tsx`

**Step 1: 写失败测试（拖拽添加门）**

```tsx
it("adds gate to canvas when dropped", async () => {
  // 模拟拖拽 X 门到 q0/layer0
  expect(onChange).toHaveBeenCalled();
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- circuit-canvas.test.tsx`  
Expected: FAIL.

**Step 3: 最小实现**

补齐：
1. 门库分组与拖拽数据结构。
2. 画布按 qubit/layer 渲染网格。
3. 支持删除门与参数编辑。
4. 所有变更通过 `onCircuitChange` 上抛。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- circuit-canvas.test.tsx`  
Expected: PASS.

### Task 6: 构建 QASM 编辑器与错误面板（右栏）

**Files:**
- Create: `frontend/src/components/circuit/QasmEditorPane.tsx`
- Create: `frontend/src/components/circuit/QasmErrorPanel.tsx`
- Test: `frontend/src/tests/qasm-editor-pane.test.tsx`

**Step 1: 写失败测试（非法 QASM 不同步）**

```tsx
it("keeps previous circuit when qasm parse fails", async () => {
  // 输入非法语句后，expect(onValidQasmChange).not.toHaveBeenCalled()
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- qasm-editor-pane.test.tsx`  
Expected: FAIL.

**Step 3: 最小实现**

补齐：
1. Monaco 文本编辑与 200ms 防抖回调。
2. 解析成功/失败分支。
3. 行号+错误消息展示。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- qasm-editor-pane.test.tsx`  
Expected: PASS.

### Task 7: 构建工作台页面与路由拆分

**Files:**
- Create: `frontend/src/pages/CircuitWorkbenchPage.tsx`
- Modify: `frontend/src/pages/TasksPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/tests/workbench-route.test.tsx`

**Step 1: 写失败测试（新旧入口并存）**

```tsx
it("routes /tasks/circuit and /tasks/code correctly under protected route", () => {
  // 验证两个页面可访问
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- workbench-route.test.tsx`  
Expected: FAIL.

**Step 3: 最小实现**

补齐：
1. `/tasks` 默认跳转 `/tasks/circuit`。
2. 旧 `TasksPage` 迁移为代码模式页面（`/tasks/code`）。
3. 新页面挂载左栏、右栏、图表区、状态提示区。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- workbench-route.test.tsx`  
Expected: PASS.

### Task 8: 集成概率图与端到端行为校验

**Files:**
- Modify: `frontend/src/components/ResultChart.tsx`
- Create: `frontend/src/tests/workbench-integration.test.tsx`

**Step 1: 写失败测试（过滤显示与统计提示）**

```tsx
it("renders only states above epsilon and shows hidden count", async () => {
  // 断言图表数据与隐藏态计数文案
});
```

**Step 2: 运行测试验证失败**

Run: `npm run test -- workbench-integration.test.tsx`  
Expected: FAIL.

**Step 3: 最小实现**

补齐：
1. 接收过滤后数据并绘图。
2. 展示总态数/渲染态数/隐藏态数/概率和。
3. 全部隐藏时展示空态提示。

**Step 4: 再次运行测试验证通过**

Run: `npm run test -- workbench-integration.test.tsx`  
Expected: PASS.

### Task 9: 回归测试与文档更新

**Files:**
- Modify: `README.md`
- Modify: `docs/project-status-and-usage.md`
- Test: `frontend/src/tests/protected-route.test.tsx`

**Step 1: 写失败测试（若有路由改动引发回归）**

```tsx
it("still redirects unauthenticated users to /login", () => {
  // 保证鉴权行为未破坏
});
```

**Step 2: 运行测试验证失败（或确认现有用例覆盖不足）**

Run: `npm run test -- protected-route.test.tsx`  
Expected: FAIL or missing assertion before update.

**Step 3: 最小实现**

补齐：
1. 更新 README 的新入口与使用说明。
2. 更新项目状态文档中的交互链路描述。
3. 修正或补充鉴权回归测试断言。

**Step 4: 全量前端测试与构建验证**

Run: `npm run test`  
Expected: PASS.

Run: `npm run build`  
Expected: Build success.

