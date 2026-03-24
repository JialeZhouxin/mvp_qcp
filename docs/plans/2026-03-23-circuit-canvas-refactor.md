# Circuit Canvas Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变前端对外行为和 `useWorkbenchEditorState` 返回契约的前提下，拆分电路画布与工作台编辑器状态的过重职责。

**Architecture:** 保持 `CircuitWorkbenchScreen`、`CircuitCanvas` 和 `useWorkbenchEditorState` 的公开接口不变，只抽出内部控制器 hook 和渲染子组件。`CircuitCanvas` 负责组装，交互状态迁入 `useCircuitCanvasInteractions`，网格渲染迁入 `CircuitCanvasGrid`，工作台工具栏控制迁入 `useWorkbenchCanvasControls`。

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library

---

### Task 1: 为工作台画布控制提取 hook

**Files:**
- Create: `frontend/src/features/circuit/ui/use-workbench-canvas-controls.ts`
- Modify: `frontend/src/features/circuit/ui/use-workbench-editor-state.ts`
- Test: `frontend/src/tests/workbench-canvas-controls-hook.test.tsx`

**Step 1: Write the failing test**

```tsx
it("loads templates and resets qubit warnings through canvas controls", () => {
  // renderHook(useWorkbenchCanvasControls)
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- src/tests/workbench-canvas-controls-hook.test.tsx`
Expected: FAIL with module not found or exported symbol missing

**Step 3: Write minimal implementation**

- 把 qubit 增减、清空、重置、模板加载收敛到新 hook
- `useWorkbenchEditorState` 继续返回 `canvasControls`，但其值来自新 hook

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- src/tests/workbench-canvas-controls-hook.test.tsx src/tests/workbench-editor-state-hook.test.tsx`
Expected: PASS

### Task 2: 为电路画布提取交互控制器

**Files:**
- Create: `frontend/src/features/circuit/components/use-circuit-canvas-interactions.ts`
- Modify: `frontend/src/features/circuit/components/CircuitCanvas.tsx`
- Test: `frontend/src/tests/circuit-canvas-interactions-hook.test.tsx`

**Step 1: Write the failing test**

```tsx
it("tracks pending multi-qubit placement and commits completed operation", () => {
  // renderHook(useCircuitCanvasInteractions)
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- src/tests/circuit-canvas-interactions-hook.test.tsx`
Expected: FAIL with module not found or exported symbol missing

**Step 3: Write minimal implementation**

- 抽离 `pendingPlacement`、`selectedOperationId`、拖拽预览、参数草稿和消息处理
- `CircuitCanvas` 只保留 viewport、toolbar 和渲染组装

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- src/tests/circuit-canvas-interactions-hook.test.tsx src/tests/circuit-canvas.test.tsx`
Expected: PASS

### Task 3: 为电路画布提取网格渲染组件

**Files:**
- Create: `frontend/src/features/circuit/components/CircuitCanvasGrid.tsx`
- Modify: `frontend/src/features/circuit/components/CircuitCanvas.tsx`
- Test: `frontend/src/tests/circuit-canvas-grid.test.tsx`

**Step 1: Write the failing test**

```tsx
it("renders inline parameter editor only on the selected anchor cell", () => {
  // render(CircuitCanvasGrid)
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test -- src/tests/circuit-canvas-grid.test.tsx`
Expected: FAIL with module not found

**Step 3: Write minimal implementation**

- 提取网格循环、单元格类名、删除按钮、内联参数面板
- `CircuitCanvas` 通过 props 把状态和事件传给 `CircuitCanvasGrid`

**Step 4: Run test to verify it passes**

Run: `npm --prefix frontend run test -- src/tests/circuit-canvas-grid.test.tsx src/tests/circuit-canvas.test.tsx`
Expected: PASS

### Task 4: 完整回归验证

**Files:**
- Verify only

**Step 1: Run node architecture tests**

Run: `node frontend/tests-node/architecture-boundaries.test.mjs`
Expected: PASS

**Step 2: Run node fallback tests**

Run: `node frontend/tests-node/run-tests.mjs`
Expected: PASS

**Step 3: Run frontend targeted and full tests**

Run: `npm --prefix frontend run test -- src/tests/circuit-canvas-grid.test.tsx src/tests/circuit-canvas-interactions-hook.test.tsx src/tests/workbench-canvas-controls-hook.test.tsx src/tests/circuit-canvas.test.tsx src/tests/workbench-editor-state-hook.test.tsx`
Expected: PASS

Run: `npm --prefix frontend run test`
Expected: PASS

**Step 4: Run production build**

Run: `npm --prefix frontend run build`
Expected: PASS
