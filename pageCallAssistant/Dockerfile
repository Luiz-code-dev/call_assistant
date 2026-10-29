# Next.js production build - wallet migration v3
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts --legacy-peer-deps

FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_VAPID_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STRIPE_PRICE_BASIC
ARG NEXT_PUBLIC_STRIPE_PRICE_PREMIUM
ARG NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5
ARG NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10
ARG NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25
ARG NEXT_PUBLIC_STRIPE_PRICE_CREDITS_50
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_VAPID_KEY=$NEXT_PUBLIC_VAPID_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PRICE_BASIC=$NEXT_PUBLIC_STRIPE_PRICE_BASIC
ENV NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=$NEXT_PUBLIC_STRIPE_PRICE_PREMIUM
ENV NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5=$NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5
ENV NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10=$NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10
ENV NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25=$NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25
ENV NEXT_PUBLIC_STRIPE_PRICE_CREDITS_50=$NEXT_PUBLIC_STRIPE_PRICE_CREDITS_50

RUN npx prisma generate
RUN npx prisma generate --schema prisma/escolas/schema.prisma
RUN npx prisma generate --schema prisma/escolas-catalogo/schema.prisma
RUN npm run build

FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public* ./public/
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schemas, migrations e dados BNCC
COPY --from=builder /app/prisma ./prisma

# Clientes Prisma gerados (inclui @prisma/escolas e @prisma/escolas-catalogo)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# CLI do Prisma instalada na imagem (mesma versão do package.json)
# Evita download em runtime via npx prisma@5
# IMPORTANTE: NÃO copiar node_modules/.bin/prisma (é symlink no Linux; Docker segue o symlink
# e copia o conteúdo para .bin/, mudando __dirname e quebrando a busca pelo .wasm)
# Em vez disso, criamos um wrapper em /usr/local/bin/prisma que invoca node com caminho correto.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
RUN printf '#!/bin/sh\nexec node /app/node_modules/prisma/build/index.js "$@"\n' \
    > /usr/local/bin/prisma && chmod +x /usr/local/bin/prisma

# Scripts de migração e start
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Dependências runtime dos scripts (bcryptjs para invite-account, etc.)
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Normaliza CRLF→LF (seguro mesmo que o arquivo já tenha LF) e torna executável
RUN sed -i 's/\r$//' scripts/start.sh && chmod +x scripts/start.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "scripts/start.sh"]
