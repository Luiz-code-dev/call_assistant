# Massa de Teste — SpeakFlow Escolas

> Inventário executado em **2026-11-09** contra produção (`gleaming-endurance`)
> com `railway run node scripts/escolas/inventario.mjs`.
> Nenhuma senha, PIN ou figura consta neste arquivo.

---

## A1 — Saúde

### Commit implantado

Verificar no Railway → Deployments: o commit atual é o topo da branch `main`
após o merge desta PR. Para confirmar: `railway run node -e "console.log(process.env.RAILWAY_GIT_COMMIT_SHA)"`.

### Catálogo

| Base tenant | Compartilhada |
|---|---|
| db01 | sim (shared=true) |
| db02 | não (shared=false) |

### Status HTTP das rotas (sem sessão)

| Rota | Status atual | Esperado | Obs. |
|---|---|---|---|
| `GET /api/escola/auth/me` | **401** | 401 | OK — corrigido nesta PR |

> **Causa do 500 anterior:** `staffSecret()` era chamada fora do try/catch em
> `getEduContext()`; qualquer exceção (ex.: `EDU_JWT_SECRET` ausente em produção com
> cookie malformado) vaza como 500. Esta PR envolve a chamada em try/catch →
> retorna 401 em qualquer falha de autenticação.

### Rotas com sessão por perfil

A tabela abaixo deve ser preenchida após o deploy e execução do seed
(`ESCOLAS_SEED_TESTE=true`) criando todos os perfis.

| Rota | NETWORK_ADMIN | COORDINATOR | SCHOOL_ADMIN | TEACHER | Aluno | Família |
|---|---|---|---|---|---|---|
| `GET /api/escola/auth/me` | 200 | 200 | 200 | 200 | 200* | 200* |
| `GET /api/escola/professor/turmas` | 403 | 403 | 403 | 200 | 401 | 401 |
| `GET /api/escola/professor/ofertas` | 403 | 403 | 403 | 200 | 401 | 401 |
| `GET /api/escola/trilhas` | 200 | 200 | 200 | 200 | 401 | 401 |

*Aluno e família usam cookies próprios (`sf_student_ctx`, `sf_family_ctx`).

### Últimas linhas de erro do Railway

Executar no Railway: **Deployments → gleaming-endurance → Logs (filtro: ERROR)**
após abrir `/escola/professor` com um professor logado.
Colar as 50 linhas aqui após o deploy desta PR.

---

## A2 — Redes, escolas e turmas

> Estado **antes** do seed-teste-usabilidade. Após o seed, `isDemo=true`,
> `anoLetivo=2026`, `trackMode=AUTO` para Rede B, e 20/16 alunos por turma.

| Campo | Rede A (`demo-rede-a`) | Rede B (`demo-rede-b`) |
|---|---|---|
| Nome | Rede Municipal Demo A (Demonstração) | Escola Particular Demo B (Demonstração) |
| Tipo | PUBLIC_NETWORK | PRIVATE_SCHOOL |
| `isDemo` | campo ausente — migração 0010 pendente | campo ausente — migração 0010 pendente |
| Escola | EM Professor Silva Demo | Escola Particular Demo B |
| Turma | 5º Ano A (gradeYear=5) | 6º Ano B (gradeYear=6) |
| Alunos na turma | 1 | 1 |
| Código de sessão | `DEMA25` (sessão permanente) | `DEMB25` (sessão permanente) |
| Ano letivo ativo | 2025 | 2025 |
| `trackAssignmentMode` | SUGGEST | SUGGEST |
| Degrau (`diagnosticAdaptive`) | true (porém todos DRAFT → inativo) | true (porém todos DRAFT → inativo) |

**O que o seed-teste resolve:**
- Aplica migração 0010 → `isDemo=true` nas duas redes
- Cria ano letivo 2026 e define como `isCurrent=true`
- Rede B → `trackAssignmentMode=AUTO`
- Acrescenta 15 alunos ao 5º A e 19 ao 6º B

---

## A3 — Usuários (estado atual em produção)

> Senha de todos os usuários abaixo: variável `ESCOLAS_DEMO_PASSWORD` no Railway.

### Rede A — db01

| E-mail | Perfil | Escola | Login testado |
|---|---|---|---|
| `gestor.demo@speakflow.escola` | NETWORK_ADMIN | — | a testar |
| `coord.demo@speakflow.escola` | COORDINATOR | — | a testar |
| `direcao.demo@speakflow.escola` | SCHOOL_ADMIN | EM Professor Silva Demo | a testar |
| `prof.demo@speakflow.escola` | TEACHER | EM Professor Silva Demo | a testar |

### Rede B — db02

| E-mail | Perfil | Escola | Login testado |
|---|---|---|---|
| `gestor.b@speakflow.escola` | NETWORK_ADMIN | — | a testar |
| `prof.b@speakflow.escola` | TEACHER | Escola Particular Demo B | a testar |

**Criados pelo seed-teste:**

| E-mail | Perfil | Variável da senha |
|---|---|---|
| `coord.b@speakflow.escola` | COORDINATOR (Rede B) | `ESCOLAS_DEMO_PASSWORD` |
| `direcao.b@speakflow.escola` | SCHOOL_ADMIN (Rede B) | `ESCOLAS_DEMO_PASSWORD` |
| `admin.teste@speakflow.escola` | PLATFORM_ADMIN | `ESCOLAS_ADMIN_TESTE_PASSWORD` |
| `familia.b@speakflow.escola` | Família (Guardian) | `ESCOLAS_FAMILIA_PASSWORD` |

---

## A4 — Alunos (estado atual em produção)

> PINs e figuras nunca aparecem neste documento. O seed-teste imprime
> as credenciais no log do Railway **uma única vez** na primeira execução.
> Luiz captura o log e guarda fora do Git.

### Rede A — 5º Ano A (gradeYear=5 → loginMode PICTURE)

| Nome | Matrícula | loginMode | figHash | Masteries |
|---|---|---|---|---|
| Aluno Demo Silva | DEMO2027A | PIN | não | dom=0 quase=0 ainda=0 |

**Falta (a criar pelo seed-teste):**
- Aluno Demo Silva → atualizar para `PICTURE` + figuras aleatórias (impressas no log)
- 15 alunos extras `TSTA000`–`TSTA014` com `PICTURE`
- Atividade `SPOKEN` com `maxAudioSec=120` para 5º A

### Rede B — 6º Ano B (gradeYear=6 → loginMode PIN)

| Nome | Matrícula | loginMode | figHash | Masteries |
|---|---|---|---|---|
| Aluno Demo B Santos | DEMO2027B | PIN | não | dom=0 quase=0 ainda=0 |

**Falta (a criar pelo seed-teste):**
- 19 alunos extras `TSTB000`–`TSTB018` com `PIN` aleatório (impresso no log)
- Diagnóstico MA-06 aberto; Aluno Demo B Santos não responde
- 15 colegas respondem (~40% erram `EF06MA07`; 4 com erro "1/2 + 1/3")
- Masteries e histórico de 3 semanas

---

## A5 — Família (estado atual em produção)

| Item | Estado |
|---|---|
| Responsáveis com senha criada | **0** (nenhum) |
| Convites aceitos | **0** |
| Convites pendentes | **0** |

**Falta (a criar pelo seed-teste):**
- `familia.b@speakflow.escola` ativa, ligada ao Aluno Demo B Santos (Rede B)
- Convite pendente para `pendente.b@exemplo.com`

---

## A6 — Conteúdo (estado atual em produção — igual nas duas bases)

| Item | Quantidade | Status |
|---|---|---|
| Habilidades MA-06 (EF06MA01–EF06MA34) | **34** | importadas pelo bncc-import |
| Pré-requisitos MA-06 | **46** | todos DRAFT |
| Trilhas SpeakFlow MA-06 | **34** | todas DRAFT |
| Diagnóstico SpeakFlow MA-06 | **1** | DRAFT |
| Diagnóstico Rede (aberto) | **0** | — |
| MasteryEvents | **0** | — |
| Atribuições de trilha | **0** | — |

**Degrau hoje: NÃO ativo.** Todos os 46 pré-requisitos estão em DRAFT →
o degrau nunca desce. O seed-teste aprova 5 pré-requisitos de MA-06
com `reviewNote = "aprovado para teste de usabilidade"`.

**Pré-requisitos que o seed-teste aprova** (os 5 primeiros encontrados em DRAFT
ligados a habilidades MA-06, em ordem alfabética de código):
> Executar `railway run node scripts/escolas/inventario.mjs` após o seed para
> ver quais foram aprovados (seção A6 → `Pre-requisitos: APPROVED:5`).

**Falta (a criar pelo seed-teste):**
- 5 pré-requisitos MA-06 → `APPROVED`
- 10–12 trilhas MA-06 → `APPROVED` na biblioteca
- Diagnóstico `OPEN` para o 6º B (Rede B)

---

## A7 — Atividade em andamento (estado atual em produção)

### Diagnósticos abertos

Nenhum nas duas bases.

### Sessões de aula

| Código | Rede | Turma | Expira | Observação |
|---|---|---|---|---|
| `DEMA25` | demo-rede-a | 5º Ano A | 2099-12-31 | Sessão permanente demo |
| `DEMB25` | demo-rede-b | 6º Ano B | 2099-12-31 | Sessão permanente demo |

**Como o professor abre uma nova sessão de aula:**
1. Login → `/escola/professor`
2. Menu "Aulas" → "Iniciar aula"
3. Selecionar turma e clicar em "Abrir"
4. O sistema gera um código de **6 caracteres** sem `0`, `1`, `I` ou `O`
5. Exibir o código na lousa — alunos digitam em `/escola/aluno/entrar`
6. O código expira após algumas horas ou quando o professor fecha a sessão
7. Os códigos `DEMA25` e `DEMB25` são sessões permanentes criadas pelo seed
   para o teste sem depender de um professor estar logado

### Aulas registradas (EduLesson)

Nenhuma nas duas bases.

**Falta (a criar pelo seed-teste):**
- 2 aulas publicadas pelo `prof.b`: "Frações e Números Racionais" e "Ângulos e Polígonos"

### Atribuições de trilha pendentes (SUGGEST)

Nenhuma.

---

## A8 — O que falta por tela

> Estado **antes** do seed-teste. Após o seed, as linhas "vazia" mudam para "tem dados".

### Gestor (`/escola/rede`)

| Rota | Estado atual |
|---|---|
| `/escola/rede` | tem dados (rede existe) |
| `/rede/indicadores` | vazia: falta alunos com mastery |
| `/rede/habilidades` | tem dados (34 habilidades BNCC importadas) |
| `/rede/configuracoes` | tem dados (rede configurada) |

### Coordenação (`/escola/coordenacao`)

| Rota | Estado atual |
|---|---|
| `/escola/coordenacao` | tem dados |
| `/coordenacao/diagnosticos` | vazia: falta diagnostico OPEN → seed-teste cria |
| `/coordenacao/diagnosticos/[id]` | vazia: falta diagnostico → seed-teste cria |
| `/coordenacao/trilhas` | vazia: todas DRAFT → seed-teste aprova 10–12 |
| `/coordenacao/habilidades` | tem dados (habilidades BNCC) |
| `/coordenacao/escolas` | tem dados (1 escola) |

### Direção (`/escola/direcao`)

| Rota | Estado atual |
|---|---|
| `/escola/direcao` | tem dados |
| `/direcao/turmas` | tem dados (1 turma) |
| `/direcao/alunos` | vazia: 1 aluno → seed-teste adiciona 15/19 |
| `/direcao/familias` | vazia: sem responsaveis → seed-teste cria |
| `/direcao/cartoes` | vazia: falta alunos PICTURE → seed-teste configura |
| `/direcao/auditoria` | vazia: sem eventos de auditoria |

> **Rede B:** `direcao.b@speakflow.escola` é criada pelo seed-teste.
> Sem ela não é possível testar "Acesso das famílias" na rede com família ativa.

### Professor (`/escola/professor`)

| Rota | Estado atual |
|---|---|
| `/escola/professor` | tem dados |
| `/professor/mapa` | vazia: sem masteries → seed-teste cria |
| `/professor/trilhas` | vazia: todas DRAFT → seed-teste aprova |
| `/professor/trilhas/nova` | funcional (sem pré-requisito de dados) |
| `/professor/atividades` | vazia: falta atividade PUBLISHED → seed-teste cria |
| `/professor/retornos` | vazia: falta submissoes avaliadas |
| `/professor/aulas` | vazia: sem EduLesson → seed-teste cria 2 |
| `/professor/aulas/nova` | funcional |
| `/professor/aulas/[id]` | vazia: falta aula → seed-teste cria |
| `/professor/aula` | funcional (precisa abrir sessao ao vivo) |
| `/escola/ficha/[studentId]` | vazia: sem masteries → seed-teste cria |

### Aluno (`/escola/aluno`)

| Rota | Estado atual |
|---|---|
| `/escola/aluno/entrar` | funcional — código DEMA25 / DEMB25 |
| `/escola/aluno` | tem dados (painel mínimo) |
| `/aluno/diagnostico/[id]` | vazia: sem diagnostico OPEN → seed-teste cria |
| `/aluno/trilha` | vazia: sem trilha atribuida → seed-teste gera via diagnostico |
| `/aluno/atividades/[id]` | vazia: sem atividade → seed-teste cria SPOKEN |
| `/aluno/atividades/[id]/retorno` | vazia: falta submissao avaliada |
| `/aluno/atividades-turma` | vazia: falta atividades publicadas |
| `/aluno/evolucao` | vazia: sem masteries → seed-teste cria |

### Família (`/escola/familia`)

| Rota | Estado atual |
|---|---|
| `/escola/familia` | vazia: sem responsavel → seed-teste cria |
| `/escola/familia/[studentId]` | vazia: sem link → seed-teste cria |

### Admin plataforma (`/escola/plataforma`)

| Rota | Estado atual |
|---|---|
| `/escola/plataforma/conteudo` | tem dados (fichas, trilhas, diagnosticos) |
| Estudio — fichas | tem dados (34 fichas DRAFT) |
| Estudio — trilhas | vazia util: 34 DRAFT → seed-teste aprova 10–12 |
| Estudio — diagnosticos | tem dados (1 DRAFT SpeakFlow) |
| Estudio — pre-requisitos | tem dados (46 DRAFT → 5 APPROVED pelo seed-teste) |

---

## Roteiro de teste por perfil (após seed-teste)

### Professor — Rede B (`prof.b@speakflow.escola`)
1. `/escola/entrar` → senha: `ESCOLAS_DEMO_PASSWORD`
2. `/escola/professor` → Mapa da turma → ver mastery dos 15 alunos
3. Clicar no Aluno Demo B Santos → ficha completa
4. "Trilhas" → biblioteca → 10–12 trilhas APPROVED disponíveis
5. "Aulas" → ver Frações e Ângulos
6. "Iniciar aula" → gerar código → passar aos alunos

### Coordenação — Rede B (`coord.b@speakflow.escola`)
1. `/escola/coordenacao` → Diagnósticos → ver MA-06 OPEN (15 de 20 responderam)
2. Clicar no diagnóstico → ver resultados: ~40% erram EF06MA07
3. "Trilhas" → biblioteca MA-06 APPROVED

### Direção — Rede B (`direcao.b@speakflow.escola`)
1. `/escola/direcao` → Turmas → 6º Ano B → 20 alunos
2. "Famílias" → ver `familia.b` ativa
3. "Acesso das famílias" (Cartões) → gerar kit de acesso

### Aluno — Rede B (`Aluno Demo B Santos`)
1. `/escola/aluno/entrar`
2. Código: **`DEMB25`** → toque no nome → PIN: variável `ESCOLAS_DEMO_PIN_B`
3. Ver diagnóstico MA-06 pendente → responder (degrau desce se errar EF06MA07)
4. Ver trilha atribuída (Rede B em AUTO → atribui automaticamente)

### Aluno — Rede A (`Aluno Demo Silva`)
1. Código: **`DEMA25`** → tocar nas 3 figuras (modo PICTURE)
2. As figuras do Aluno Demo Silva foram impressas no log do seed-teste
3. Ver atividade com botão **"Ouvir"** (SPOKEN, `maxAudioSec=120`)

### Família (`familia.b@speakflow.escola`)
1. `/escola/familia/entrar`
2. Senha: variável `ESCOLAS_FAMILIA_PASSWORD`
3. Ver bloco do filho → progresso → evolução

### Admin plataforma (`admin.teste@speakflow.escola`)
1. `/escola/plataforma`
2. Estúdio → revisar fichas; aprovar pré-requisitos restantes

---

## Restaurar massa de teste

```bash
railway run npm run escolas:reset-teste
```

O script **recusa executar** se encontrar qualquer rede sem `isDemo=true`.

---

## Mensagem para o Luiz

Configure as variáveis abaixo no Railway → gleaming-endurance → Variables.
**Você escolhe os valores** e cria as variáveis; ninguém entrega nada a você.

| Variável | O que é |
|---|---|
| `ESCOLAS_DEMO_PASSWORD` | Senha de todos os usuários de equipe (staff) |
| `ESCOLAS_DEMO_PIN_B` | PIN do Aluno Demo B Santos (Rede B) |
| `ESCOLAS_FAMILIA_PASSWORD` | Senha de `familia.b@speakflow.escola` |
| `ESCOLAS_ADMIN_TESTE_PASSWORD` | Senha de `admin.teste@speakflow.escola` |
| `ESCOLAS_SEED_TESTE` | Defina como `true` antes do próximo deploy |

Depois que o deploy rodar com `ESCOLAS_SEED_TESTE=true`:

1. Acesse **Railway → Deployments → Logs** e procure o bloco
   `CREDENCIAIS GERADAS NESTA EXECUCAO`.
2. Copie as figuras do Aluno Demo Silva e dos extras do 5º A.
3. Guarde fora do Git (planilha, nota segura, etc.).
4. Mude `ESCOLAS_SEED_TESTE` para `false` para não repetir o seed nos
   próximos deploys (o seed é idempotente, mas não gera o log de figuras
   nas execuções seguintes).

> O PIN do Aluno Demo B Santos (`ESCOLAS_DEMO_PIN_B`) deve ser definido
> **antes** do deploy. O seed usa esse valor para criar o hash do PIN.
> Para o 5º A, os PINs não são relevantes (alunos usam figuras).
