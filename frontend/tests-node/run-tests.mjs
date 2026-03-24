import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("E:/02_Projects/quantuncloudplatform/mvp_qcp/frontend");
const repoRoot = path.resolve("E:/02_Projects/quantuncloudplatform/mvp_qcp");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function existsFromRepo(file) {
  return fs.existsSync(path.join(repoRoot, file));
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

function assertReadableSource(source, label) {
  assert.doesNotMatch(source, /\uFFFD/, `${label} contains replacement characters`);
}

run("token storage source contract", () => {
  const src = read("src/auth/token.ts");
  assert.match(src, /TOKEN_KEY\s*=\s*"qcp_access_token"/);
  assert.match(src, /localStorage\.getItem\(TOKEN_KEY\)/);
  assert.match(src, /localStorage\.setItem\(TOKEN_KEY,\s*token\)/);
  assert.match(src, /localStorage\.removeItem\(TOKEN_KEY\)/);
});

run("api client reads access token via auth session store", () => {
  const src = read("src/api/client.ts");
  assert.match(src, /session-store/);
  assert.match(src, /Authorization/);
  assert.match(src, /Bearer \$\{token\}/);
});

run("protected route redirects with auth session context", () => {
  const src = read("src/components/ProtectedRoute.tsx");
  assert.match(src, /useAuthSession/);
  assert.match(src, /to="\/login"/);
  assert.match(src, /<Outlet\s*\/>/);
});

run("frontend key files exist", () => {
  assert.equal(exists("src/pages/LoginPage.tsx"), true);
  assert.equal(exists("src/pages/RegisterPage.tsx"), true);
  assert.equal(exists("src/pages/TasksPage.tsx"), true);
  assert.equal(exists("src/components/CodeEditor.tsx"), true);
  assert.equal(exists("src/components/ResultChart.tsx"), true);
  assert.equal(exists("src/api/generated/contracts.ts"), true);
  assert.equal(exists("src/api/task-stream.ts"), true);
  assert.equal(exists("src/features/code-tasks/CodeTasksHeader.tsx"), true);
  assert.equal(exists("src/features/code-tasks/CodeTasksActions.tsx"), true);
  assert.equal(exists("src/features/code-tasks/CodeTasksStatusPanel.tsx"), true);
  assert.equal(exists("src/features/code-tasks/CodeTasksResultPanel.tsx"), true);
  assert.equal(exists("src/features/code-tasks/components/CodeProjectPanel.tsx"), true);
  assert.equal(exists("src/features/circuit/components/WorkbenchProjectPanel.tsx"), true);
  assert.equal(exists("src/features/circuit/ui/use-workbench-editor-state.ts"), true);
  assert.equal(exists("src/features/circuit/simulation/use-workbench-simulation.ts"), true);
  assert.equal(exists("src/features/circuit/ui/use-workbench-draft-sync.ts"), true);
  assert.equal(exists("src/features/circuit/ui/use-workbench-guide-state.ts"), true);
  assert.equal(exists("src/features/task-center/use-task-center-list.ts"), true);
  assert.equal(exists("src/features/task-center/use-task-center-detail.ts"), true);
  assert.equal(exists("src/features/task-center/use-task-center-realtime.ts"), true);
  assert.equal(exists("src/features/task-center/components/TaskListPanel.tsx"), true);
  assert.equal(exists("src/features/task-center/components/TaskDetailPanel.tsx"), true);
  assert.equal(existsFromRepo("backend/app/dependencies/task_submit.py"), true);
});

run("package scripts contain test, test:node and generate:contracts", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(typeof pkg.scripts.test, "string");
  assert.equal(typeof pkg.scripts["test:node"], "string");
  assert.equal(typeof pkg.scripts["generate:contracts"], "string");
});

run("generated contracts expose task stream event types", () => {
  const src = read("src/api/generated/contracts.ts");
  assert.match(src, /export interface TaskStatusStreamEvent/);
  assert.match(src, /export interface TaskHeartbeatEvent/);
  assert.match(src, /export type TaskStreamMessage/);
});

run("task stream client uses generated contracts instead of local event interfaces", () => {
  const src = read("src/api/task-stream.ts");
  assert.doesNotMatch(src, /export interface TaskStatusStreamEvent/);
  assert.match(src, /generated\/contracts/);
});

run("task center source stays inside feature boundary", () => {
  const screenSource = read("src/features/task-center/TaskCenterScreen.tsx");
  const listPanelSource = read("src/features/task-center/components/TaskListPanel.tsx");
  const detailPanelSource = read("src/features/task-center/components/TaskDetailPanel.tsx");
  const listHookSource = read("src/features/task-center/use-task-center-list.ts");
  const detailHookSource = read("src/features/task-center/use-task-center-detail.ts");

  assert.match(screenSource, /\.\/components\/TaskListPanel/);
  assert.match(screenSource, /\.\/components\/TaskDetailPanel/);
  assert.match(listPanelSource, /TASK_STATUS_FILTER_OPTIONS/);
  assert.match(detailPanelSource, /detail\.diagnostic/);
  assert.match(listHookSource, /getTaskCenterList/);
  assert.match(detailHookSource, /getTaskCenterDetail/);
  assert.doesNotMatch(screenSource, /components\/task-center/);
  assertReadableSource(screenSource, "TaskCenterScreen");
  assertReadableSource(listPanelSource, "TaskListPanel");
  assertReadableSource(detailPanelSource, "TaskDetailPanel");
});

run("code task runtime uses feature local project panel", () => {
  const screenSource = read("src/features/code-tasks/CodeTasksScreen.tsx");
  const runHookSource = read("src/features/code-tasks/useCodeTaskRun.ts");
  const projectsHookSource = read("src/features/code-tasks/useCodeProjects.ts");
  const projectPanelSource = read("src/features/code-tasks/components/CodeProjectPanel.tsx");
  const workbenchProjectPanelSource = read("src/features/circuit/components/WorkbenchProjectPanel.tsx");

  assert.match(screenSource, /\.\/components\/CodeProjectPanel/);
  assert.match(runHookSource, /useTaskRuntime/);
  assert.match(projectsHookSource, /loadProjects/);
  assert.match(projectPanelSource, /entry_type === "code"/);
  assert.match(workbenchProjectPanelSource, /entry_type === "circuit"/);
  assert.doesNotMatch(screenSource, /components\/projects\/ProjectPanel/);
  assertReadableSource(projectPanelSource, "CodeProjectPanel");
  assertReadableSource(workbenchProjectPanelSource, "WorkbenchProjectPanel");
});

if (process.exitCode && process.exitCode !== 0) {
  console.error("node fallback tests failed");
} else {
  console.log("node fallback tests passed");
}
