# Tasks Document

- [x] 1. 重排工作台页面区块顺序为 Editor -> Result -> Submit
  - File: `frontend/src/pages/CircuitWorkbenchPage.tsx`
  - 调整渲染顺序，确保结果区紧邻编辑区下方，提交区紧邻结果区下方。
  - 保持项目面板能力不丢失，放在提交区后。
  - _Leverage: 现有 `CircuitWorkbenchPage` 的状态编排与组件接线_
  - _Requirements: Requirement 1, Requirement 2_
  - _Prompt: Implement the task for spec workbench-p0-layout-qubit-sim-decoupling, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Layout Engineer | Task: Reorder the workbench layout to Editor -> Result -> Submit while preserving existing project panel behavior and state wiring in CircuitWorkbenchPage | Restrictions: Do not change backend API calls; do not remove existing submit/result state rendering; keep routing links functional | _Leverage: existing CircuitWorkbenchPage component composition | _Requirements: Requirement 1, Requirement 2 | Success: UI order is stable after render and re-render, result panel is directly below editor, submit panel is directly below result | Instructions: 将当前任务在 tasks.md 中从 [ ] 改为 [-] 后再开始实现；实现完成并验证后，调用 log-implementation 记录产物；最后将该任务从 [-] 改为 [x]_

- [x] 2. 增加 qubit 调整模型工具与边界规则
  - File: `frontend/src/features/circuit/model/circuit-model.ts`, `frontend/src/features/circuit/model/types.ts`
  - 新增增减 qubit 的纯函数与边界类型，支持越界检测。
  - 明确最小/最大 qubit 边界常量，避免魔法数字。
  - _Leverage: 现有 `CircuitModel` 与操作集合模型_
  - _Requirements: Requirement 3_
  - _Prompt: Implement the task for spec workbench-p0-layout-qubit-sim-decoupling, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Model Engineer | Task: Add immutable qubit increment/decrement model utilities with explicit min/max boundaries and out-of-range operation detection | Restrictions: Do not mutate existing model objects; do not couple utilities to React state; keep function signatures concise and typed | _Leverage: existing CircuitModel types and circuit-model helpers | _Requirements: Requirement 3 | Success: model utilities can safely grow/shrink qubits, correctly reject unsafe shrink operations, and expose deterministic boundary feedback | Instructions: 将当前任务在 tasks.md 中从 [ ] 改为 [-] 后再开始实现；实现完成并验证后，调用 log-implementation 记录产物；最后将该任务从 [-] 改为 [x]_

- [x] 3. 在工作台接入 +Qubit/-Qubit 控件与提示
  - File: `frontend/src/components/circuit/WorkbenchToolbar.tsx`, `frontend/src/pages/CircuitWorkbenchPage.tsx`
  - 在工具栏新增 qubit 控件，接入模型工具函数，展示禁用原因提示。
  - 降 qubit 触发越界时阻止修改并显示显式文案。
  - _Leverage: 现有 `WorkbenchToolbar` 交互模式与 `pushCircuit` 更新路径_
  - _Requirements: Requirement 3_
  - _Prompt: Implement the task for spec workbench-p0-layout-qubit-sim-decoupling, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Interaction Engineer | Task: Add +Qubit/-Qubit controls to toolbar and wire them to circuit model updates with clear boundary/blocked messages | Restrictions: Do not bypass history update path; do not silently ignore blocked operations; keep control behavior deterministic under rapid clicks | _Leverage: existing WorkbenchToolbar and pushCircuit state flow | _Requirements: Requirement 3 | Success: users can increase/decrease qubits within bounds, blocked shrink shows explicit reason, canvas row count updates with circuit state | Instructions: 将当前任务在 tasks.md 中从 [ ] 改为 [-] 后再开始实现；实现完成并验证后，调用 log-implementation 记录产物；最后将该任务从 [-] 改为 [x]_

- [x] 4. 解耦本地模拟限制与提交限制
  - File: `frontend/src/features/circuit/model/complexity-guard.ts`, `frontend/src/features/circuit/submission/use-workbench-task-submit.ts`, `frontend/src/pages/CircuitWorkbenchPage.tsx`
  - 将 `numQubits > 10` 仅作为本地模拟门禁，不作为提交阻塞条件。
  - 在结果区显示“可提交但不支持实时模拟”提示。
  - _Leverage: 现有 `evaluateComplexity`、`runSimulation`、`resolveSubmitBlockReason`_
  - _Requirements: Requirement 4_
  - _Prompt: Implement the task for spec workbench-p0-layout-qubit-sim-decoupling, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Runtime Engineer | Task: Decouple simulation guard from submit guard so qubit > 10 disables local simulation only while keeping submit path available | Restrictions: Do not introduce silent fallback; do not alter backend submit payload format; preserve existing parse/validation submit blocks | _Leverage: existing complexity guard, runSimulation flow, and submit hook | _Requirements: Requirement 4 | Success: qubit > 10 shows explicit non-simulatable message, local histogram not computed, submit remains enabled and functional | Instructions: 将当前任务在 tasks.md 中从 [ ] 改为 [-] 后再开始实现；实现完成并验证后，调用 log-implementation 记录产物；最后将该任务从 [-] 改为 [x]_

- [x] 5. 补充单元与集成测试覆盖 P0 行为
  - File: `frontend/src/tests/workbench-page.test.tsx`, `frontend/src/tests/*`（必要时新增针对模型工具与门禁函数的测试）
  - 覆盖布局顺序、qubit 控件行为、`>10` 模拟禁用但可提交的关键场景。
  - _Leverage: 现有 workbench 与模型测试模式_
  - _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4_
  - _Prompt: Implement the task for spec workbench-p0-layout-qubit-sim-decoupling, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Test Engineer | Task: Add/adjust tests for layout order, qubit controls, and simulation-submit decoupling behavior including qubit > 10 scenarios | Restrictions: Do not assert implementation details tied to internal ref names; focus on user-observable behavior; keep tests deterministic | _Leverage: existing workbench-page and model test suites | _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4 | Success: tests fail before behavior and pass after implementation, covering positive and blocked-path scenarios | Instructions: 将当前任务在 tasks.md 中从 [ ] 改为 [-] 后再开始实现；实现完成并验证后，调用 log-implementation 记录产物；最后将该任务从 [-] 改为 [x]_

- [x] 6. 更新使用文档中的工作台行为说明
  - File: `docs/project-usage-guide.md`
  - 更新图形化工作台说明，写明 qubit 控件与 `>10` 本地模拟限制规则。
  - _Leverage: 当前项目使用指南内容结构_
  - _Requirements: Requirement 4_
  - _Prompt: Implement the task for spec workbench-p0-layout-qubit-sim-decoupling, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Documentation Engineer | Task: Update project usage guide to reflect new workbench layout and qubit/simulation behavior, especially qubit > 10 local simulation limitation semantics | Restrictions: Do not document unimplemented features; keep terminology aligned with UI labels; avoid ambiguous wording between local simulation and backend execution | _Leverage: existing docs/project-usage-guide.md | _Requirements: Requirement 4 | Success: guide clearly states qubit controls and that >10 disables local simulation only while backend submission remains supported | Instructions: 将当前任务在 tasks.md 中从 [ ] 改为 [-] 后再开始实现；实现完成并验证后，调用 log-implementation 记录产物；最后将该任务从 [-] 改为 [x]_
