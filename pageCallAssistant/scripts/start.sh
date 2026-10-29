#!/bin/sh
set -e

# Garante que o CLI do Prisma copiado para node_modules/.bin esteja no PATH
export PATH="/app/node_modules/.bin:$PATH"

echo "[start] migrando banco SpeakFlow AI"
prisma migrate deploy

echo "[start] migrando catálogo do Escolas"
prisma migrate deploy --schema prisma/escolas-catalogo/schema.prisma

echo "[start] registrando bases no catálogo (idempotente)"
node scripts/escolas/bootstrap-catalogo.mjs

echo "[start] migrando bases tenant (idempotente, com lock)"
node scripts/escolas/migrate-all.mjs

echo "[start] importando BNCC (idempotente, com lock)"
node scripts/escolas/bncc-import.mjs

if [ "$ESCOLAS_SEED_DEMO" = "true" ]; then
  echo "[start] seed demo"
  node scripts/escolas/seed-demo.mjs
fi

echo "[start] iniciando o servidor"
exec node server.js
