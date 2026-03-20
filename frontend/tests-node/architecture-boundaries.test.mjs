import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("E:/02_Projects/quantuncloudplatform/mvp_qcp/frontend");

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

  assert.match(codeTasksPage, /CodeTasksScreen/);
  assert.doesNotMatch(codeTasksPage, /submitTask|getProjectList|getTaskStatus/);
  assert.doesNotMatch(codeTasksPage, /from\s+["'][^"']*TasksPage["']/);
  assert.doesNotMatch(codeTasksPage, /<TasksPage\s*\/>/);

  assert.match(taskCenterPage, /TaskCenterScreen/);
  assert.doesNotMatch(taskCenterPage, /getTaskCenterList|connectTaskStatusStream/);

  assert.match(circuitWorkbenchPage, /CircuitWorkbenchScreen/);
  assert.doesNotMatch(circuitWorkbenchPage, /useWorkbenchTaskSubmit|createSimulationScheduler/);

  assert.doesNotMatch(codeTasksScreen, /pages\/TasksPage/);
  assert.doesNotMatch(codeTasksScreen, /\.\.\/\.\.\/pages\/TasksPage/);
});

run("frontend authentication flows do not read token storage outside auth modules", () => {
  const appSource = read("src/App.tsx");
  const protectedRouteSource = read("src/components/ProtectedRoute.tsx");
  const apiClientSource = read("src/api/client.ts");
  const streamClientSource = read("src/features/realtime/task-stream-client.ts");

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

if (process.exitCode && process.exitCode !== 0) {
  console.error("architecture boundary tests failed");
} else {
  console.log("architecture boundary tests passed");
}
