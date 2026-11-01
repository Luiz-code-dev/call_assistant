/**
 * Setup global para os testes de integração do SpeakFlow Escolas.
 *
 * Variáveis de ambiente necessárias (ex.: .env.test.local):
 *   TEST_PG_URL=postgresql://postgres:postgres@localhost:55432
 *   ESCOLAS_APP_DB_PASSWORD=@#%'/!
 *   ESCOLAS_CATALOG_URL=postgresql://postgres:postgres@localhost:55432/catalogo
 *   ESCOLAS_DB_URL=postgresql://postgres:postgres@localhost:55432/db01
 *   ESCOLAS_DB_01_URL=postgresql://postgres:postgres@localhost:55432/db01
 *   ESCOLAS_DB_02_URL=postgresql://postgres:postgres@localhost:55432/db02
 *
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
      "exporte TEST_PG_URL=postgresql://postgres:postgres@localhost:55432"
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
