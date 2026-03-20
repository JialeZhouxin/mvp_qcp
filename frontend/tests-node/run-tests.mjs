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
  assert.equal(exists("src/components/projects/ProjectPanel.tsx"), true);
  assert.equal(exists("src/features/circuit/ui/use-workbench-editor-state.ts"), true);
  assert.equal(exists("src/features/circuit/simulation/use-workbench-simulation.ts"), true);
  assert.equal(exists("src/features/circuit/ui/use-workbench-draft-sync.ts"), true);
  assert.equal(exists("src/features/circuit/ui/use-workbench-guide-state.ts"), true);
  assert.equal(exists("src/features/task-center/use-task-center-list.ts"), true);
  assert.equal(exists("src/features/task-center/use-task-center-detail.ts"), true);
  assert.equal(exists("src/features/task-center/use-task-center-realtime.ts"), true);
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
  const src = read("src/features/realtime/task-stream-client.ts");
  assert.doesNotMatch(src, /export interface TaskStatusStreamEvent/);
  assert.match(src, /generated\/contracts/);
});

run("task center copy is readable UTF-8 text", () => {
  const screenSource = read("src/features/task-center/TaskCenterScreen.tsx");
  const listHookSource = read("src/features/task-center/use-task-center-list.ts");
  const detailHookSource = read("src/features/task-center/use-task-center-detail.ts");

  assert.match(screenSource, /任务中心（状态跟踪与结果诊断）/);
  assert.match(screenSource, /实时状态流连接已断开/);
  assert.match(screenSource, /立即重连/);
  assert.match(listHookSource, /加载任务列表失败/);
  assert.match(detailHookSource, /加载任务详情失败/);
  assert.doesNotMatch(screenSource, /Ã/);
  assert.doesNotMatch(listHookSource, /Ã|æ°“/);
  assert.doesNotMatch(detailHookSource, /Ã|æ°“/);
});

if (process.exitCode && process.exitCode !== 0) {
  console.error("node fallback tests failed");
} else {
  console.log("node fallback tests passed");
}
