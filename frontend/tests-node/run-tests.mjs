import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("E:/02_Projects/quantuncloudplatform/mvp_qcp/frontend");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
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
});

run("package scripts contain test, test:node and generate:contracts", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(typeof pkg.scripts.test, "string");
  assert.equal(typeof pkg.scripts["test:node"], "string");
  assert.equal(typeof pkg.scripts["generate:contracts"], "string");
});

if (process.exitCode && process.exitCode !== 0) {
  console.error("node fallback tests failed");
} else {
  console.log("node fallback tests passed");
}
