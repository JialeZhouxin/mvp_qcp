import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SEED = 20260403;
const DEFAULT_SAMPLE_COUNT = 1000;

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export function generateHybridConvergenceFixture(sampleCount = DEFAULT_SAMPLE_COUNT, seed = DEFAULT_SEED) {
  const rng = createRng(seed);
  const baseline = Date.UTC(2026, 3, 3, 0, 0, 0);
  const points = [];
  let bestObjective = Number.POSITIVE_INFINITY;

  for (let index = 0; index < sampleCount; index += 1) {
    const iteration = index + 1;
    const trend = 1 / (1 + iteration * 0.02);
    const noise = (rng() - 0.5) * 0.02;
    const objective = Math.max(0, Number((trend + noise).toFixed(6)));
    bestObjective = Math.min(bestObjective, objective);

    points.push({
      iteration,
      objective,
      bestObjective: Number(bestObjective.toFixed(6)),
      currentBestGap: Number(Math.max(0, objective - bestObjective).toFixed(6)),
      updatedAt: new Date(baseline + iteration * 1000).toISOString(),
    });
  }

  return points;
}

function writeFixture() {
  const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const fixturePath = resolve(
    frontendRoot,
    "src/tests/fixtures/hybrid-convergence-1000.seed-20260403.json",
  );
  const fixture = generateHybridConvergenceFixture();

  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(`Wrote fixture: ${fixturePath}`);
}

const isMainModule =
  typeof process.argv[1] === "string" && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  writeFixture();
}
