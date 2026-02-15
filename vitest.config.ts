import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "convex/**/*.test.ts", "tests/**/*.test.ts"],
    globals: true,
    // Run tests in forked processes to isolate unhandled errors from scheduled functions
    pool: "forks",
  },
});
