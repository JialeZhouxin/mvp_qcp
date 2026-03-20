import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("E:/02_Projects/quantuncloudplatform/mvp_qcp/frontend");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("token storage source contains expected localStorage contract", () => {
  const src = read("src/auth/token.ts");
  assert.match(src, /TOKEN_KEY\s*=\s*"qcp_access_token"/);
  assert.match(src, /localStorage\.getItem\(TOKEN_KEY\)/);
  assert.match(src, /localStorage\.setItem\(TOKEN_KEY,\s*token\)/);
  assert.match(src, /localStorage\.removeItem\(TOKEN_KEY\)/);
});

test("api client injects Bearer token via auth session store", () => {
  const src = read("src/api/client.ts");
  assert.match(src, /session-store/);
  assert.match(src, /Authorization/);
  assert.match(src, /Bearer \$\{token\}/);
});

test("protected route redirects to login using auth session", () => {
  const src = read("src/components/ProtectedRoute.tsx");
  assert.match(src, /useAuthSession/);
  assert.match(src, /to="\/login"/);
  assert.match(src, /<Outlet\s*\/>/);
});
