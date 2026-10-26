---
trigger: always_on
---

# SpeakFlow Escolas — memória do projeto (leia antes de qualquer tarefa)

## 1. O produto
- SpeakFlow Escolas é uma plataforma de REFORÇO ESCOLAR EM CASA com IA, para redes municipais e escolas privadas, em todos os componentes da BNCC. Produto da Codevelop Solutions, dentro do monorepo `call_assistant`, pasta `pageCallAssistant` (Next.js 14 App Router + Prisma + PostgreSQL), rota `/escola/**`, atrás da flag `FEATURE_ESCOLAS`.
- Ciclo: diagnóstico por habilidade da BNCC → trilha de reforço → aluno pratica em casa (celular, tablet, computador) → retorno imediato da IA → escola acompanha quem praticou, avançou ou precisa de ajuda → família acompanha cada filho → novo diagnóstico ajusta a trilha.
- NÃO é sistema de notas. Notas oficiais, planilha de notas, publicação, atas, boletim e retificação ficam escondidos por `FEATURE_ESCOLAS_NOTAS=false` (código e tabelas continuam, nunca apagar migrations nem tabelas do ledger de notas).
- Resultado de atividade = nível da habilidade: Ainda não (`NOT_YET`) · Quase lá (`ALMOST`) · Domina (`MASTERED`). Nunca mostrar "nota" ao aluno ou à família.

## 2. Perfis (fonte única: `lib/escola/roles.ts` e `lib/escola/navigation.ts`)
- **PLATFORM_ADMIN (Codevelop)** — `/escola/plataforma`: cria redes, convida o 1º gestor, suspende redes, administradores, auditoria. Não vê alunos nem dados pedagógicos.
- **NETWORK_ADMIN (Secretaria)** — `/escola/rede`: implantação por planilha (escolas, ano letivo, matriz, servidores, turmas e alunos, atribuições, cartões), convida servidores da rede, indicadores de reforço, auditoria. Não cria atividades.
- **COORDINATOR** — `/escola/coordenacao`: diagnósticos, habilidades prioritárias, aprova trilhas, acompanha escolas. Não convida, não cadastra alunos.
- **SCHOOL_ADMIN (direção)** — `/escola/direcao`: turmas e alunos da escola, atribuições, cartões de acesso, famílias, participação, convida coordenação e professores da escola. Não vê outras escolas.
- **TEACHER** — `/escola/professor`: mapa da turma por habilidade, trilhas, atividades com IA, retornos para revisar. Não vê turmas de outros.
- **Aluno** — `/escola/aluno`: entra SEM e-mail (cartão QR, código da turma + matrícula + PIN, senha por figuras), "Minha trilha", atividades, retorno, evolução. Sem ranking, chat, push.
- **Família** — `/escola/familia`: acesso próprio, um login para vários filhos, semana do filho, trilha, evolução, dica de como ajudar. Não vê outros alunos.
- Quem convida quem: `CAN_INVITE` em `roles.ts`. A API valida com `assertCanInvite`. Ninguém da Área Escolar usa `/register`.
- Todo item de menu precisa ter página. Item sem página não aparece no menu.

## 3. Regras de negócio que não podem ser quebradas
- Isolamento por rede: toda consulta `Edu*` filtra por `networkId` vindo da sessão (nunca do navegador). Professor só acessa as próprias ofertas; aluno só a própria turma; família só os filhos ligados (`EduGuardianLink` ativo).
- IA: só via `lib/escola/ai-gateway.ts`, sem nome nem matrícula do aluno; resposta validada com Zod; idioma da transcrição pelo componente (Inglês `en`, Espanhol `es`, demais `pt`); moderação de entrada e saída.
- ECA Digital (Lei 15.211/2025): sem ranking, sem sequência de dias, sem push para aluno, sem rolagem infinita. LGPD: dados mínimos do aluno (sem CPF, e-mail, foto); responsável sem CPF.
- Turmas: ano/série coerente com a etapa (Anos Iniciais 1–5, Anos Finais 6–9, EJA por segmento); nome da turma única por escola + ano letivo + turno.
- Cadastro em massa por planilha (modelos A escolas, B servidores, C turmas e alunos com até 2 responsáveis, D atribuições), com prévia de erros e aceitando Windows-1252.

## 4. Sessão e segredos (já corrigido, não regredir)
- Segredos só por `lib/escola/secrets.ts` (`staffSecret()`, `studentSecret()`, família `EDU_FAMILY_JWT_SECRET`). Token da equipe só por `lib/escola/staff-session.ts`.
- Cookies: equipe `sf_edu_ctx`, aluno `sf_student_ctx`, família `sf_family_ctx`. Layout `app/(escola)/escola/layout.tsx` usa `getEduContext()`.
- `rotaDoPapel()` em `lib/escola/context.ts` define a página inicial de cada perfil.

## 5. Visual (obrigatório em TODA página da Área Escolar)
- Tema claro. O `<html>` global tem `class="dark"`: por isso é proibido usar `dark:` e classes escuras (`bg-gray-800/900/950`, `bg-black`, `border-gray-700/800`, `text-white` em texto comum, `text-gray-300/400` como texto principal) dentro de `app/(escola)/**` e `components/escola/**`.
- Tokens: fundo `#F8F7FC`, superfície `#FFFFFF`, borda `#E9E5F5` / `#DDD6EE`, texto `#1F1A2E`, texto secundário `#5B5470`, roxo ação `#6D28D9` (hover `#5B21B6`, tinta `#4C1D95`, suave `#EDE9FE`), rosa da marca `#BE185D`. Sucesso `#166534`/`#DCFCE7`, atenção `#92400E`/`#FEF3C7`, erro `#B91C1C`/`#FEE2E2`.
- Cores por componente: Inglês `#6D28D9`, Português `#BE185D`, Matemática `#1D4ED8`, Ciências `#0F766E`, História `#C2410C`, Geografia `#15803D`, Espanhol `#A16207`.
- Fonte Inter; ícones lucide-react; nunca emoji. Cantos 10–16 px; cartões brancos com borda; botões 44 px (48–52 px nas telas do aluno).
- Layout da equipe: `EscAppShell` (barra lateral branca 248 px + conteúdo) e `EscPageHeader` (trilha, título 28 px `#1F1A2E`, subtítulo, ações à direita). Abaixo de 1024 px a barra vira gaveta.
- Toda lista tem estado de carregando, vazio (com o próximo passo) e erro (mensagem clara + "Tentar de novo").
- Tablet de 7" a 13", retrato e paisagem; sem rolagem lateral.

## 6. Forma de trabalhar
- Branch por tarefa, PR para revisão, nunca commit na `main`. Uma tarefa por commit. Pare e mostre o diff ao fim de cada etapa.
- Só adições: nada do SpeakFlow pessoa física, do app mobile ou do `/register` pode quebrar.
- Antes de terminar: `npm run lint`, `npx tsc --noEmit`, build, e abrir cada tela alterada em 1440 px e 768 px.
- Nunca colocar segredos no código ou no Git.

## 7. Documentos de referência (em `docs/escolas/`)
- `PROMPT-WINDSURF-Escolas-Reforco-Escolar.md` — fases do reforço (habilidades BNCC, diagnóstico, trilhas, aluno em casa, família, painéis).
- `PROMPT-WINDSURF-Escolas-Perfis-e-Layout.md`, `PROMPT-WINDSURF-Escolas-Design.md`, `PROMPT-WINDSURF-Escolas-Cadastro-e-Acessos.md`, `PROMPT-WINDSURF-Escolas-Correcao-Sessao-e-Tema.md`.
- Em caso de dúvida entre um prompt antigo e o de reforço, vale o de reforço.
