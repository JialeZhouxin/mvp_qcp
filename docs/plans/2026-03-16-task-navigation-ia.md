# Task Navigation IA P0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在任务域落地统一导航和面包屑，并把 `/tasks` 默认入口调整为 `/tasks/center`，降低用户定位成本。

**Architecture:** 通过新增 `/tasks` 路由壳层组件 `TasksWorkspaceLayout` 承载导航与路径指示，页面业务组件保持职责不变。路由采用嵌套结构实现默认入口与帮助页扩展，避免各页面重复维护导航逻辑。

**Tech Stack:** React 18、React Router v6、TypeScript、Vitest、Testing Library

---

### Task 1: 新增任务域壳层（导航 + 面包屑）

**Files:**
- Create: `frontend/src/components/navigation/TasksWorkspaceLayout.tsx`

**Step 1: Write the failing test**

- 在新测试中断言访问 `/tasks/circuit` 时存在全局导航项和面包屑。

**Step 2: Run test to verify it fails**

Run: `cmd /c npm --prefix frontend run test -- src/tests/task-navigation-layout.test.tsx`  
Expected: FAIL（缺少 `TasksWorkspaceLayout`）

**Step 3: Write minimal implementation**

- 创建布局组件，渲染：
  - 顶部导航：任务中心/图形化编程/代码提交/帮助文档
  - 面包屑：`任务 / 当前模块`
  - `<Outlet />`

**Step 4: Run test to verify it passes**

Run: `cmd /c npm --prefix frontend run test -- src/tests/task-navigation-layout.test.tsx`  
Expected: PASS

**Step 5: Commit（需用户确认）**

```bash
git add frontend/src/components/navigation/TasksWorkspaceLayout.tsx
git commit -m "feat(frontend): add tasks workspace layout navigation shell"
```

### Task 2: 路由重构与默认入口调整

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/TaskHelpPage.tsx`
- Modify: `frontend/src/tests/workbench-route.test.tsx`

**Step 1: Write the failing test**

- 将 `/tasks` 默认跳转断言改为任务中心。
- 新增 `/tasks/help` 可达性断言。

**Step 2: Run test to verify it fails**

Run: `cmd /c npm --prefix frontend run test -- src/tests/workbench-route.test.tsx`  
Expected: FAIL（当前默认跳转到 `/tasks/circuit`）

**Step 3: Write minimal implementation**

- `/tasks` 改为父路由并挂载 `TasksWorkspaceLayout`。
- 增加 index route 重定向到 `center`。
- 新增 `TaskHelpPage` 并注册 `help` 子路由。
- `defaultPath` 调整为已登录默认 `/tasks/center`。

**Step 4: Run test to verify it passes**

Run: `cmd /c npm --prefix frontend run test -- src/tests/workbench-route.test.tsx`  
Expected: PASS

**Step 5: Commit（需用户确认）**

```bash
git add frontend/src/App.tsx frontend/src/pages/TaskHelpPage.tsx frontend/src/tests/workbench-route.test.tsx
git commit -m "feat(frontend): route tasks default to center with help page"
```

### Task 3: 页面信息架构文案修正

**Files:**
- Modify: `frontend/src/pages/TaskCenterPage.tsx`
- Modify: `frontend/src/pages/CircuitWorkbenchPage.tsx`
- Modify: `frontend/src/pages/TasksPage.tsx`

**Step 1: Write the failing test**

- 断言任务中心包含帮助文档入口。
- 断言关键页面标题更明确（可按 heading 文本匹配）。

**Step 2: Run test to verify it fails**

Run: `cmd /c npm --prefix frontend run test -- src/tests/task-center-page.test.tsx`  
Expected: FAIL（帮助入口尚未接入）

**Step 3: Write minimal implementation**

- 任务中心标题改为“任务中心（状态跟踪与结果诊断）”。
- 图形化页标题改为“图形化编程（拖拽构建量子电路）”。
- 代码页标题改为“代码提交（Python/Qibo）”。
- 任务中心页头添加 `/tasks/help` 入口。

**Step 4: Run test to verify it passes**

Run: `cmd /c npm --prefix frontend run test -- src/tests/task-center-page.test.tsx`  
Expected: PASS

**Step 5: Commit（需用户确认）**

```bash
git add frontend/src/pages/TaskCenterPage.tsx frontend/src/pages/CircuitWorkbenchPage.tsx frontend/src/pages/TasksPage.tsx
git commit -m "feat(frontend): clarify task page titles and help entry"
```

### Task 4: 验证与回归

**Files:**
- Create: `frontend/src/tests/task-navigation-layout.test.tsx`
- Modify: `docs/project-usage-guide.md`

**Step 1: Write/adjust tests**

- 增加导航壳层测试：导航项、面包屑、帮助页面可访问。
- 更新文档说明新的任务域导航结构和默认入口。

**Step 2: Run verification**

Run: `cmd /c npm --prefix frontend run test -- src/tests/workbench-route.test.tsx src/tests/task-navigation-layout.test.tsx`  
Expected: PASS

Run: `cmd /c npm --prefix frontend run test:node`  
Expected: PASS

**Step 3: Commit（需用户确认）**

```bash
git add frontend/src/tests/task-navigation-layout.test.tsx frontend/src/tests/workbench-route.test.tsx docs/project-usage-guide.md
git commit -m "test(frontend): cover tasks navigation IA and update usage guide"
```
