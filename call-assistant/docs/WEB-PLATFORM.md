# DOCUMENTAÇÃO TÉCNICA — SPEAKFLOW WEB PLATFORM

**Versão:** 1.0.0  
**Autor:** Luiz Eduardo da Silva Dias Melo  
**Data:** 23 de abril de 2026  
**Localização:** `pageCallAssistant/`

---

## 1. VISÃO GERAL

A Plataforma Web do SpeakFlow é um SaaS construído com Next.js 14 que fornece:

- Autenticação e gestão de conta
- Sistema de créditos e assinaturas via Stripe
- Ferramentas de prática de inglês com IA
- SpeakFlow Network (Circles, Challenges, Avaliação IA)
- Avaliação CEFR e Certificado de Proficiência (Premium)
- Spark — chatbot de suporte 24h

---

## 2. STACK TÉCNICA

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router + RSC) | 14.2.x |
| Linguagem | TypeScript strict | 5.7.x |
| Estilização | TailwindCSS + shadcn/ui (Radix UI) | 3.4.x |
| ORM | Prisma Client | 5.22.x |
| Banco | PostgreSQL | 16 |
| Auth | JWT via jose + bcryptjs | jose 5.9, bcrypt 2.4 |
| IA | OpenAI SDK | 6.34.x |
| Pagamentos | Stripe | 16.12.x |
| E-mail | Resend | 6.10.x |
| Forms | react-hook-form + zod | — |
| Notificações | Web Push API (browser) | — |
| Deploy | Railway (Docker multistage) | — |

---

## 3. ESTRUTURA DE ARQUIVOS

```
pageCallAssistant/
├── app/
│   ├── layout.tsx                  # Root layout, Navbar global, Toaster
│   ├── page.tsx                    # Landing page pública
│   ├── globals.css                 # CSS global + variáveis de tema
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # POST — gera JWT, seta cookie httpOnly
│   │   │   ├── register/route.ts   # POST — bcrypt hash, envia e-mail verificação
│   │   │   ├── logout/route.ts     # POST — limpa cookie
│   │   │   ├── me/route.ts         # GET — retorna usuário autenticado
│   │   │   ├── verify-email/       # GET — valida token de e-mail
│   │   │   ├── forgot-password/    # POST — envia link de reset
│   │   │   ├── reset-password/     # POST — define nova senha por token
│   │   │   ├── change-password/    # PATCH — altera senha (auth)
│   │   │   └── update-profile/     # PATCH — nome, username, avatar
│   │   │
│   │   ├── billing/
│   │   │   ├── checkout/route.ts   # POST — cria sessão Stripe
│   │   │   ├── webhook/route.ts    # POST — eventos Stripe (subscription/payment)
│   │   │   └── portal/route.ts     # POST — redireciona para portal Stripe
│   │   │
│   │   ├── tools/
│   │   │   ├── improve/route.ts    # POST — melhora texto EN (GPT-4o-mini)
│   │   │   ├── generate/route.ts   # POST — gera respostas EN a partir de PT
│   │   │   └── interview/route.ts  # POST — pergunta de entrevista personalizada
│   │   │
│   │   ├── network/
│   │   │   ├── circles/
│   │   │   │   ├── route.ts                    # GET (list) / POST (create)
│   │   │   │   └── [id]/route.ts               # GET / PATCH / DELETE
│   │   │   ├── challenges/route.ts             # GET / POST
│   │   │   ├── submissions/
│   │   │   │   ├── route.ts                    # GET / POST
│   │   │   │   ├── audio/route.ts              # POST (Whisper + anti-hallucination)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts                # PATCH (isSelected) / DELETE
│   │   │   │       └── evaluate/route.ts       # POST (GPT-4o-mini eval)
│   │   │   ├── leaderboard/[circleId]/route.ts # GET
│   │   │   ├── proficiency/route.ts            # POST (assess) / GET (latest)
│   │   │   ├── users/route.ts                  # GET (busca por username/email)
│   │   │   ├── invites/[token]/route.ts        # GET / POST
│   │   │   └── push/subscribe/route.ts         # POST
│   │   │
│   │   ├── wallet/
│   │   │   ├── balance/route.ts    # GET — saldo atual
│   │   │   ├── transactions/route.ts # GET — histórico
│   │   │   └── topup/route.ts      # POST — recarga manual (admin)
│   │   │
│   │   └── support/contact/route.ts # POST — salva mensagem + envia e-mail
│   │
│   ├── dashboard/page.tsx          # Dashboard: créditos, sessões, links
│   │
│   ├── tools/
│   │   ├── page.tsx                # Hub das ferramentas de IA
│   │   ├── improve/page.tsx        # Melhorar Resposta
│   │   ├── generate/page.tsx       # Gerar Resposta
│   │   └── interview/page.tsx      # Treino de Entrevista
│   │
│   ├── network/
│   │   ├── [circleId]/
│   │   │   ├── page.tsx                        # Feed + ranking do Circle
│   │   │   ├── challenge/[challengeId]/page.tsx # Desafio: gravar/escrever + avaliação
│   │   │   └── manage/page.tsx                 # Gerenciar Circle (owner)
│   │   ├── circles/page.tsx        # Explorar circles públicos
│   │   ├── progress/page.tsx       # Progresso CEFR + selos + submissões
│   │   ├── certificate/page.tsx    # Certificado imprimível (Premium)
│   │   ├── invite/[token]/page.tsx # Landing de convite
│   │   └── join/[token]/page.tsx   # Aceitar convite
│   │
│   ├── pricing/
│   │   ├── page.tsx                # Server component (lê env vars)
│   │   └── PricingPageClient.tsx   # Client component (Stripe checkout)
│   │
│   ├── settings/page.tsx           # Conta, senha, assinatura, avatar
│   ├── guia/page.tsx               # Documentação interativa para usuários
│   ├── usage/page.tsx              # Histórico de uso + créditos
│   └── [auth pages]/               # login, register, forgot-password, etc.
│
├── components/
│   ├── Navbar.tsx                  # Barra de navegação com estado do usuário
│   ├── SupportChat.tsx             # Spark — chatbot de suporte in-app
│   └── ui/                        # Componentes shadcn/ui (Button, Card, Badge, etc.)
│
├── lib/
│   ├── auth.ts                     # getSession(), createToken(), getNetworkSession()
│   ├── db.ts                       # Prisma Client singleton (global em dev)
│   ├── openai.ts                   # OpenAI Client singleton
│   ├── email.ts                    # Todos os templates Resend (verificação, reset, convite)
│   ├── planGuard.ts                # checkPlanAccess() — verifica plano e consome créditos
│   ├── api.ts                      # apiFetch() helper com auth header
│   ├── username.ts                 # Validação e geração de usernames
│   └── utils.ts                    # cn() TailwindCSS merge
│
├── middleware.ts                   # Proteção de rotas por JWT
│
└── prisma/
    ├── schema.prisma
    └── migrations/
        └── 20260423000000_add_proficiency_assessment/migration.sql
```

---

## 4. AUTENTICAÇÃO

### Fluxo JWT

```
POST /api/auth/login
  → bcrypt.compare(password, hash)
  → jose.SignJWT({ sub, name, email, plan })
  → cookie httpOnly "sf_token" (7 dias)
  → sessionStorage "sf_token" (client-side para API calls)

Middleware (middleware.ts)
  → lê cookie "sf_token"
  → jose.jwtVerify()
  → redireciona para /login se inválido
  → protege: /dashboard, /tools, /network, /settings, /usage
```

### Verificação de E-mail

```
Register → gera verificationToken (cuid) + verificationExpiry (+24h)
         → envia e-mail Resend com link /verify-email?token=...
         → GET /api/auth/verify-email → marca emailVerified=true
```

### Reset de Senha

```
POST /api/auth/forgot-password
  → gera verificationToken + expiry (1h)
  → envia e-mail Resend com link /reset-password?token=...

POST /api/auth/reset-password
  → valida token + expiry
  → bcrypt.hash(newPassword)
  → limpa verificationToken
```

---

## 5. SISTEMA DE CRÉDITOS

### Modelo

Cada usuário tem `credits: Int` no modelo `User`. Movimentações são registradas em `CreditTransaction`.

| Evento | Movimento |
|---|---|
| Cadastro | +50 créditos |
| Assinatura Basic | +500 créditos (renovação mensal via webhook) |
| Assinatura Premium | +1.000 créditos (renovação mensal via webhook) |
| Pacote avulso 50cr | +50 créditos |
| Pacote avulso 150cr | +150 créditos |
| Pacote avulso 400cr | +400 créditos |
| Ferramenta de IA | -2 créditos por uso |

### Plan Guard (`lib/planGuard.ts`)

```typescript
checkPlanAccess(userId, tool, plan)
  → verifica se plano tem acesso à ferramenta
  → conta usos do dia (ToolUsage) para Basic
  → verifica saldo de créditos
  → decrementa créditos + registra ToolUsage
  → retorna { allowed, reason }
```

---

## 6. STRIPE — BILLING

### Checkout Flow

```
POST /api/billing/checkout
  { type: "subscription" | "topup", priceId }
  → cria ou recupera stripeCustomerId
  → stripe.checkout.sessions.create()
  → redireciona para URL do Stripe

Stripe → POST /api/billing/webhook
  → valida STRIPE_WEBHOOK_SECRET
  → "checkout.session.completed"
      → subscription: atualiza plan, stripeSubscriptionId
      → topup: adiciona créditos + CreditTransaction
  → "invoice.paid"
      → renova créditos mensais + atualiza planRenewsAt
  → "customer.subscription.deleted"
      → rebaixa para plan="free"
```

### Price IDs (Railway env vars)

```
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_...       # R$74,90/mês
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM=price_...     # R$149,90/mês
NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5=price_...   # 50cr — R$24,90
NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10=price_...  # 150cr — R$49,90
NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25=price_...  # 400cr — R$119,90
```

---

## 7. FERRAMENTAS DE IA

### Melhorar Resposta (`/api/tools/improve`)

**Input:** texto em inglês  
**Output:** versão melhorada + score (0–10) + feedback + explicação das mudanças  
**Modelo:** GPT-4o-mini  
**Custo:** 2 créditos  
**Limite Basic:** 5x/dia  

### Gerar Resposta (`/api/tools/generate`)

**Input:** contexto em português  
**Output:** 3 respostas em inglês (curta, profissional, detalhada) + tradução PT  
**Modelo:** GPT-4o-mini  
**Custo:** 2 créditos  
**Limite Basic:** 5x/dia  

### Treino de Entrevista (`/api/tools/interview`)

**Input:** cargo, nível, stack, tipo de pergunta  
**Output:** pergunta em inglês + áudio TTS (opcional) + avaliação da resposta  
**Modelo:** GPT-4o-mini  
**Custo:** 2 créditos por resposta  
**Limite Basic:** 3 sessões/dia  

---

## 8. SPEAKFLOW NETWORK

### Circles

```
Circle
├── ownerId (User)
├── name, description, focus, level
├── visibility: "public" | "private"
├── maxMembers (default: 20)
├── inviteToken (UUID único para convites)
└── members: CircleMember[]
    ├── role: "owner" | "member"
    └── status: "active" | "invited"
```

**Limites por plano:**
- Gratuito: participar de até 2 Circles, não pode criar
- Basic: criar 1 Circle, participar ilimitado
- Premium: criar e participar ilimitado

### Challenges

```
Challenge
├── circleId
├── title, prompt
├── type: "written" | "spoken"
├── startsAt, endsAt
└── isRecurring
```

### Avaliação de Submissões (GPT-4o-mini)

Scores gerados por IA para cada submissão:

| Score | Descrição | Range |
|---|---|---|
| `fluencyScore` | Fluência e naturalidade do inglês | 0–10 |
| `contentScore` | Relevância e profundidade do conteúdo | 0–10 |
| `clarityScore` | Clareza e organização das ideias | 0–10 |
| `totalScore` | Média ponderada dos 3 scores | 0–10 |

### Anti-Hallucination Filter (Áudio)

Submissões de áudio passam por filtro server-side antes de salvar:

```typescript
function isWhisperHallucination(text: string): boolean {
  if (text.length < 4) return true;
  if (/[◆♪♫♩♬✦◉]/.test(text)) return true;        // símbolos suspeitos
  if (/(.)\1{3,}/.test(text)) return true;           // chars repetidos (aaaa)
  const stripped = text.replace(/\s/g, "");
  if (stripped.length > 15 &&
      new Set(stripped).size / stripped.length < 0.05) return true; // baixa diversidade
  const hallucinations = ["thank you for watching", "subtitles by", "www.", "http"];
  return hallucinations.some((h) => text.toLowerCase().includes(h));
}
```

Gravações com menos de 3 segundos são rejeitadas no cliente.

---

## 9. CERTIFICADO DE PROFICIÊNCIA CEFR

### Níveis suportados

| Nível | Label | Descrição |
|---|---|---|
| A1 | Beginner | Expressões básicas e frases simples |
| A2 | Elementary | Comunicação em situações rotineiras |
| B1 | Intermediate | Lidar com situações durante viagens |
| B2 | Upper-Intermediate | Interagir com fluência em tópicos familiares |
| C1 | Advanced | Uso fluente e eficaz da língua |
| C2 | Proficient | Domínio equivalente ao nativo |

### Elegibilidade para Certificado

```
isEligible = isPremium (plano Premium)
           && ia.isEligible === true (IA confirma nivel adequado)
           && level ∈ {B1, B2, C1, C2}
```

### Prompt do Especialista CEFR

O prompt para GPT-4o-mini inclui:
- Definição de cada nível CEFR (A1–C2)
- Critérios de fluência, gramática, vocabulário e coerência
- Amostras das últimas 20 submissões avaliadas do usuário
- Scores médios de fluência, conteúdo e clareza
- Solicitação de resposta JSON com: `level`, `levelLabel`, `confidence`, `reasoning`, `strengths[]`, `improvements[]`, `overallFeedback`, `isEligible`

---

## 10. SPARK — CHATBOT DE SUPORTE

O `SupportChat.tsx` é um chatbot in-app com FAQs estáticos e CTAs dinâmicos.

### Estrutura de FAQ

```typescript
interface FAQ {
  id: string;
  q: string;               // Pergunta exibida
  a: string;               // Resposta (whitespace-pre-line)
  ctaLoggedIn?: FaqCta;   // Botão se usuário autenticado
  ctaLoggedOut?: FaqCta;  // Botão se usuário não autenticado
}
```

### FAQs disponíveis

| ID | Pergunta |
|---|---|
| `install` | Como instalar o SpeakFlow? |
| `credits` | Como funcionam os créditos? |
| `login` | Não consigo fazer login |
| `pricing` | Quais são os planos? |
| `cancel` | Como cancelar minha assinatura? |
| `copilot` | O que é o Copilot? |
| `tools` | O que são as Ferramentas de IA? |
| `interview` | Como funciona o Treino de Entrevista? |
| `tools-plan` | O plano Gratuito tem acesso às Ferramentas? |
| `network` | O que é o SpeakFlow Network? |
| `network-plan` | Quem pode criar ou entrar em Circles? |
| `certificate` | Como funciona o Certificado de Proficiência? |

CTAs do FAQ `certificate`: logado → `/pricing` · não logado → `/register`

---

## 11. MIDDLEWARE E SEGURANÇA

### `middleware.ts`

```typescript
// Rotas protegidas (requerem JWT válido):
const PROTECTED = ["/dashboard", "/tools", "/network", "/settings", "/usage"]

// Fluxo:
// 1. Lê cookie "sf_token"
// 2. jose.jwtVerify(token, JWT_SECRET)
// 3. Se inválido → redirect /login?from=pathname
// 4. Se válido → next()
```

### Segurança aplicada

| Mecanismo | Implementação |
|---|---|
| Hash de senhas | bcryptjs (salt rounds 10) |
| Tokens JWT | HS256, expiry 7 dias, httpOnly cookie |
| Webhook Stripe | `stripe.webhooks.constructEvent()` com `STRIPE_WEBHOOK_SECRET` |
| Validação de plano | `planGuard.ts` — server-side, antes de qualquer IA call |
| Anti-hallucination | Filtro Whisper server-side + mínimo 3s client-side |
| CORS | Gerenciado pelo Next.js (same-origin por padrão) |

---

## 12. VARIÁVEIS DE AMBIENTE

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Chave secreta JWT (mín. 32 chars) |
| `OPENAI_API_KEY` | ✅ | Chave OpenAI (GPT-4o-mini + Whisper) |
| `STRIPE_SECRET_KEY` | ✅ | Chave secreta Stripe |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Secret do webhook Stripe |
| `RESEND_API_KEY` | ✅ | Chave Resend para e-mails |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública (ex: https://speakflow.com.br) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Chave pública Stripe |
| `NEXT_PUBLIC_STRIPE_PRICE_BASIC` | ✅ | Price ID plano Basic |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` | ✅ | Price ID plano Premium |
| `NEXT_PUBLIC_STRIPE_PRICE_CREDITS_5` | ✅ | Price ID pacote 50cr |
| `NEXT_PUBLIC_STRIPE_PRICE_CREDITS_10` | ✅ | Price ID pacote 150cr |
| `NEXT_PUBLIC_STRIPE_PRICE_CREDITS_25` | ✅ | Price ID pacote 400cr |
| `VAPID_PUBLIC_KEY` | ⬜ | Web Push (notificações) |
| `VAPID_PRIVATE_KEY` | ⬜ | Web Push (notificações) |

---

## 13. COMANDOS

```bash
# Desenvolvimento
npm run dev

# Build de produção (inclui prisma generate)
npm run build

# Start de produção (inclui prisma migrate deploy)
npm run start

# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em produção
npx prisma migrate deploy

# Abrir Prisma Studio (GUI do banco)
npx prisma studio
```

---

*© 2026 Luiz Eduardo da Silva Dias Melo. Todos os direitos reservados.*  
*Documento técnico — SpeakFlow Web Platform v1.0.0*
