import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "escolas-int",
    include: ["tests/escola/*.int.test.ts"],
    globals: true,
    environment: "node",
    setupFiles: ["tests/escola/_setup.ts"],
    // Testes de integração rodam em série para não conflitar no banco
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
