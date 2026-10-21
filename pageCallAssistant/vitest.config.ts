import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["lib/escola/**/*.test.ts", "tests/escola/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/escola/**/*.ts"],
      exclude: ["lib/escola/**/*.test.ts"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
