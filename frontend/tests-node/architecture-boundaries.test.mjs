import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = fs.existsSync(path.join(process.cwd(), "src"))
  ? path.resolve(process.cwd())
  : path.resolve(process.cwd(), "frontend");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

run("route pages are thin wrappers around feature screens", () => {
  const codeTasksPage = read("src/pages/CodeTasksPage.tsx");
  const taskCenterPage = read("src/pages/TaskCenterPage.tsx");
  const circuitWorkbenchPage = read("src/pages/CircuitWorkbenchPage.tsx");
  const codeTasksScreen = read("src/features/code-tasks/CodeTasksScreen.tsx");
  const taskCenterScreen = read("src/features/task-center/TaskCenterScreen.tsx");
  const taskCenterListHook = read("src/features/task-center/use-task-center-list.ts");
  const taskCenterRealtimeHook = read("src/features/task-center/use-task-center-realtime.ts");
  const taskCenterStreamHook = read("src/features/task-center/use-task-center-stream.ts");

  assert.match(codeTasksPage, /CodeTasksScreen/);
  assert.doesNotMatch(codeTasksPage, /submitTask|getProjectList|getTaskStatus/);
  assert.doesNotMatch(codeTasksPage, /from\s+["'][^"']*TasksPage["']/);
  assert.doesNotMatch(codeTasksPage, /<TasksPage\s*\/>/);

  assert.match(taskCenterPage, /TaskCenterScreen/);
  assert.doesNotMatch(taskCenterPage, /getTaskCenterList|connectTaskStatusStream/);
  assert.doesNotMatch(taskCenterScreen, /getTaskCenterList|getTaskCenterDetail|connectTaskStatusStream/);
  assert.doesNotMatch(taskCenterListHook, /realtime\/task-stream-client/);
  assert.doesNotMatch(taskCenterRealtimeHook, /realtime\/task-stream-client/);
  assert.match(taskCenterStreamHook, /api\/task-stream/);

  assert.match(circuitWorkbenchPage, /CircuitWorkbenchScreen/);
  assert.doesNotMatch(circuitWorkbenchPage, /useWorkbenchTaskSubmit|createSimulationScheduler/);

  assert.doesNotMatch(codeTasksScreen, /pages\/TasksPage/);
  assert.doesNotMatch(codeTasksScreen, /\.\.\/\.\.\/pages\/TasksPage/);
});

run("frontend authentication flows do not read token storage outside auth modules", () => {
  const appSource = read("src/App.tsx");
  const protectedRouteSource = read("src/components/ProtectedRoute.tsx");
  const apiClientSource = read("src/api/client.ts");
  const streamClientSource = read("src/api/task-stream.ts");

  assert.doesNotMatch(appSource, /auth\/token/);
  assert.doesNotMatch(protectedRouteSource, /auth\/token/);
  assert.doesNotMatch(apiClientSource, /auth\/token/);
  assert.doesNotMatch(streamClientSource, /auth\/token/);
});

run("frontend api modules consume generated contract types", () => {
  const taskApiSource = read("src/api/tasks.ts");
  const taskCenterApiSource = read("src/api/task-center.ts");
  const projectApiSource = read("src/api/projects.ts");

  assert.match(taskApiSource, /generated\/contracts/);
  assert.match(taskCenterApiSource, /generated\/contracts/);
  assert.match(projectApiSource, /generated\/contracts/);
});

run("shared project panel is not owned by task-center feature", () => {
  const codeTasksScreen = read("src/features/code-tasks/CodeTasksScreen.tsx");
  const workbenchScreen = read("src/features/circuit/ui/CircuitWorkbenchScreen.tsx");

  assert.doesNotMatch(codeTasksScreen, /components\/task-center\/ProjectPanel/);
  assert.doesNotMatch(workbenchScreen, /components\/task-center\/ProjectPanel/);
  assert.equal(fs.existsSync(path.join(root, "src/components/projects/ProjectPanel.tsx")), true);
  assert.equal(fs.existsSync(path.join(root, "src/components/task-center/ProjectPanel.tsx")), false);
});

run("shared components do not depend on feature modules", () => {
  const componentRoot = path.join(root, "src/components");
  const stack = [componentRoot];
  const sources = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) {
        continue;
      }
      sources.push(fs.readFileSync(fullPath, "utf8"));
    }
  }

  for (const source of sources) {
    assert.doesNotMatch(source, /from\s+["'][^"']*features\//);
  }
});

if (process.exitCode && process.exitCode !== 0) {
  console.error("architecture boundary tests failed");
} else {
  console.log("architecture boundary tests passed");
}
