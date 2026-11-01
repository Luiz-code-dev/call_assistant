# Testes de Integração — SpeakFlow Escolas

## Setup local (docker-compose.test.yml)

As senhas **nunca** ficam escritas no código. Gere-as localmente:

```bash
export POSTGRES_TEST_PASSWORD="$(openssl rand -hex 16)"
export ESCOLAS_APP_DB_PASSWORD="$(openssl rand -hex 12)"

docker compose -f docker-compose.test.yml up -d
# aguardar healthcheck (≈ 10 s)

export TEST_PG_URL="postgresql://postgres:${POSTGRES_TEST_PASSWORD}@localhost:55432"
export ESCOLAS_CATALOG_URL="${TEST_PG_URL}/catalogo"
export ESCOLAS_DB_URL="${TEST_PG_URL}/db01"
export ESCOLAS_DB_01_URL="${TEST_PG_URL}/db01"
export ESCOLAS_DB_02_URL="${TEST_PG_URL}/db02"

START_SERVER=false sh scripts/start.sh   # migra + provisiona
npm run escolas:test:int
```

> **Nunca** adicione essas variáveis ao `.env` versionado nem as escreva em nenhum arquivo do repositório.

## CI (GitHub Actions)

O workflow `escolas-ci` (em `.github/workflows/escolas-ci.yml` na raiz do monorepo) gera todas as senhas com `openssl rand` a cada execução. Nenhuma senha fixa existe no código.

## Variáveis necessárias

| Variável | Origem |
|---|---|
| `POSTGRES_TEST_PASSWORD` | `openssl rand -hex 16` |
| `ESCOLAS_APP_DB_PASSWORD` | `openssl rand -hex 12` |
| `TEST_PG_URL` | construída a partir da senha gerada |
| `ESCOLAS_DB_01_URL` | construída a partir de `TEST_PG_URL` |
| `ESCOLAS_DB_02_URL` | construída a partir de `TEST_PG_URL` |
| `ESCOLAS_CATALOG_URL` | construída a partir de `TEST_PG_URL` |
