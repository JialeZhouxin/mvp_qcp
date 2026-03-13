# Design Document

## Overview

本设计为图形化工作台新增 P0 级“任务提交闭环”能力。核心目标是在不改变现有后端任务接口的前提下，将前端当前线路（`CircuitModel`）转换为可执行 Python/Qibo 脚本并提交，随后在同一页面展示任务标识与状态，且通过 `Idempotency-Key` 防止重复提交。

## Steering Document Alignment

### Technical Standards (tech.md)
当前项目未提供 `tech.md`。本设计遵循仓库既有技术基线：React + TypeScript 前端分层（`api` / `features` / `components` / `pages`）、显式错误暴露、无静默 fallback。

### Project Structure (structure.md)
当前项目未提供 `structure.md`。本设计延续现有目录模式：
- API 调整放在 `frontend/src/api/tasks.ts`
- 提交转换与幂等逻辑放在 `frontend/src/features/circuit/submission/`
- 工作台 UI 组合放在 `frontend/src/components/circuit/`
- 页面编排保持在 `frontend/src/pages/CircuitWorkbenchPage.tsx`

## Code Reuse Analysis

### Existing Components to Leverage
- **`submitTask/getTaskStatus` (`frontend/src/api/tasks.ts`)**: 复用现有任务接口，仅扩展 header 入参与返回字段。
- **`toQasm3` 与 `CircuitModel` 类型**: 复用已有线路标准化与数据模型，避免双模型漂移。
- **`toErrorMessage`**: 复用统一错误提取逻辑，保持错误展示一致性。
- **`evaluateComplexity` 与 `parseError` 状态**: 复用现有提交前可判定约束，阻断无效请求。

### Integration Points
- **`POST /api/tasks/submit`**: 新增 `Idempotency-Key` 请求头传递，不修改后端路由与请求体结构。
- **`GET /api/tasks/{task_id}`**: 复用任务状态查询接口为“刷新状态”按钮服务。
- **工作台页面状态机**: 提交态独立于本地模拟态，避免两者相互污染。

## Architecture

设计采用“页面编排 + 领域工具 + API 封装”的轻量架构，避免将脚本生成和幂等算法塞进 JSX 层。

### Modular Design Principles
- **Single File Responsibility**: 脚本生成、幂等键计算、UI 展示、页面事件编排分离。
- **Component Isolation**: 新增提交面板组件承载按钮/状态文案/快捷入口。
- **Service Layer Separation**: API 层只处理 HTTP 协议，业务转换放在 `features`。
- **Utility Modularity**: 将门映射和哈希生成拆成可单测纯函数。

```mermaid
graph TD
    A[CircuitWorkbenchPage] --> B[WorkbenchSubmitPanel]
    A --> C[circuit-task-submit util]
    A --> D[tasks api]
    C --> E[Qibo Python code]
    D --> F[/api/tasks/submit]
    D --> G[/api/tasks/{id}]
```

## Components and Interfaces

### Component 1: `circuit-task-submit` utility
- **Purpose:** 将 `CircuitModel` 转换为后端可执行 Python/Qibo 脚本，并生成幂等键输入串。
- **Interfaces:**
  - `buildQiboTaskCode(model: CircuitModel): string`
  - `buildSubmitFingerprint(model: CircuitModel): string`
  - `buildIdempotencyKey(fingerprint: string): string`
- **Dependencies:** `CircuitModel` 类型定义。
- **Reuses:** 线路操作排序规则（按 `layer` 稳定排序）。

### Component 2: `WorkbenchSubmitPanel`
- **Purpose:** 呈现提交按钮、提交中状态、最近任务状态、刷新按钮与任务中心跳转入口。
- **Interfaces:**
  - `submitting: boolean`
  - `taskId: number | null`
  - `taskStatus: string | null`
  - `submitError: string | null`
  - `deduplicated: boolean`
  - `canSubmit: boolean`
  - `onSubmit: () => void`
  - `onRefreshStatus: () => void`
- **Dependencies:** `react-router-dom` 的 `Link`。
- **Reuses:** 现有页面风格与按钮状态模式。

### Component 3: `tasks api` 扩展
- **Purpose:** 支持提交时透传 `Idempotency-Key`，并读取 `deduplicated` 返回字段。
- **Interfaces:**
  - `submitTask(code: string, options?: { idempotencyKey?: string }): Promise<TaskSubmitResponse>`
  - `TaskSubmitResponse` 增加 `deduplicated?: boolean`
- **Dependencies:** 现有 `apiRequest`。
- **Reuses:** 现有 `/api/tasks` 接口契约。

## Data Models

### Workbench Submit State
```ts
type WorkbenchSubmitState = {
  submitting: boolean;
  taskId: number | null;
  taskStatus: string | null;
  submitError: string | null;
  deduplicated: boolean;
};
```

### Submit Request Material
```ts
type SubmitRequestMaterial = {
  model: CircuitModel;
  generatedCode: string;
  fingerprint: string;
  idempotencyKey: string;
};
```

## Error Handling

### Error Scenarios
1. **提交前校验失败（QASM 错误/复杂度超限）**
   - **Handling:** 阻断提交并显示中文错误提示。
   - **User Impact:** 用户可立即修复，不会产生无效后端任务。

2. **脚本生成失败（不支持门映射）**
   - **Handling:** 抛出显式错误并在提交区展示。
   - **User Impact:** 用户明确知道哪类门当前不可提交。

3. **接口提交失败（网络/认证/后端错误）**
   - **Handling:** 通过 `toErrorMessage` 显示结构化错误；保留当前线路状态。
   - **User Impact:** 用户可重试，不丢失编辑内容。

4. **状态刷新失败**
   - **Handling:** 仅更新状态错误提示，不影响当前任务 ID 与本地模拟结果。
   - **User Impact:** 用户可继续手动刷新或转任务中心查看。

## Testing Strategy

### Unit Testing
- 新增 `circuit-task-submit` 单测：
  - 门映射正确性
  - 自动补测量逻辑
  - 幂等键稳定性（同输入同输出）
- API 单测：
  - `submitTask` 正确透传 `Idempotency-Key` header
  - `deduplicated` 字段解析

### Integration Testing
- 更新 `workbench-page.test.tsx`：
  - 渲染提交按钮
  - 提交成功后显示 `task_id`
  - deduplicated 提示显示
  - 提交中禁用态
  - 解析错误/复杂度错误时阻断提交

### End-to-End Testing
- 本轮不新增完整 E2E 框架；通过现有前端集成测试 + Docker 手工回归验证闭环：
  - 图形化编辑 -> 提交任务 -> 任务状态刷新 -> 任务中心跳转。
