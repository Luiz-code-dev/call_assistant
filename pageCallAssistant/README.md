# SpeakFlow Web Platform

Plataforma SaaS do SpeakFlow — autenticação, planos, ferramentas de IA, comunidade de prática e certificação em inglês.

> **Parte do ecossistema SpeakFlow.** Para o app desktop (Electron + Java + Rust), veja [`../call-assistant`](../call-assistant).

---

## Estrutura do projeto

```
pageCallAssistant/
├── app/
│   ├── api/
│   │   ├── auth/           # login, register, me, logout, verify-email, forgot/reset-password
│   │   ├── billing/        # Stripe checkout, webhook, portal
│   │   ├── network/        # circles, challenges, submissions, leaderboard, proficiency, push
│   │   ├── tools/          # improve, generate, interview
│   │   ├── wallet/         # créditos (balance, transactions, topup)
│   │   └── support/        # formulário de contato
│   ├── dashboard/          # Dashboard principal do usuário
│   ├── tools/
│   │   ├── improve/        # Melhorar Resposta
│   │   ├── generate/       # Gerar Resposta
│   │   └── interview/      # Treino de Entrevista
│   ├── network/
│   │   ├── [circleId]/     # Circle + desafios + leaderboard
│   │   │   ├── challenge/[challengeId]/  # Submissão + avaliação IA
│   │   │   └── manage/     # Gerenciar Circle (owner)
│   │   ├── circles/        # Explorar circles públicos
│   │   ├── progress/       # Progresso do usuário + CEFR
│   │   ├── certificate/    # Certificado de Proficiência (Premium)
│   │   ├── invite/[token]/ # Convite por link
│   │   └── join/[token]/   # Entrar via token
│   ├── pricing/            # Tabela de planos + Stripe checkout
│   ├── settings/           # Conta, senha, avatar, assinatura
│   ├── guia/               # Documentação interativa para usuários
│   ├── login/ register/ forgot-password/ reset-password/ verify-email/
│   └── page.tsx            # Landing page
├── components/
│   ├── Navbar.tsx
│   ├── SupportChat.tsx     # Spark — chatbot de suporte 24h
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── auth.ts             # JWT encode/decode (jose)
│   ├── db.ts               # Prisma Client singleton
│   ├── openai.ts           # OpenAI Client singleton
│   ├── email.ts            # Resend — todos os templates de e-mail
│   ├── planGuard.ts        # Middleware de acesso por plano
│   └── api.ts              # Helpers de API
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## Banco de dados — Modelos Prisma

| Modelo | Descrição |
|---|---|
| `User` | Usuário com plano, créditos, Stripe IDs, avatar |
| `CreditTransaction` | Histórico de movimentação de créditos |
| `CallSession` | Sessões do app desktop (transcrição, resumo) |
| `ToolUsage` | Registro de uso das ferramentas de IA |
| `Circle` | Grupo de prática (focus, level, visibility, inviteToken) |
| `CircleMember` | Membro de Circle com role (owner/member) e inviteToken |
| `Challenge` | Desafio de um Circle (written ou spoken, com datas) |
| `Submission` | Resposta de um usuário a um desafio |
| `SubmissionEvaluation` | Avaliação IA da submissão (fluency/content/clarity 0-10) |
| `ProficiencyAssessment` | Avaliação CEFR (A1-C2) gerada por IA — certificado Premium |
| `UserBadge` | Selos conquistados no Network |
| `PushSubscription` | Subscription de Web Push por dispositivo |
| `SupportMessage` | Mensagens do formulário de contato (Spark) |

---

## Planos e limites

| Recurso | Gratuito | Básico (R$74,90/mês) | Premium (R$149,90/mês) |
|---|---|---|---|
| Créditos iniciais | 50 | — | — |
| Créditos/mês | — | 500 | 1.000 |
| Melhorar Resposta | ❌ | 5x/dia | Ilimitado |
| Gerar Resposta | ❌ | 5x/dia | Ilimitado |
| Treino de Entrevista | ❌ | 3 sessões/dia | Ilimitado |
| Criar Circles | ❌ | 1 Circle | Ilimitado |
| Participar de Circles | Até 2 | Ilimitado | Ilimitado |
| Avaliação CEFR | ✅ (ver nível) | ✅ (ver nível) | ✅ |
| Certificado de Proficiência | ❌ | ❌ | ✅ (nível B1+) |
| Recarga avulsa de créditos | ❌ | ✅ | ✅ |

---

## API — Rotas principais

### Autenticação (`/api/auth`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro + e-mail de verificação |
| POST | `/api/auth/login` | Login — retorna JWT |
| GET | `/api/auth/me` | Dados do usuário autenticado |
| POST | `/api/auth/logout` | Invalida sessão |
| POST | `/api/auth/verify-email` | Verifica token de e-mail |
| POST | `/api/auth/forgot-password` | Envia e-mail de reset |
| POST | `/api/auth/reset-password` | Define nova senha via token |
| PATCH | `/api/auth/change-password` | Altera senha (autenticado) |
| PATCH | `/api/auth/update-profile` | Atualiza nome, username, avatar |

### Billing (`/api/billing`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/billing/checkout` | Cria sessão Stripe (plano ou top-up) |
| POST | `/api/billing/webhook` | Webhook Stripe (subscription/payment events) |
| POST | `/api/billing/portal` | Abre portal de gerenciamento Stripe |

### Ferramentas (`/api/tools`)

| Método | Rota | Descrição | Custo |
|---|---|---|---|
| POST | `/api/tools/improve` | Melhora texto em inglês | 2 créditos |
| POST | `/api/tools/generate` | Gera resposta EN a partir de contexto PT | 2 créditos |
| POST | `/api/tools/interview` | Pergunta de entrevista personalizada | 2 créditos |

### Network (`/api/network`)

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/network/circles` | Listar/criar circles |
| GET/PATCH/DELETE | `/api/network/circles/[id]` | Gerenciar circle |
| GET/POST | `/api/network/challenges` | Listar/criar desafios |
| GET/POST | `/api/network/submissions` | Listar/criar submissões |
| PATCH/DELETE | `/api/network/submissions/[id]` | Selecionar/deletar submissão |
| POST | `/api/network/submissions/[id]/evaluate` | Avaliar submissão com IA |
| POST | `/api/network/submissions/audio` | Transcrever áudio (Whisper) + submeter |
| GET | `/api/network/leaderboard/[circleId]` | Ranking do Circle |
| POST/GET | `/api/network/proficiency` | Avaliação CEFR + buscar último assessment |
| GET/POST | `/api/network/invites/[token]` | Convites por token |
| POST | `/api/network/push/subscribe` | Registrar Web Push |

---

## Detecção de alucinação Whisper

Submissões de áudio passam por filtro anti-alucinação antes de salvar:

```typescript
// app/api/network/submissions/audio/route.ts
function isWhisperHallucination(text: string): boolean {
  if (text.length < 4) return true;
  if (/[◆♪♫♩♬✦◉]/.test(text)) return true;       // símbolos suspeitos
  if (/(.)\1{3,}/.test(text)) return true;          // chars repetidos
  const stripped = text.replace(/\s/g, "");
  if (stripped.length > 15 &&
      new Set(stripped).size / stripped.length < 0.05) return true; // baixa diversidade
  // frases conhecidas de alucinação
  const hallucinations = ["thank you for watching", "subtitles by", "www.", "http"];
  return hallucinations.some((h) => text.toLowerCase().includes(h));
}
```

Gravações com menos de 3 segundos são bloqueadas no cliente antes de enviar.

---

## Certificado de Proficiência CEFR

Fluxo completo (exclusivo Premium):

```
Usuário (mín. 3 avaliações)
        │
        ▼
POST /api/network/proficiency
        │
        ▼  prompt especialista CEFR (A1–C2)
OpenAI GPT-4o-mini
        │
        ▼
ProficiencyAssessment salvo no DB
(level, levelLabel, fluencyAvg, isEligible)
        │
        ├── isEligible=true (nível B1+ E plano Premium)
        │       └── /network/certificate → certificado imprimível
        │
        └── isEligible=false → feedback sem certificado
```

---

## Configuração local

### Pré-requisitos

- Node.js 20+
- PostgreSQL (ou Docker)
- Conta OpenAI com créditos
- Conta Stripe (mode test)
- Conta Resend

### Setup

```bash
cd pageCallAssistant

# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# Preencha DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, STRIPE_*, RESEND_API_KEY

# 3. Rodar migrations
npx prisma migrate dev

# 4. Iniciar em dev
npm run dev
```

Acesse: http://localhost:3000

### Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (inclui `prisma generate`) |
| `npm run start` | Produção (inclui `prisma migrate deploy`) |
| `npm run db:migrate` | Aplica migrations pendentes |

---

## Deploy (Railway)

O deploy é automático via GitHub → Railway na branch `main`.

O `Dockerfile` usa build multistage:
1. **deps** — instala `node_modules`
2. **builder** — gera Prisma Client + `next build`
3. **runner** — imagem mínima Alpine, expõe porta 3000

Variáveis de ambiente necessárias no Railway:

```
DATABASE_URL
JWT_SECRET
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PRICE_BASIC
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM
NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5
NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10
NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

---

## Segurança

- Senhas: `bcryptjs` (salt rounds 10)
- Auth: JWT signed com `HS256` via `jose`, expiry 7d
- Middleware: valida token em todas as rotas `/dashboard`, `/tools`, `/network`, `/settings`, `/usage`
- Plan guard: `lib/planGuard.ts` verifica plano antes de consumir créditos
- Stripe: webhook validado com `STRIPE_WEBHOOK_SECRET`
- Whisper: anti-hallucination filter server-side + client-side min 3s

---

© 2026 Luiz Eduardo da Silva Dias Melo — Todos os direitos reservados.
