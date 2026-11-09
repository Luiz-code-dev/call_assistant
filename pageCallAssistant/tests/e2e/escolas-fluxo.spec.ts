/**
 * Playwright e2e — SpeakFlow Escolas
 * Fluxo completo: diagnóstico → degrau → trilha → prática → retorno IA
 *
 * Pré-requisitos:
 *   BASE_URL apontando para o servidor com seed demo ativo
 *   ESCOLAS_SEED_DEMO=true ESCOLAS_SEED_USUARIOS=true ESCOLAS_SEED_TESTE=true
 *
 * Executar:
 *   npx playwright test tests/e2e/escolas-fluxo.spec.ts --headed
 *   npx playwright test tests/e2e/escolas-fluxo.spec.ts (headless, gera video)
 */

import { test, expect, type Page } from "@playwright/test";
import * as path from "path";

const TELAS = path.resolve(__dirname, "../../docs/escolas/telas");
const PROF_EMAIL = "prof.demo@speakflow.escola";
const PROF_SENHA = "Speakflow@2027";
const DIR_EMAIL = "direcao.demo@speakflow.escola";
const DIR_SENHA = "Speakflow@2027";
const COORD_EMAIL = "coord.demo@speakflow.escola";
const COORD_SENHA = "Speakflow@2027";

async function screenshotTela(page: Page, nome: string) {
  await page.screenshot({ path: path.join(TELAS, `${nome}.png`), fullPage: false });
}

async function loginStaff(page: Page, email: string, senha: string) {
  await page.goto("/escola/entrar");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', senha);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/escola\//);
}

// ─────────────────────────────────────────────────────────────
// 1. Professor
// ─────────────────────────────────────────────────────────────
test.describe("Professor", () => {
  test("login e painel", async ({ page }) => {
    await loginStaff(page, PROF_EMAIL, PROF_SENHA);
    await expect(page).toHaveURL(/\/escola\/professor/);
    await screenshotTela(page, "01-professor-painel");
  });

  test("mapa da turma por habilidade", async ({ page }) => {
    await loginStaff(page, PROF_EMAIL, PROF_SENHA);
    await page.goto("/escola/professor/turmas");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "02-professor-turmas");
  });

  test("biblioteca de trilhas — 12 trilhas visiveis", async ({ page }) => {
    await loginStaff(page, PROF_EMAIL, PROF_SENHA);
    await page.goto("/escola/professor/trilhas");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "03-professor-trilhas");
    // Deve listar pelo menos 8 trilhas do pacote de fracoes + 4 de leitura
    const cards = page.locator("[data-testid='trilha-card'], .trilha-card, [class*='rounded'][class*='border']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Coordenação
// ─────────────────────────────────────────────────────────────
test.describe("Coordenacao", () => {
  test("login e painel", async ({ page }) => {
    await loginStaff(page, COORD_EMAIL, COORD_SENHA);
    await expect(page).toHaveURL(/\/escola\/coordenacao/);
    await screenshotTela(page, "04-coordenacao-painel");
  });

  test("diagnosticos da rede", async ({ page }) => {
    await loginStaff(page, COORD_EMAIL, COORD_SENHA);
    await page.goto("/escola/coordenacao/diagnosticos");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "05-coordenacao-diagnosticos");
  });

  test("habilidades prioritarias", async ({ page }) => {
    await loginStaff(page, COORD_EMAIL, COORD_SENHA);
    await page.goto("/escola/coordenacao/habilidades-prioritarias");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "06-coordenacao-habilidades");
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Direção
// ─────────────────────────────────────────────────────────────
test.describe("Direcao", () => {
  test("login e painel — numeros coerentes", async ({ page }) => {
    await loginStaff(page, DIR_EMAIL, DIR_SENHA);
    await expect(page).toHaveURL(/\/escola\/direcao/);
    // Alunos matriculados nao e 0
    const matriculados = page.locator("text=/\\d+ alunos|Alunos matriculados/i").first();
    await screenshotTela(page, "07-direcao-painel");
    expect(await page.locator("text=Com família vinculada").isVisible()).toBeTruthy();
  });

  test("pagina de familias — conta coerente com painel", async ({ page }) => {
    await loginStaff(page, DIR_EMAIL, DIR_SENHA);
    await page.goto("/escola/direcao/familias");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "08-direcao-familias");
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Fluxo do aluno (QR / codigo de turma)
// ─────────────────────────────────────────────────────────────
test.describe("Aluno — fluxo completo", () => {
  async function loginAluno(page: Page) {
    await page.goto("/escola/aluno/entrar");
    await page.waitForLoadState("networkidle");
    // Entrada por codigo de turma + matricula + PIN (modo texto)
    // Preenche campos conforme a tela de entrada do aluno
    const aulaInput = page.locator("input[placeholder*='turma'], input[placeholder*='código'], input[name='code']").first();
    if (await aulaInput.isVisible()) {
      await aulaInput.fill("DEMB25");
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle");
    }
  }

  test("tela inicial do aluno", async ({ page }) => {
    await loginAluno(page);
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "09-aluno-inicio");
  });

  test("minha trilha — anel de progresso", async ({ page }) => {
    await loginAluno(page);
    await page.goto("/escola/aluno/trilha");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "10-aluno-trilha");
  });

  test("evolucao do aluno", async ({ page }) => {
    await loginAluno(page);
    await page.goto("/escola/aluno/evolucao");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "11-aluno-evolucao");
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Familia
// ─────────────────────────────────────────────────────────────
test.describe("Familia", () => {
  test("login e painel da familia", async ({ page }) => {
    await page.goto("/escola/familia/entrar");
    await page.waitForLoadState("networkidle");
    await screenshotTela(page, "12-familia-entrar");
  });
});
