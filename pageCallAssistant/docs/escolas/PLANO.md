# SpeakFlow Escolas — Plano de Implementação (Fase 0)

> Documento gerado na Fase 0 de reconhecimento. Serve de baseline para todas as fases seguintes.
> Branch de trabalho: `feature/escolas`

---

## 1. Estrutura de pastas existente relevante

```
pageCallAssistant/
├── app/                       # Next.js 14 App Router
│   ├── api/                   # Rotas de API existentes
│   │   ├── auth/              # login, register, me, refresh, etc.
│   │   ├── billing/           # Stripe
│   │   ├── live/              # Sessões ao vivo
│   │   ├── mobile/            # APIs consumidas pelo app Expo
│   │   ├── org/               # B2B Teams
│   │   ├── tools/             # Ferramentas de IA
│   │   └── ...
│   ├── layout.tsx             # Root layout — html lang="pt-BR" class="dark"
│   └── ...pages existentes
├── components/
│   ├── ui/                    # button, card, input, badge, avatar, progress, skeleton, sonner
│   └── ...componentes globais (Navbar, BottomNav, SupportChat, etc.)
├── lib/
│   ├── auth.ts                # JWT com jose (HS256, 7d), getSession(), signToken()
│   ├── db.ts                  # PrismaClient singleton
│   ├── email.ts               # Resend (HTML templates inline)
│   ├── openai.ts              # getOpenAI() singleton
│   ├── encryption.ts          # AES encryption helper (já existe)
│   └── ...outras libs
├── prisma/
│   ├── schema.prisma          # 624 linhas, sem @@map
│   └── migrations/            # 33 migrations aditivas até 20260614210000
├── middleware.ts              # Protege rotas, redireciona, roda no Edge
├── tailwind.config.ts         # TailwindCSS v3, tokens via CSS vars HSL
├── next.config.mjs            # output: "standalone"
└── package.json
```

### Nova estrutura criada pela Área Escolar

```
app/
├── (escola)/                  # Route group — layout próprio, sem BottomNav/Navbar global
│   ├── layout.tsx             # Layout da área escolar (tema claro, sidebar responsiva)
│   ├── escola/
│   │   ├── entrar/            # Login de alunos (código + matrícula + PIN)
│   │   ├── rede/              # Gestor da rede
│   │   ├── coordenacao/       # Coordenação pedagógica
│   │   ├── direcao/           # Direção escolar
│   │   ├── professor/         # Professor
│   │   └── aluno/             # Aluno
│   └── verificar/[codigo]/    # Verificação pública de ata (sem login)
├── api/escola/                # Todas as APIs da Área Escolar
lib/
├── escola/                    # Lógica isolada da Área Escolar
│   ├── permissions.ts         # Matriz de permissões
│   ├── context.ts             # getEduContext() — resolve networkId + perfil
│   ├── db.ts                  # Prisma Client Extension com scoping por networkId
│   ├── integrity.ts           # Hash, assinatura Ed25519, verificação de cadeia
│   ├── ai-gateway.ts          # Wrapper OpenAI com pseudonimização de alunos
│   ├── pdf.ts                 # Geração de atas e cartões de acesso em PDF
│   └── ...
components/escola/             # Componentes exclusivos da Área Escolar
scripts/escolas/
└── gerar-chaves.ts            # Gerador de par Ed25519
docs/escolas/
└── PLANO.md                   # Este arquivo
```

---

## 2. Sistema de estilos

| Item | Valor / observação |
|---|---|
| Framework | TailwindCSS v3.4.16 |
| Tokens | CSS Variables HSL em `globals.css` |
| Tema atual | Escuro (`:root` = dark, sem variante `[data-theme=light]`) |
| Cor primária | `--primary: 262 83% 68%` → `#7C3AED` (violet-600) |
| UI Components | Radix UI + shadcn pattern (`components/ui/`) |
| Animações | `tailwindcss-animate`, keyframes custom no config |

**Ação necessária na Fase 3:** o root layout força `class="dark"` no `<html>`. O layout da Área Escolar precisa de tema claro. Estratégia: usar `data-theme="edu"` no `<html>` do layout da rota group `(escola)` e definir variáveis CSS para o tema claro **sem alterar** `globals.css`. As variáveis do tema escuro no `:root` não serão sobrepostas.

---

## 3. Bibliotecas de auth / JWT / PDF / e-mail / OpenAI encontradas

### Auth / JWT
- **Biblioteca:** `jose@5.9.6`
- **Implementação:** `lib/auth.ts` — `signToken()`, `verifyToken()`, `getSession()`
- **Algoritmo:** HS256, expiração 7d
- **Cookie:** `token` (httpOnly, secure em prod, sameSite: lax, 7d)
- **Domínio:** `getCookieDomain()` → `.speakf.com.br` em produção

**Para a Área Escolar** (novos cookies, não interferem):
- `sf_edu_ctx` — perfil ativo do servidor (httpOnly)
- `sf_edu_student` — sessão de aluno (JWT Ed25519 ou HS256 com secret separado, 12h)
- `sf_edu_stepup` — reautenticação (HS256 com secret separado, 5min)

### PDF
- **Não existe biblioteca de PDF** no projeto atual.
- **Dependência a adicionar (Fase 7):** `pdf-lib@^1.17.1` (puro JS, sem binários nativos, funciona em `output: "standalone"` do Next.js sem precisar de headless browser).
- Alternativa: `@react-pdf/renderer` — mais fácil de estilizar mas mais pesado.
- **Recomendação:** `pdf-lib` para atas (documentos formais), `@react-pdf/renderer` opcional para cartões de acesso mais visuais.

### E-mail
- **Biblioteca:** `resend@6.10.0`
- **Implementação:** `lib/email.ts` — funções exportadas com templates HTML inline
- **Para a Área Escolar:** criar novas funções em `lib/escola/email.ts` que importam `Resend` diretamente (não alteram `lib/email.ts`)

### OpenAI
- **Biblioteca:** `openai@6.34.0`
- **Implementação:** `lib/openai.ts` — `getOpenAI()` singleton
- **Para a Área Escolar:** `lib/escola/ai-gateway.ts` importa `getOpenAI()` e envolve com pseudonimização (`hmac(studentId, EDU_PSEUDONYM_SECRET)`)

### Encryption
- **Existe** `lib/encryption.ts` com AES para mensagens privadas
- Para assinatura Ed25519 das notas, usar `node:crypto` diretamente (não depende desta lib)

---

## 4. Middleware atual

```
middleware.ts — matcher: /((?!api|_next/static|_next/image|favicon.ico).*)
```

**Lógica:**
1. Redirect de `speakf.com.br` → `www.speakf.com.br`
2. Verifica cookie `token` (JWT)
3. Se rota protegida e sem token → redireciona para `/login`
4. Se rota de auth e com token → redireciona para `/home`
5. Se `/` e autenticado → redireciona para `/home`

**Ação necessária (Fase 2):** acrescentar um ramo para `/escola` e `/escola/**` antes das checagens existentes:
- Se `FEATURE_ESCOLAS` desligada → retorna `NextResponse.next()` (a rota de página retornará 404 pois não existirá)
- Se path começa com `/escola/aluno` → verificar `sf_edu_student` (JWT de aluno), não o `token` de usuário
- Se path começa com `/escola/entrar` → deixar passar (público, semelhante a `/login`)
- Demais paths `/escola/**` → verificar `token` de usuário (já existe) + `sf_edu_ctx`
- **NÃO alterar** a lógica dos matchers existentes

---

## 5. Scripts de teste existentes

- **Nenhum framework de teste** configurado no `package.json`
- Sem `vitest`, `jest`, `@playwright/test`, `@testing-library/*`

**Ações necessárias:**
- **Fase 2:** Adicionar `vitest@^1.6.0` como devDependency exclusivamente para `lib/escola/**`
- **Fase 3/9:** Adicionar `@playwright/test@^1.47.0` para testes de viewport

---

## 6. Riscos de conflito e ajustes propostos

| Risco | Severidade | Mitigação |
|---|---|---|
| `User` model precisa de `eduMemberships EduMembership[]` | Baixo | Permitido pelo prompt; não cria coluna, só relação reversa no Prisma |
| Root layout força `class="dark"` — Escola usa tema claro | Médio | Route group `(escola)` tem seu próprio layout que sobrepõe o root layout; usar atributo `data-edu="true"` na tag `<html>` via metadata |
| Sem biblioteca PDF | Médio | Adicionar `pdf-lib` na Fase 7; não afeta build atual |
| Sem framework de testes | Médio | Adicionar Vitest (Fase 2) e Playwright (Fase 3) como devDependencies isoladas |
| Sem `.eslintrc.json` — lint pede configuração interativa | Médio | Criar `.eslintrc.json` mínimo com `next/core-web-vitals` na Fase 0 |
| Middleware matcher atual não exclui `/escola` da lógica de redirect | Médio | Adicionar ramo antes das checagens; não alterar matchers existentes |
| Nomes de tabelas sem `@@map` no schema atual | Baixo | Não usar `@@map` nos models `Edu*` (seguir convenção do projeto) |
| Cookie domain `.speakf.com.br` — novos cookies da Área Escolar precisam do mesmo domínio | Baixo | Reutilizar `getCookieDomain()` de `lib/auth.ts` |
| `output: "standalone"` no Next.js — bibliotecas com binários nativos podem não funcionar | Médio | Usar apenas libs JS puro (`pdf-lib`, `jose`) |
| Aluno não tem `User` — sessão completamente separada | Médio | Middleware deve diferenciar pelo path; sessão `sf_edu_student` isolada |
| Motor de IA atual (challenges/submissions) espera `userId` de `User` | Alto | `ai-gateway.ts` envia apenas ID opaco; não reutilizar diretamente as rotas `/api/tools` — criar rotas em `/api/escola/` |

---

## 7. Variáveis de ambiente novas (não alteram as existentes)

```env
FEATURE_ESCOLAS=false
NEXT_PUBLIC_FEATURE_ESCOLAS=false
EDU_SIGNING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."   # Ed25519 PEM
EDU_SIGNING_KEY_ID="edu-2026-01"
EDU_STUDENT_JWT_SECRET="..."    # separado do JWT_SECRET atual
EDU_PSEUDONYM_SECRET="..."      # HMAC para ID opaco enviado à IA
```

---

## 8. Resultado do baseline (Fase 0)

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 erros |
| `next build` | ✅ Build completo (Prisma generate OK, todas as rotas compiladas) |
| `npm run lint` | ⚠️ Sem `.eslintrc.json` — lint pede configuração interativa. Criar arquivo na Fase 1 |
| Testes | ⚠️ Nenhum framework configurado |

---

## 9. Ordem de execução das fases e dependências

```
Fase 0 (este doc) ──► Fase 1 (schema) ──► Fase 2 (auth/ctx) ──► Fase 3 (shell)
                                                                        │
                        ┌───────────────────────────────────────────────┘
                        ▼                       ▼                    ▼
                   Fase 4 (CRUD)          Fase 5 (coord)       Fase 6 (prof)
                                                                     │
                                                                     ▼
                                                              Fase 7 (integridade)
                                                                     │
                                                                     ▼
                                                              Fase 8 (aluno)
                                                                     │
                                                                     ▼
                                                              Fase 9 (QA/regressão)
```

---

## 10. Convenções adotadas para o código da Área Escolar

- Todos os arquivos em `lib/escola/`, `components/escola/`, `app/(escola)/`, `app/api/escola/`
- Imports de libs compartilhadas: **sempre importar**, nunca copiar/alterar
- Nenhum `export default` de funções que alterem estado global existente
- Zod para validação em todas as rotas `/api/escola/**`
- Respostas de erro sempre com `{ error: string }` em português
- Logs nunca devem conter `name + grade` juntos (LGPD)
- Feature flag checada como **primeira instrução** em toda rota e página
