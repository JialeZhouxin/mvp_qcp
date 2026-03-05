import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("E:/02_Projects/quantuncloudplatform/mvp_qcp/frontend");

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

test("frontend core files exist", () => {
  assert.equal(exists("src/pages/LoginPage.tsx"), true);
  assert.equal(exists("src/pages/RegisterPage.tsx"), true);
  assert.equal(exists("src/pages/TasksPage.tsx"), true);
  assert.equal(exists("src/components/CodeEditor.tsx"), true);
  assert.equal(exists("src/components/ResultChart.tsx"), true);
});

test("package json includes required scripts", () => {
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  assert.equal(typeof pkg.scripts.dev, "string");
  assert.equal(typeof pkg.scripts.build, "string");
  assert.equal(typeof pkg.scripts.test, "string");
  assert.equal(typeof pkg.scripts["test:node"], "string");
});
