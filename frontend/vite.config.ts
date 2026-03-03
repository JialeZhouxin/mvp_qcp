import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    globals: true,
  },
});
