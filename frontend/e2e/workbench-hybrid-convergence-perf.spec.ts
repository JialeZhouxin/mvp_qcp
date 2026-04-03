import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SEED = 20260403;
const SAMPLE_COUNT = 1000;
const RENDER_THRESHOLD_MS = 1500;
const TOOLTIP_P95_THRESHOLD_MS = 120;

interface FixturePoint {
  readonly iteration: number;
  readonly objective: number;
}

test("replays fixed hybrid fixture and persists performance evidence", async ({ page }) => {
  const fixturePath = resolve(process.cwd(), "src/tests/fixtures/hybrid-convergence-1000.seed-20260403.json");
  const fixtureText = await readFile(fixturePath, "utf8");
  const fixture = JSON.parse(fixtureText) as FixturePoint[];

  expect(fixture).toHaveLength(SAMPLE_COUNT);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.setContent('<div id="chart-host" style="width: 960px; height: 280px;"></div>');
  await page.addScriptTag({ path: resolve(process.cwd(), "node_modules/echarts/dist/echarts.min.js") });

  const metrics = await page.evaluate(
    async ({ points }) => {
      const host = document.getElementById("chart-host") as HTMLElement | null;
      if (!host) {
        throw new Error("chart-host not found");
      }

      const echartsApi = (window as unknown as { echarts?: { init: (element: HTMLElement) => any } }).echarts;
      if (!echartsApi) {
        throw new Error("echarts global not available");
      }

      const chart = echartsApi.init(host) as {
        on: (eventName: string, listener: () => void) => void;
        setOption: (option: Record<string, unknown>, notMerge?: boolean) => void;
        dispatchAction: (action: Record<string, unknown>) => void;
        dispose: () => void;
      };

      const option = {
        animation: false,
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "value",
          name: "迭代次数",
        },
        yAxis: {
          type: "value",
          name: "代价函数",
        },
        series: [
          {
            type: "line",
            showSymbol: false,
            data: points.map((point) => [point.iteration, point.objective]),
          },
        ],
      };

      const renderStart = performance.now();
      await new Promise<void>((resolveRender) => {
        chart.on("finished", () => resolveRender());
        chart.setOption(option, true);
      });
      const renderMs = performance.now() - renderStart;

      const tooltipCosts: number[] = [];
      for (let index = 0; index < 30; index += 1) {
        const pointIndex = Math.floor((index / 29) * (points.length - 1));
        const start = performance.now();
        chart.dispatchAction({ type: "showTip", seriesIndex: 0, dataIndex: pointIndex });
        await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
        tooltipCosts.push(performance.now() - start);
      }

      chart.dispose();
      const sorted = tooltipCosts.sort((left, right) => left - right);
      const rank = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

      return {
        renderMs,
        tooltipP95Ms: sorted[rank],
      };
    },
    { points: fixture },
  );

  const renderMs = Number(metrics.renderMs.toFixed(2));
  const tooltipP95Ms = Number(metrics.tooltipP95Ms.toFixed(2));
  const verdict =
    renderMs <= RENDER_THRESHOLD_MS && tooltipP95Ms <= TOOLTIP_P95_THRESHOLD_MS ? "PASS" : "FAIL";

  const command = "npm --prefix frontend run test:e2e -- e2e/workbench-hybrid-convergence-perf.spec.ts";
  const report = {
    timestamp: new Date().toISOString(),
    fixturePath: "frontend/src/tests/fixtures/hybrid-convergence-1000.seed-20260403.json",
    seed: SEED,
    sampleCount: SAMPLE_COUNT,
    renderMs,
    tooltipP95Ms,
    thresholds: {
      renderMsMax: RENDER_THRESHOLD_MS,
      tooltipP95MsMax: TOOLTIP_P95_THRESHOLD_MS,
    },
    verdict,
    command,
  };

  const reportPath = resolve(process.cwd(), "..", ".omx/plans/hybrid-convergence-performance-v4.json");
  await mkdir(resolve(process.cwd(), "..", ".omx/plans"), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  expect(report.renderMs).toBeLessThanOrEqual(RENDER_THRESHOLD_MS);
  expect(report.tooltipP95Ms).toBeLessThanOrEqual(TOOLTIP_P95_THRESHOLD_MS);
  expect(report.verdict).toBe("PASS");
});
