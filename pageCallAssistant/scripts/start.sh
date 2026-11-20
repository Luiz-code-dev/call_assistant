#!/bin/sh
set -e

# Garante que o CLI do Prisma esteja no PATH (Docker via wrapper /usr/local/bin/prisma;
# CI e local via node_modules/.bin do projeto)
export PATH="$(pwd)/node_modules/.bin:/app/node_modules/.bin:$PATH"

# APP_SCOPE=escolas: esta instancia serve so o SpeakFlow Escolas. Nao migra o banco do
# SpeakFlow IA (que nem precisa existir) e fecha as rotas dele. Sem a variavel, nada muda.
ESCOPO="$(printf '%s' "${APP_SCOPE:-}" | tr -d "\"'[:space:]" | tr '[:upper:]' '[:lower:]')"

if [ "$ESCOPO" = "escolas" ]; then
  echo "[start] APP_SCOPE=escolas: banco do SpeakFlow AI nao e migrado nesta instancia"
  # As rotas do SpeakFlow IA aceitam o segredo padrao de desenvolvimento quando JWT_SECRET
  # nao existe. Aqui elas nao sao usadas: um segredo aleatorio a cada inicializacao (mesmo
  # que alguem tenha copiado o JWT_SECRET de outro ambiente) garante que nenhuma sessao do
  # SpeakFlow IA seja aceita por esta instancia. O Escolas usa EDU_JWT_SECRET,
  # EDU_STUDENT_JWT_SECRET e EDU_FAMILY_JWT_SECRET, que nao sao tocados.
  JWT_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("hex"))')"
  export JWT_SECRET
else
  echo "[start] migrando banco SpeakFlow AI"
  prisma migrate deploy
fi

echo "[start] migrando catálogo do Escolas"
prisma migrate deploy --schema prisma/escolas-catalogo/schema.prisma

echo "[start] registrando bases no catálogo (idempotente)"
node scripts/escolas/bootstrap-catalogo.mjs

echo "[start] migrando bases tenant (idempotente, com lock)"
node scripts/escolas/migrate-all.mjs

echo "[start] verificando papel escolas_app (sem BYPASSRLS)"
node scripts/escolas/check-app-role.mjs

echo "[start] importando BNCC (idempotente, com lock)"
node scripts/escolas/bncc-import.mjs

echo "[start] importando conteudo SpeakFlow (idempotente, com lock)"
if [ "$CONTEUDO_FORCE_FAIL" = "true" ]; then
  echo "[start] AVISO: CONTEUDO_FORCE_FAIL=true — importacao de conteudo ignorada intencionalmente"
else
  node scripts/escolas/conteudo-import.mjs || echo "[start] AVISO: importacao de conteudo falhou; servidor sobe sem o conteudo novo"
fi

echo "[start] importando pacote de demonstracao (idempotente, com lock)"
node scripts/escolas/conteudo-pacote-import.mjs || echo "[start] AVISO: importacao do pacote de demonstracao falhou; servidor sobe normalmente"

if [ "$ESCOLAS_SEED_DEMO" = "true" ]; then
  echo "[start] seed demo"
  node scripts/escolas/seed-demo.mjs
fi

if [ "$ESCOLAS_SEED_USUARIOS" = "true" ]; then
  echo "[start] seed usuarios demo"
  node scripts/escolas/seed-usuarios-demo.mjs
fi

if [ "$ESCOLAS_SEED_TESTE" = "true" ]; then
  echo "[start] seed teste de usabilidade"
  node scripts/escolas/seed-teste-usabilidade.mjs
fi

if [ "$START_SERVER" = "false" ]; then
  echo "[start] START_SERVER=false — encerrando sem iniciar o servidor (modo CI)"
  exit 0
fi

echo "[start] iniciando o servidor"
exec node server.js
