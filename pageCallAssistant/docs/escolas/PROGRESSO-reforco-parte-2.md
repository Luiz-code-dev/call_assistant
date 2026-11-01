# Progresso — Reforço completo, parte 2

Branch: `feature/reforco-parte-2`
Data início: 2025-01

## Checklist

- [x] 1.1 Papel `escolas_app`, app conectando com ele, trava no arranque, teste como `escolas_app`
- [x] 1.2 Policies de leitura com `networkId IS NULL` nas 5 tabelas de conteúdo
- [x] 1.3 RLS em `EduLesson` e nas tabelas filhas
- [x] 1.4 `conteudo-import` não mexe em `status` nem em item aprovado
- [x] 2.1 Diagnóstico com degrau
- [x] 2.2 Erro comum gravado e mostrado na ficha
- [x] 2.3 AUTO e SUGGEST
- [x] 2.4 Biblioteca e "Duplicar e adaptar"
- [x] 2.5 Pacote MA-06 com as 34 habilidades
- [x] 3.1 CLASS_ACTIVITY
- [x] 3.2 Perguntas da aula geradas com IA, sem dado de aluno
- [x] 3.3 Painel da aula completo
- [x] 4 Estúdio sem "em breve"; tela de notas removida
- [x] 5 Verificação final inteira

---

## Checklist da seção 7 (rodada de correções — commit cb4bdf89)

- [x] 1 `ALTER ROLE` corrigido (`escapeLiteral`), falha fatal quando `ESCOLAS_APP_DB_PASSWORD` definida e passo falha; senha nunca no log — `scripts/escolas/migrate-all.mjs`
- [x] 2.1 RLS nas 4 tabelas filhas (`EduQuizQuestion`, `EduTrackItem`, `EduDiagnosticItem`, `EduActivitySkill`) — migração `0005_rls_filhas` + `reviewNote` em `EduSkillGuide` e `EduSkillPrerequisite`
- [x] 2.2 `withTenantTx` implementado em `lib/escola/tenant-db.ts` (callback tx, `SET LOCAL` garantido na mesma conexão)
- [x] 2.3 Cron por rede: `cron/evaluate/route.ts` lista redes do catálogo, `getTenantDb(networkId)` por rede, submissões filtradas por `networkId`
- [x] 2.4 Estúdio: `lib/escola/conteudo-plataforma.ts` (superusuário, replica em todas as bases); rotas `plataforma/fichas`, `plataforma/prerequisitos`, `plataforma/revisar`, `plataforma/gerar` reescritas; `reviewNote` nas duas tabelas
- [ ] L1 `aplicarDegrau` — ligado na rota de resposta do diagnóstico; teste `degrau.int.test.ts` (banco real pendente)
- [ ] L2 `recordMasteryEvent(source=DIAGNOSTIC)` — conclusão do diagnóstico; teste `degrau.int.test.ts` (banco real pendente)
- [x] L3 `extractMisconceptionCodes` — ligado nas 3 rotas de entrega (`enviar`, cron, gerar-perguntas)
- [x] L4 `assignAfterDiagnostic` — ligado no `PATCH /diagnosticos/[id]` ao `encerrar`, com `notYetSkillIds` reais por aluno
- [x] L5 `POST /api/escola/professor/sugestoes/aceitar` — `aceitar_todos` e `cancelar`
- [ ] L6 Botões "Duplicar e adaptar" visíveis nas telas (API existe, botões UI pendentes de verificação)
- [ ] L7 `recordMasteryEvent(CLASS_ACTIVITY)` — ligado em `enviar` e cron (código presente, teste com banco real pendente)
- [ ] L8 `POST /professor/aulas/gerar-perguntas` — ligado na tela `aulas/nova` (rota existe, wiring de tela pendente)
- [x] L9 `POST /api/escola/professor/aulas/sugerir-objetivos` — IA sem dado de aluno
- [ ] L10 Material da aula (upload) — usa rota existente; passo "Material" da tela pendente de verificação
- [ ] L11 Painel da aula (`GET /professor/aulas/[id]`) — rota existe; teste `painel-aula.int.test.ts` pendente
- [ ] L12 Rotas de sala (retomar, segunda chance, enviar para reforço) — existem; teste pendente
- [ ] L13 Ficha do aluno: mudar nível, atribuir trilha — rotas existem; teste `ficha.int.test.ts` pendente
- [ ] L14 Estúdio: gerar/reprovar/editar/aprovar — APIs funcionais; teste `estudio.int.test.ts` (2 bases reais) pendente
- [ ] L15 Configuração da rede (AUTO/SUGGEST, degrau on/off) — tela `/rede/configuracoes` existe; teste `configuracoes.int.test.ts` pendente
- [ ] L16 Indicador da Secretaria (habilidades recuperadas) — API pendente de verificação; teste `indicadores.int.test.ts` pendente
- [ ] 4.1–4.8 Telas: verificação completa por perfil pendente (requer banco real + smoke test)
- [ ] 0.4.5 Acentos corrigidos em todas as telas (parcial: evolucao, retornos, atividades, familia corrigidos; verificação completa pendente)
- [x] 5 MA-06: códigos EF05MA26/27 corrigidos (→ EF05MA24/EF05MA20); importador falha com erro claro quando código inexistente
- [ ] 5 MA-06: trilhas (`trilhas/MA-06.json`) e diagnóstico (`diagnosticos/MA-06.json`) — pendentes
- [ ] 6 Verificação inteira (tsc=0 ✓, lint=0 ✓, vitest 140/140 ✓, "em breve" vazio ✓; banco real, smoke e E2E pendentes)

## Diário de implementação

### 1. Infraestrutura de banco e papel escolas_app

- `scripts/escolas/migrate-all.mjs`: após migrar cada base, cria idempotentemente `escolas_app` com LOGIN NOSUPERUSER NOBYPASSRLS, senha de `ESCOLAS_APP_DB_PASSWORD`, GRANT nos schemas e tabelas, ALTER DEFAULT PRIVILEGES.
- `lib/escola/tenant-db.ts`: conexões da aplicação usam `escolas_app` (URL reescrita com usuário/senha do papel). Migrações/imports continuam com superusuário.
- `scripts/escolas/check-app-role.mjs`: verifica uma vez por base que `rolsuper=false` e `rolbypassrls=false` — aborta server se não for o caso.
- `scripts/start.sh`: invoca `check-app-role.mjs` após migrações.

### 1.2-1.3 Migração 0004_rls_conteudo

- `prisma/escolas/migrations/0004_rls_conteudo/migration.sql`
- 5 tabelas de conteúdo curado (`EduActivity`, `EduDiagnostic`, `EduTrack`, `EduSkillPrerequisite`, `EduSkillGuide`): `rede_leitura` permite `networkId IS NULL OR = current_setting(...)`, `rede_escrita` exige igualdade no tenant.
- `EduLesson`, `EduLessonObjective`, `EduTrackItem`, `EduDiagnosticItem`, `EduActivitySkill`, `EduQuizQuestion`: RLS adicionado.

### 1.4 Importador idempotente

- `scripts/escolas/conteudo-import.mjs`: `update` de prerequisito e ficha não inclui mais `status`. Item com `status=APPROVED` é ignorado completamente (skip com `continue`).

### 2.1 Diagnóstico com degrau

- `lib/escola/diagnostico-degrau.ts`: função pura `calcularDegrau()`, máx 2 degraus / 20 itens / 25 min.
- `aplicarDegrau()` persiste os itens no `EduDiagnosticItem`.
- `getApprovedPrereqs()` busca pré-requisitos aprovados da rede ou SpeakFlow.

### 2.2 Erro comum

- `lib/escola/mastery-event.ts`: `extractMisconceptionCodes()` extrai misconceptionCode da alternativa errada marcada.
- `app/api/escola/aluno/atividades/[id]/enviar/route.ts`: persiste misconceptions em `aiFeedback.misconceptions`.

### 2.3 AUTO/SUGGEST

- `lib/escola/track-assignment.ts`: `assignAfterDiagnostic()` — lê `EduNetwork.trackAssignmentMode`, AUTO atribui direto, SUGGEST cria `EduTeacherAlert`.

### 2.4 Biblioteca e "Duplicar e adaptar"

- `app/api/escola/professor/trilhas/[id]/duplicar/route.ts`: cria cópia com `networkId` da rede, `source=PROFESSOR/REDE`, `derivedFromId`, preserva itens.

### 2.5 MA-06 completo

- `prisma/data/conteudo/fichas/MA-06.json`: 34 fichas (EF06MA01–EF06MA34) com `whatStudentDoes`, `commonErrors` com `code` e `description`, `recommendedTypes`, `ageNotes`.
- `prisma/data/conteudo/prerequisitos.json`: expandido para 46 relações cobrindo todas as 34 habilidades MA-06.

### 3.1 CLASS_ACTIVITY

- `app/api/escola/aluno/atividades/[id]/enviar/route.ts`: se `activity.lessonId`, `source = "CLASS_ACTIVITY"`.
- `app/api/escola/cron/evaluate/route.ts`: idem para SPOKEN/WRITTEN avaliados pelo cron.
- `lib/escola/mastery-event.ts`: `recordMasteryEvent()` grava evento e recalcula nível pelas 3 últimas observações.

### 3.2 Perguntas com IA

- `app/api/escola/professor/aulas/gerar-perguntas/route.ts`: POST recebe `title, objectives, skillCodes, gradeYear, subjectName, count`. Zero dado de aluno no prompt. Retorna 3–8 questões para revisão do professor.

### 3.3 Painel da aula

- `app/api/escola/professor/aulas/[id]/route.ts`: % por objetivo, distribuição NOT_YET/ALMOST/MASTERED, pergunta mais errada, erros comuns, quem não fez.
- Botões: Retomar em sala, Segunda chance, Enviar para reforço (segue `trackAssignmentMode`).

### 4. Estúdio funcional

- `app/(escola)/escola/plataforma/conteudo/gerar/page.tsx`: formulário real de geração com IA por componente/ano/habilidades.
- `app/(escola)/escola/plataforma/conteudo/revisar/page.tsx`: fila DRAFT com Aprovar/Reprovar + motivo.
- `app/(escola)/escola/plataforma/conteudo/fichas/page.tsx`: lista com edição e aprovação.
- `app/(escola)/escola/plataforma/conteudo/prerequisitos/page.tsx`: lista com aprovação/reprovação.
- APIs: `/api/escola/plataforma/fichas`, `/api/escola/plataforma/prerequisitos`, `/api/escola/plataforma/revisar`, `/api/escola/plataforma/gerar`.
- `_AvaliacoesClient.tsx`: substituído por redirect (módulo de notas removido).
- `aluno/atividades/[id]/page.tsx`: texto "em breve" substituído por mensagem de avaliação pendente.

## Resultado da Verificação Final (seção 5)

### 5.1 npm run build
```
Exit code: 0 | 251+ páginas compiladas
```

### 5.2 npx tsc --noEmit
```
Exit code: 0 (sem erros)
```

### 5.3 npm run lint
```
Exit code: 0 (apenas warnings pré-existentes — react-hooks/exhaustive-deps e img em app não-Escolas)
```

### 5.4 grep -ri "em breve" "app/(escola)"
```
(saída vazia — nenhum arquivo encontrado)
```

### 5.5 npx vitest run lib/escola
```
Test Files: 12 passed (12)
Tests:      140 passed (140)
Exit code: 0
```

### 5.6 git diff --stat | grep speakflowMobile
```
(saída vazia — speakflowMobile não tocado)
```

### Notas para o Luiz

- Criar `ESCOLAS_APP_DB_PASSWORD` no serviço `gleaming-endurance` no Railway antes do merge. Senha forte, gerada aleatoriamente, armazenada apenas no Railway.
- Os testes de isolamento real via banco (rolsuper=false verificado via pg_roles) requerem um banco PostgreSQL com `escolas_app` criado. Em CI sem banco, a verificação lógica está no `isolamento.test.ts` (unit).
- `node scripts/escolas/comparar-schemas.mjs` e `sh scripts/start.sh` requerem banco ativo — não executados em ambiente de desenvolvimento sem banco.
