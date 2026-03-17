import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const TEST_ROOTS = ["src/tests", "e2e"];
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i;
const MOCK_CALL_RE = /\b(?:vi|jest)\.mock\s*\(/g;

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && TEST_FILE_RE.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

async function collectViolations() {
  const violations = [];
  for (const testRoot of TEST_ROOTS) {
    const absRoot = path.join(ROOT_DIR, testRoot);
    const files = await walkFiles(absRoot).catch(() => []);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const match of content.matchAll(MOCK_CALL_RE)) {
        const index = match.index ?? 0;
        violations.push({
          file: path.relative(ROOT_DIR, file).replaceAll("\\", "/"),
          line: getLineNumber(content, index),
        });
      }
    }
  }
  return violations;
}

async function main() {
  const violations = await collectViolations();
  if (violations.length === 0) {
    console.log("no mock-based tests found");
    return;
  }

  console.error("mock-based tests are forbidden:");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line}`);
  }
  process.exitCode = 1;
}

await main();
