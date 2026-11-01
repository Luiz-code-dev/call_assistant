/**
 * Setup global para os testes de integração do SpeakFlow Escolas.
 *
 * Variáveis de ambiente necessárias (ex.: .env.test.local):
 *   TEST_PG_URL=<url-sem-credenciais>   # ex.: postgresql://localhost:55432
 *   ESCOLAS_APP_DB_PASSWORD=<gerado>    # openssl rand -hex 12
 *   ESCOLAS_CATALOG_URL=<url>
 *   ESCOLAS_DB_URL=<url>
 *   ESCOLAS_DB_01_URL=<url>
 *   ESCOLAS_DB_02_URL=<url>
 *
 * Veja README-testes.md para instruções completas de setup local.
 * Se TEST_PG_URL não estiver definido, todos os testes falham imediatamente
 * (não pulam — o requisito é explícito: sem banco disponível, o teste falha).
 */
import { beforeAll } from "vitest";
import pg from "pg";

const PG_URL = process.env.TEST_PG_URL;

beforeAll(async () => {
  if (!PG_URL) {
    throw new Error(
      "TEST_PG_URL não definido. " +
      "Suba o docker: docker compose -f docker-compose.test.yml up -d && " +
      "Veja README-testes.md para configurar TEST_PG_URL"
    );
  }

  // Verifica conectividade com o banco de teste
  const client = new pg.Client(PG_URL + "/postgres");
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
  } catch (err) {
    throw new Error(
      `Não foi possível conectar ao banco de teste em ${PG_URL}. ` +
      `Erro: ${(err as Error).message}`
    );
  }
});
