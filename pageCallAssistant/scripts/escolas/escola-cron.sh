#!/bin/sh
# Cron de avaliação IA — chamado a cada minuto pelo Railway Cron Service.
# Variáveis de ambiente necessárias: APP_URL, CRON_SECRET
set -e

ENDPOINT="${APP_URL}/api/escola/cron/evaluate"

response=$(curl -fsS \
  -X POST "$ENDPOINT" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 290 \
  -w "\n%{http_code}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "[escola-cron] $(date -u +%FT%TZ) status=$http_code body=$body"

if [ "$http_code" != "200" ]; then
  echo "[escola-cron] ERRO: status inesperado $http_code" >&2
  exit 1
fi
