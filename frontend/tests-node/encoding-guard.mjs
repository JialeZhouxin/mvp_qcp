import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOT = path.join(PROJECT_ROOT, "src");

const TEXT_FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"]);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

const LINE_GUARDS = [
  { name: "replacement-char", pattern: /\uFFFD/ },
  { name: "private-use-char", pattern: /[\uE000-\uF8FF]/ },
  { name: "unexpected-kana", pattern: /[\u3040-\u30FF]/ },
  { name: "mojibake-signature", pattern: /Ã|Â|â€|â‚¬|ï¼|锟/ },
];

function collectFiles(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, result);
      continue;
    }
    if (!TEXT_FILE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }
    result.push(fullPath);
  }
  return result;
}

function toRelative(fullPath) {
  return path.relative(PROJECT_ROOT, fullPath).replaceAll("\\", "/");
}

function snippet(line) {
  const trimmed = line.trim();
  return trimmed.length <= 140 ? trimmed : `${trimmed.slice(0, 140)}...`;
}

const issues = [];

for (const filePath of collectFiles(SOURCE_ROOT)) {
  const relPath = toRelative(filePath);
  const buffer = fs.readFileSync(filePath);

  let text = "";
  try {
    text = UTF8_DECODER.decode(buffer);
  } catch {
    issues.push({
      file: relPath,
      line: 0,
      reason: "non-utf8-file",
      content: "(failed to decode as UTF-8)",
    });
    continue;
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const guard of LINE_GUARDS) {
      if (!guard.pattern.test(line)) {
        continue;
      }
      issues.push({
        file: relPath,
        line: index + 1,
        reason: guard.name,
        content: snippet(line),
      });
      break;
    }
  });
}

if (issues.length > 0) {
  console.error("[FAIL] encoding guard detected invalid text:");
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} [${issue.reason}] ${issue.content}`);
  }
  process.exit(1);
}

console.log("[PASS] encoding guard");

