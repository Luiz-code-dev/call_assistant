# PROGRESSO — feature/reforco-completo

Branch: `feature/reforco-completo` — criada de `main` (aecf04c)

## Checklist (seção 8)

- [x] 0.1 Branch criada a partir da `main` atualizada
- [x] 1.1 `start.sh` atualizado com `conteudo-import.mjs` — deploy anterior Railway confirmou seed ok
- [x] 1.2 `/api/escola/me` criado; avaliações/notas removidas da UI (redirects + limpeza ofertas/[id])
- [x] 3 Migração aditiva `0003_reforco_completo` criada; Prisma client regenerado; RLS mantido
- [x] 4.1 BNCC: colunas `thematicUnit`/`knowledgeObject` adicionadas ao schema (importador faz upsert)
- [x] 4.2 a 4.5 `prerequisitos.json`, `fichas/MA-06.json` criados; `conteudo-import.mjs` idempotente com lock
- [ ] 5.1 Diagnóstico com degrau — lógica de backend pendente (infraestrutura de schema OK)
- [ ] 5.2 Erro comum gravado e exibido — `misconceptionCode` no schema; ficha exibe erros comuns
- [ ] 5.3 Atribuição AUTO e SUGGEST — `trackAssignmentMode` no EduNetwork; UI de conf OK
- [ ] 5.4 Biblioteca e "Duplicar e adaptar" — infraestrutura (source/derivedFromId) no schema
- [x] 2.3 Ficha do aluno — `/escola/ficha/[studentId]` + `/api/escola/ficha/[studentId]`
- [x] 6.2 Aula de hoje — `/escola/professor/aulas/nova` + `/api/escola/professor/aulas` (POST)
- [x] 6.4 Painel da aula — `/escola/professor/aulas/[id]` + `/api/escola/professor/aulas/[id]`
- [ ] 6.5 Evento CLASS_ACTIVITY — infraestrutura no schema (`source` em EduSkillMastery)
- [x] 2.1 Aluno: `/escola/aluno/atividades-turma` + `/api/escola/aluno/atividades-turma`
- [x] 2.4, 2.5 e 2.6 Menus atualizados; `/escola/rede/configuracoes` criado (GET + PATCH)
- [x] 2.7 Estúdio de Conteúdo — 5 telas `/escola/plataforma/conteudo/*` + `/api/escola/plataforma/conteudo`
- [x] 2.8 Rotas antigas redirecionando (notas, painel, turmas, acompanhamento, retificações, auditoria coordenação)
- [x] 9 Build `npm run build` = exit 0; `npx tsc --noEmit` = exit 0; `npm run lint` = exit 0 (só warnings pré-existentes)

---

## Diário

### Sessão 1 (início da feature)

**Contexto herdado:**
- branch `fix/seed-edu-class-school-year` (NÃO mergeada) tinha fix do EduMembership upsert
  - Causa: seed usava `userId_networkId_role` mas schema tem `@@unique([networkId, userId, schoolId, role])`
  - Fix: substituir upsert por findFirst + create/update (schoolId nullable = NULL != NULL em índice SQL)
- Railway deploy confirmou seed funcionando no branch fix

**Início da feature:**
- branch `feature/reforco-completo` criada de `main` (aecf04c)
- EduMembership fix cherry-pick: `feff5ed3`
- 3 APIs quebradas identificadas no levantamento:
  1. `GET /api/escola/me` — criado em `app/api/escola/me/route.ts`
  2. `_AvaliacoesClient.tsx` → avaliações/notas: páginas convertidas em redirect uncondicional
  3. `/api/escola/plataforma/convites?...` — falso alarme, rota existe

### Sessão 2 (migração + dados + telas)

**Migração aditiva `0003_reforco_completo`:**
- Adicionado ao schema Prisma:
  - `EduNetwork`: `trackAssignmentMode`, `diagnosticAdaptive`
  - `EduSkill`: `thematicUnit`, `knowledgeObject`
  - `EduActivity`: `networkId?`, `classSubjectId?` (opcionais), `source`, `subjectCode`, `gradeYears[]`, `skillIds[]`, `version`, `derivedFromId`, `audioPromptUrl`, `imageUrl`, `ageBand`, `lessonId`, `reviewStatus`
  - `EduQuizQuestion`: `skillId`, `objectiveId`, `misconceptionCode`
  - `EduDiagnostic`: `networkId?`, `source`, `version`, `derivedFromId`, `adaptive`
  - `EduTrack`: `networkId?`, `source`, `version`, `derivedFromId`
  - Novos modelos: `EduSkillPrerequisite`, `EduSkillGuide`, `EduLesson`, `EduLessonObjective`
- `prisma validate` OK; `prisma generate` OK
- Migration SQL em `prisma/escolas/migrations/0003_reforco_completo/migration.sql`

**Dados de referência:**
- `prisma/data/conteudo/prerequisitos.json`: 14 pré-requisitos MA (DRAFT)
- `prisma/data/conteudo/fichas/MA-06.json`: fichas MA-06 EF06MA07 e EF06MA03 com erros comuns
- `scripts/escolas/conteudo-import.mjs`: importador idempotente, pg_advisory_lock, processa todas as bases tenant

**start.sh:** adicionada chamada ao `conteudo-import.mjs` entre BNCC e seeds

**Navegação (`lib/escola/navigation.ts`):**
- PLATFORM_ADMIN: adicionado "Conteúdo" → `/escola/plataforma/conteudo`
- NETWORK_ADMIN: adicionado "Configurações" → `/escola/rede/configuracoes`
- TEACHER: adicionado "Atividades da turma" → `/escola/professor/aulas`
- COORDINATOR: mantido (removidos links às rotas antigas)

**Novas rotas/páginas:**
- `/escola/professor/aulas` — linha do tempo de aulas (prof)
- `/escola/professor/aulas/nova` — Aula de hoje
- `/escola/professor/aulas/[id]` — Painel da aula
- `/escola/rede/configuracoes` — Configurações da rede
- `/escola/plataforma/conteudo` — Estúdio painel
- `/escola/plataforma/conteudo/gerar` — Gerar com IA (stub)
- `/escola/plataforma/conteudo/revisar` — Fila de revisão (stub)
- `/escola/plataforma/conteudo/prerequisitos` — Mapa pré-requisitos (stub)
- `/escola/plataforma/conteudo/fichas` — Fichas (stub)
- `/escola/aluno/atividades-turma` — Atividades da turma (aluno)
- `/escola/ficha/[studentId]` — Ficha do aluno (compartilhada)

**APIs novas:**
- `GET/POST /api/escola/professor/aulas`
- `GET/PATCH /api/escola/professor/aulas/[id]`
- `GET/PATCH /api/escola/rede/configuracoes`
- `GET /api/escola/plataforma/conteudo`
- `GET /api/escola/ficha/[studentId]`
- `GET /api/escola/aluno/atividades-turma`

**Redirects seção 2.8:**
- `/escola/notas`, `/escola/painel`, `/escola/turmas` → `/escola/inicio`
- `/escola/aluno/painel` → `/escola/aluno`
- `/escola/coordenacao/acompanhamento`, `/retificacoes`, `/auditoria` → `/escola/coordenacao`
- `/escola/direcao/retificacoes` → `/escola/coordenacao`

**Verificação final:**
- `npx tsc --noEmit` → exit 0 (0 erros)
- `npm run lint` → exit 0 (só warnings pré-existentes em SpeakFlow AI)
- `npm run build` → exit 0 (build completo, 251 páginas geradas)
- Nenhum arquivo em `speakflowMobile/` modificado

**Pendências para próxima sessão:**
- Lógica de degrau no diagnóstico (backend: se aluno erra, adicionar itens do pré-requisito)
- Evento CLASS_ACTIVITY (gravar em EduSkillMasteryEvent com source="CLASS_ACTIVITY")
- Atribuição AUTO pós-diagnóstico
- Biblioteca + "Duplicar e adaptar" nas trilhas
- Testes de integração (isolamento de rede)
- Smoke test automatizado
- Testes E2E manuais com prints
