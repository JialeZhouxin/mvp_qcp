import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    globals: true,
    include: ["src/tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "tests-node/**"],
  },
});
