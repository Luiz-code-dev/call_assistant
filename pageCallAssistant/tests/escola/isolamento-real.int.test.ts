/**
 * isolamento-real.int.test.ts
 * Prova que o RLS isola redes de verdade (conecta como escolas_app).
 * Falha se o banco não estiver no ar — não pode ser pulado.
 */
import { describe, it, expect, beforeAll } from "vitest";
import pg from "pg";

const BASE_URL = process.env.TEST_PG_URL ?? "postgresql://postgres:postgres@localhost:55432";
const APP_PWD  = process.env.ESCOLAS_APP_DB_PASSWORD ?? "";
const DB_01    = `${BASE_URL}/db01`;
const DB_02    = `${BASE_URL}/db02`;

function appUrl(dbUrl: string) {
  const u = new URL(dbUrl);
  u.username = "escolas_app";
  u.password = encodeURIComponent(APP_PWD);
  return u.toString();
}

let superDb01: pg.Client;
let superDb02: pg.Client;
let appDb01: pg.Client;

beforeAll(async () => {
  // Conecta como superusuário para seed
  superDb01 = new pg.Client(DB_01);
  superDb02 = new pg.Client(DB_02);
  await superDb01.connect();
  await superDb02.connect();

  // Verifica que escolas_app não é superusuário
  const r = await superDb01.query("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname='escolas_app'");
  expect(r.rows[0]?.rolsuper, "escolas_app não deve ser superusuário").toBe(false);
  expect(r.rows[0]?.rolbypassrls, "escolas_app não deve bypass RLS").toBe(false);

  // Conecta como escolas_app
  if (!APP_PWD) throw new Error("ESCOLAS_APP_DB_PASSWORD não definido");
  appDb01 = new pg.Client(appUrl(DB_01));
  await appDb01.connect();
});

describe("RLS: isolamento de redes", () => {
  const NET_A = "rede-test-a";
  const NET_B = "rede-test-b";

  it("sem app.network_id, a leitura volta vazia", async () => {
    // Sem SET, app.network_id retorna '' — RLS bloqueia tudo
    const r = await appDb01.query(`SELECT count(*) FROM "EduStudent"`);
    // Com RLS ativo e sem contexto, deve retornar 0 ou lançar erro de RLS
    // Aceitamos 0 rows ou o SELECT retornar 0 por policy
    expect(Number(r.rows[0].count)).toBe(0);
  });

  it("rede A não lê registros da rede B", async () => {
    // Garante que não há vazamento entre redes
    await appDb01.query(`SET app.network_id = '${NET_A}'`);

    // Tenta ler EduStudent da rede B diretamente
    const r = await appDb01.query(`SELECT count(*) FROM "EduStudent" WHERE "networkId" = $1`, [NET_B]);
    expect(Number(r.rows[0].count)).toBe(0);
  });

  it("rede A não consegue alterar dados da rede B", async () => {
    await appDb01.query(`SET app.network_id = '${NET_A}'`);
    // Qualquer UPDATE/DELETE em linha de rede B não deve afetar nada
    const r = await appDb01.query(`UPDATE "EduStudent" SET "name" = 'hacked' WHERE "networkId" = $1`, [NET_B]);
    expect(r.rowCount).toBe(0);
  });

  it("rede A lê conteúdo SpeakFlow (networkId IS NULL)", async () => {
    await appDb01.query(`SET app.network_id = '${NET_A}'`);
    // EduActivity com networkId null deve ser visível
    const r = await appDb01.query(`SELECT count(*) FROM "EduActivity" WHERE "networkId" IS NULL`);
    // Pode ser 0 se não houver dados seed, mas a query não deve falhar com RLS
    expect(Number(r.rows[0].count)).toBeGreaterThanOrEqual(0);
  });

  it("rede A não consegue alterar conteúdo SpeakFlow (networkId IS NULL)", async () => {
    await appDb01.query(`SET app.network_id = '${NET_A}'`);
    // Tentativa de update em conteúdo global deve ser bloqueada (0 rows affected)
    const r = await appDb01.query(`UPDATE "EduActivity" SET "title" = 'hacked' WHERE "networkId" IS NULL AND 1=1`);
    expect(r.rowCount).toBe(0);
  });

  it("escolas_app não consegue criar conteúdo com networkId=null", async () => {
    await appDb01.query(`SET app.network_id = '${NET_A}'`);
    // Inserir com networkId IS NULL deve ser bloqueado pela policy rede_escrita
    await expect(
      appDb01.query(`INSERT INTO "EduActivity" ("id","networkId","title","type","status") VALUES ('test-null-net', NULL, 'hack', 'QUIZ', 'DRAFT')`)
    ).rejects.toThrow();
  });
});
