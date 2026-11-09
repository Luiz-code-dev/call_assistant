import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e — SpeakFlow Escolas
 * Requer servidor rodando em BASE_URL (padrao http://localhost:3001)
 * com seed de demo ativo (ESCOLAS_SEED_DEMO=true ESCOLAS_SEED_USUARIOS=true ESCOLAS_SEED_TESTE=true)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    video: { mode: "on", size: { width: 1280, height: 720 } },
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  outputDir: "playwright-results",
});
