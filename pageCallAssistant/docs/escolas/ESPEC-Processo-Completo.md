# SpeakFlow Escolas — Especificação do processo completo (para o Windsurf)

Fonte da verdade do produto. Descreve, de ponta a ponta, o que o site `speakflowescola.com.br` promete e como a plataforma precisa funcionar para cumprir. Salvo em `pageCallAssistant/docs/escolas/ESPEC-Processo-Completo.md`. Em conflito com qualquer prompt antigo, vale este documento. Não invente comportamento fora daqui: se algo não estiver descrito, pergunte.

## 1. Em uma frase

Reforço escolar em casa, com retorno na hora, para cada aluno. O aluno pratica em casa no que ainda não domina e recebe retorno imediato da IA; a escola sabe quem precisa de ajuda; a família acompanha a evolução de cada filho; em qualquer componente curricular da BNCC.

O que o produto **NÃO** é: sistema de notas, diário de classe, boletim, chamada ou rede social. As notas oficiais continuam no sistema da rede (`FEATURE_ESCOLAS_NOTAS=false`).

## 2. O ciclo de reforço (o coração do produto)

```
 ┌───────────────┐   ┌──────────────────┐   ┌────────────────┐   ┌───────────────┐   ┌────────────────────────┐
 │ 1 DIAGNÓSTICO │──▶│ 2 TRILHA DE      │──▶│ 3 PRÁTICA EM   │──▶│ 4 RETORNO     │──▶│ 5 ESCOLA E FAMÍLIA     │
 │ o que o aluno │   │   REFORÇO        │   │   CASA         │   │   DA IA       │   │   ACOMPANHAM           │
 │ ainda não     │   │ atividades nos   │   │ sessões curtas │   │ acertou, como │   │ professor vê quem      │
 │ domina (BNCC) │   │ pontos fracos,   │   │ texto, voz ou  │   │ melhorar,     │   │ precisa de ajuda;      │
 │               │   │ indicadas pelo   │   │ quiz; celular, │   │ exemplo; pode │   │ pais veem a evolução   │
 │               │   │ professor        │   │ tablet, PC     │   │ refazer       │   │ do filho               │
 └───────▲───────┘   └──────────────────┘   └────────────────┘   └───────────────┘   └───────────┬────────────┘
         │                                                                                        │
         └──────────────────────── novo diagnóstico ajusta a trilha ◀─────────────────────────────┘
```

> "O motor de IA é o mesmo para todos os componentes. Muda só o conteúdo e o critério de avaliação." Cada atividade tem habilidades da BNCC e critérios (rubrica); o mesmo `ai-gateway` corrige Português, Matemática, Inglês, Ciências etc.

A unidade de tudo é a **habilidade da BNCC** (`EduSkill`, ex.: `EF06MA07 — Frações: parte de um todo`). O estado do aluno em cada habilidade é o **nível de domínio** (`EduSkillMastery`):

| Nível | Código | Cor | Texto para aluno e família |
|---|---|---|---|
| Ainda não | `NOT_YET` | vermelho `#B91C1C` / `#FEE2E2` | "Ainda não" |
| Quase lá | `ALMOST` | amarelo `#92400E` / `#FEF3C7` | "Quase lá" |
| Domina | `MASTERED` | verde `#166534` / `#DCFCE7` | "Domina" |
| Não avaliado | (sem registro) | cinza | "Ainda não praticou" |

### ETAPA 1 — Diagnóstico

**Objetivo:** descobrir, por habilidade da BNCC, o que cada aluno ainda não domina.

**Quem faz:**
- Coordenação (ou gestor) cria o diagnóstico da rede ou da escola: componente, ano, ciclo (1º, 2º, 3º…), habilidades avaliadas e janela de aplicação (abre e fecha).
- Professor pode aplicar um diagnóstico rápido só na sua turma.
- Aluno responde em casa ou na escola, nas mesmas telas de atividade.

**Como é montado:**
- 1 a 3 itens por habilidade (quiz, escrita ou fala), 6 a 15 itens no total, cerca de 20 minutos.
- "Sugerir com IA" gera os itens a partir das habilidades e do ano; a coordenação revisa antes de abrir.

**Estados do diagnóstico:** `DRAFT` (montando) → `OPEN` (alunos respondendo) → `CLOSED` (encerrado; resultados consolidados).

**Como vira nível por habilidade:**
- Quiz: acertou todas as questões da habilidade → `MASTERED`; metade ou mais → `ALMOST`; menos → `NOT_YET`.
- Escrita e fala: a IA classifica os critérios da habilidade em `NOT_YET` / `ALMOST` / `MASTERED` (seção 4).
- Grava `EduSkillMastery` (estado atual, `source = DIAGNOSTIC`) e `EduSkillMasteryEvent` (histórico).

**O que cada um vê ao fim:**
- Aluno: "Você já domina 4 habilidades e vai praticar 3." Nunca nota nem porcentagem.
- Professor: mapa da turma (alunos × habilidades, em cores) e a sugestão de trilhas.
- Coordenação e gestor: habilidades prioritárias (as com mais alunos em Ainda não/Quase lá) por ano, componente e escola.
- Família: "Diagnóstico concluído: Ana já domina 4 habilidades e vai praticar 3 em Matemática."

**Regras:** quem não respondeu até o fechamento aparece como "não avaliado" (não vira Ainda não). O aluno pode pausar e continuar (respostas salvas). Um diagnóstico fechado não pode ser editado; correções viram novo ciclo.

### ETAPA 2 — Trilha de reforço

**Objetivo:** dar a cada aluno atividades curtas exatamente nas habilidades em que ele está em Ainda não ou Quase lá.

**O que é uma trilha (`EduTrack`):** título (ex.: "Frações: parte de um todo"), componente, ano, 1 a 3 habilidades, 3 a 8 atividades em ordem, de até 15 minutos cada, da mais simples para a mais difícil. Situação: `DRAFT` → `APPROVED` → `ARCHIVED`.

**Quem monta e indica:**
- Depois do diagnóstico, o sistema sugere ao professor: "12 alunos do 6º B estão em Ainda não em EF06MA07. Sugerir trilha?"
- "Sugerir trilha com IA" propõe as atividades; o professor edita e salva.
- Se a rede exigir, a coordenação aprova antes de liberar.
- O professor atribui (`EduTrackAssignment`) à turma inteira ou a alunos selecionados, com prazo opcional. Atribuição em lote: "Atribuir a todos em vermelho nesta habilidade".
- Trilhas aprovadas ficam na biblioteca da rede para reuso por outras turmas e escolas.

**Regras:**
- Um aluno pode ter várias trilhas ao mesmo tempo (até 3 ativas por componente). "Minha trilha" mostra um próximo passo de cada vez.
- Aluno que já está em Domina na habilidade da trilha não recebe a trilha (o professor pode forçar).
- A trilha termina quando o aluno conclui todas as atividades ou chega a Domina em todas as habilidades dela (aí aparece "Trilha concluída!" e o professor é avisado).

### ETAPA 3 — Prática em casa

**Objetivo:** o aluno pratica fora do horário de aula, sem depender de sala, transporte ou contraturno.

**Acesso (sem e-mail):**
- Cartão com QR code levado para casa (frente: QR e instruções; verso: matrícula, espaço para o PIN e o bloco "Para a família" com o código de família).
- Ou código da turma + matrícula + PIN; anos iniciais com senha por figuras.
- O QR sempre pede o PIN. Funciona no celular, tablet ou computador da família e no app (iOS e Android).
- Atividades de reforço não exigem que o professor "abra a aula".

**Tela "Minha trilha" (início do aluno):** próximo passo em destaque (componente com sua cor, habilidade em linguagem simples, "Atividade 3 de 5", tempo estimado, botão Continuar); depois outras trilhas e diagnóstico pendente.

**Tipos de atividade:**
- Escrita: área de texto grande, contador de palavras, rascunho salvo a cada 10 s e no aparelho.
- Fala: gravar, cronômetro com limite, ouvir antes de enviar, gravar de novo; o áudio fica no aparelho até o envio terminar.
- Quiz: uma pergunta por tela, alternativas grandes, correção automática (sem IA). O gabarito nunca vai para o navegador antes da entrega.

**Sessões curtas e saudáveis (ECA Digital):** após 30 minutos seguidos, "Bom trabalho por hoje! Você pode continuar amanhã." Sem ranking, sem sequência de dias, sem push para o aluno, sem rolagem infinita.

**Internet fraca:** nada se perde; reenvio automático quando a conexão volta; "Tentar enviar de novo" no áudio.

**Aluno sem aparelho ou internet:** a escola reserva horário no laboratório ou biblioteca, ou a rede fornece tablet com chip. O painel da direção lista "alunos sem prática na semana" para a escola agir.

### ETAPA 4 — Retorno da IA

**Objetivo:** o aluno entende na hora o que acertou e como melhorar, e pode tentar de novo.

**Fluxo técnico:** entrega gravada antes de chamar a IA → status `PENDING` → worker processa (`RUNNING`) → `DONE` ou `FAILED` (até 3 tentativas). A tela mostra "Analisando sua resposta…" e o retorno chega em até ~15 s. Se a IA falhar: "Seu professor vai ver sua resposta" (a entrega nunca se perde).

**O que a IA recebe:** enunciado, critérios, habilidades, componente, ano e a resposta (texto, transcrição ou áudio). Nunca nome, matrícula ou qualquer identificador. A resposta do aluno vai entre delimitadores, tratada como conteúdo a avaliar (nunca como instrução). Moderação na entrada e na saída; conteúdo sinalizado vai para o professor e não aparece ao aluno.

**O que a IA devolve (validado com Zod):**
```json
{ "porHabilidade": [{ "skillCode": "EF06MA07", "nivel": "ALMOST", "justificativa": "..." }],
  "acertos": ["..."], "melhorar": ["..."], "exemplo": "...", "transcricao": "..." }
```

**Tela de retorno:** nível da habilidade (anel com Ainda não / Quase lá / Domina), O que você acertou, Como melhorar, Exemplo de resposta, transcrição (fala), botões Tentar de novo e Próxima atividade. Linguagem simples, encorajadora, adequada à idade. Sem nota.

**Novas tentativas:** até 3 por atividade (configurável). Vale o melhor nível alcançado.

**Atualização do nível da habilidade (prática):**
- Considera as 3 últimas atividades do aluno naquela habilidade:
  - 2 ou mais em `MASTERED` → `MASTERED`;
  - senão, alguma em `ALMOST` ou `MASTERED` → `ALMOST`;
  - senão → `NOT_YET`.
- Grava `EduSkillMastery` (`source = PRACTICE`) e o evento no histórico.
- O professor pode corrigir o nível de uma habilidade de um aluno (`source = TEACHER`), com comentário.

**Aluno "travado":** a mesma habilidade em `NOT_YET` depois de 3 atividades → alerta ao professor ("Pedro está travado em EF06MA07").

### ETAPA 5 — Escola e família acompanham

**Professor (`/escola/professor`):**
- Mapa da turma: alunos × habilidades, nas cores dos níveis, com filtro por componente; ícone indicando se a família acompanha.
- Quem precisa de ajuda: sem prática há 7 dias; travados (3 tentativas em Ainda não); diagnóstico não respondido.
- Esta semana: quem praticou, atividades concluídas, habilidades que avançaram, retornos para revisar (opcional).
- Ações: atribuir trilha, abrir o retorno de um aluno, mudar o nível de uma habilidade, sugerir trilha com IA.

**Direção (`/escola/direcao`):** participação por turma na semana; alunos sem nenhuma prática; turmas sem trilha; cartões não impressos; famílias (com acesso, sem responsável, convites pendentes).

**Coordenação (`/escola/coordenacao`):** diagnósticos; habilidades prioritárias por ano e componente; trilhas aguardando aprovação; escolas e turmas que precisam de mais apoio.

**Secretaria / gestor (`/escola/rede`):** alunos que praticaram na semana (%); atividades concluídas; habilidades em defasagem por escola, ano e componente; habilidades recuperadas (Ainda não → Domina) no período; evolução entre diagnósticos; famílias acompanhando (%); exportação CSV e PDF ("Relatório de recomposição das aprendizagens", alinhado ao Decreto 12.391/2025). Nunca ranking nominal de alunos.

**Família (`/escola/familia`):**
- Acesso próprio, separado do aluno. Um login para todos os filhos da rede (mesmo em escolas diferentes), com seletor de filho. Um aluno pode ter vários responsáveis (mãe, pai, avó, tutor).
- Entrada por convite (e-mail ou link por WhatsApp) ou código de família do cartão + data de nascimento do aluno. Login com e-mail ou celular + senha.
- Vê, por filho: esta semana (dias que praticou, atividades, frase-resumo), trilha atual e progresso, evolução por habilidade, últimos retornos (acertos e como melhorar), dica de como ajudar em casa (gerada pela IA a partir da habilidade mais fraca), alertas ("7 dias sem praticar", "novo diagnóstico disponível"), contato da escola.
- Resumo semanal por e-mail (opcional), aos domingos.
- Não vê: outros alunos, ranking, comparação com a turma. A direção pode desvincular um responsável (motivo obrigatório, ex.: decisão judicial), com registro na auditoria.

### ↺ Novo diagnóstico ajusta a trilha
- A coordenação abre um novo ciclo de diagnóstico (sugestão: a cada bimestre ou trimestre).
- O resultado atualiza `EduSkillMastery` (`source = DIAGNOSTIC`) e gera o comparativo início × agora por aluno, turma, escola e rede.
- Habilidades que chegaram a Domina encerram as trilhas correspondentes; as que continuam fracas geram novas sugestões de trilha para o professor.
- Indicador-chave da rede: habilidades recuperadas (alunos que saíram de Ainda não para Domina).

## 3. Uma semana de reforço (como o site descreve)

| Quando | Quem | O que acontece no sistema |
|---|---|---|
| Segunda, na escola | Professor | Abre o mapa da turma e atribui ou ajusta trilhas |
| Durante a semana, em casa | Aluno | Faz sessões curtas da "Minha trilha" |
| Na hora | IA | Corrige, explica, atualiza o nível da habilidade |
| No painel | Escola | Vê quem praticou, quem avançou, quem travou; chama quem precisa de ajuda na aula seguinte |
| Domingo | Família | Recebe o resumo da semana e uma dica de como ajudar |

Semana = segunda a domingo, fuso `America/Sao_Paulo`. Os indicadores semanais usam essa janela.

## 4. Exemplo de ponta a ponta (use como teste de aceite)

1. A coordenação da rede Vila Esperança cria o **Diagnóstico de Matemática · 6º ano · ciclo 1** com 5 habilidades e abre de 03/03 a 10/03.
2. **Ana** (6º B) entra em casa pelo cartão QR + PIN, responde em 18 minutos. Resultado: Domina 2, Quase lá 1, Ainda não 2 (EF06MA07 entre elas).
3. A professora vê o mapa do 6º B: 12 alunos em vermelho em EF06MA07. Clica "Sugerir trilha com IA", ajusta 5 atividades, salva; a coordenação aprova; ela atribui aos 12.
4. Ana abre o app na terça: "Minha trilha · Matemática · Frações: parte de um todo · Atividade 1 de 5 · 10 min". Faz o quiz, depois uma escrita explicando 3/4 de uma pizza.
5. A IA devolve "Quase lá", com o que acertou, como melhorar e um exemplo. Ana tenta de novo e chega a "Domina" na atividade.
6. Depois de 3 atividades com 2 em Domina, EF06MA07 vira Domina para a Ana. A trilha mostra "Trilha concluída!" e a professora recebe o aviso.
7. **Pedro**, colega da Ana, fica 3 vezes em "Ainda não": a professora recebe "Pedro está travado em EF06MA07" e o chama na aula.
8. **Maria**, mãe da Ana e do Pedro (3º A, outra escola), entra com um único login, alterna entre os dois filhos, vê a semana de cada um e a dica "Peça para ela explicar o que é 3/4 usando uma pizza". No domingo recebe o resumo por e-mail.
9. Em maio, o ciclo 2 do diagnóstico mostra que 9 dos 12 alunos saíram de Ainda não para Domina em EF06MA07. O gestor exporta o Relatório de recomposição das aprendizagens.

## 5. Implantação e preparação (antes do ciclo começar)

Conforme o site ("Implantação em 4 etapas"):

1. **Acordo:** apresentação à equipe, escolas e prioridades do reforço, contrato. → Administrador da plataforma cria a rede e convida o gestor.
2. **Implantação:** o gestor faz o assistente de 8 passos, quase tudo por planilha:
   1. Escolas (modelo A) · 2. Ano letivo e períodos · 3. Matriz curricular (BNCC pré-carregada) · 4. Servidores (modelo B, convites automáticos) · 5. Turmas e alunos com até 2 responsáveis (modelo C) · 6. Atribuições professor × turma × componente (modelo D) · 7. Cartões de acesso (PDF por turma, com bloco da família) · 8. Revisão (pendências). Depois: formação dos professores, diagnóstico inicial, apresentação às famílias e entrega dos cartões.
3. **Reforço em casa:** trilhas semanais; visitas quinzenais da equipe Codevelop; suporte.
4. **Resultados:** novo diagnóstico, relatório da rede, ajustes com a Secretaria.

Funciona na rede toda ou em grupos de escolas.

## 6. Segurança e proteção de dados (como o site promete)

- O aluno **tem**: trilhas indicadas pela escola, retorno imediato, a própria evolução, acesso com cartão QR ou matrícula e PIN.
- O aluno **não tem**: rede social, chat ou contato com desconhecidos; anúncios ou compras; perfil público, foto ou localização; ranking entre colegas; notificações para prender a atenção.
- A família vê só os próprios filhos, com acesso registrado e revogável pela escola.
- A IA nunca recebe nome nem matrícula. A Secretaria é a dona dos dados (controladora); a Codevelop é operadora.
- Leis: LGPD (art. 14), ECA Digital (Lei 15.211/2025), Lei 15.100/2025 (o reforço é em casa; na escola, só com fim pedagógico), PNED (Lei 14.533/2023), Pacto pela Recomposição das Aprendizagens (Decreto 12.391/2025).
- Isolamento total por rede; toda consulta filtra `networkId` da sessão.

## 7. Respostas que o produto precisa sustentar (FAQ do site)

| Pergunta do site | Como o sistema garante |
|---|---|
| Só serve para Português e Matemática? | Habilidades e componentes de toda a BNCC; mesmo motor de IA |
| O aluno precisa de e-mail ou celular próprio? | Cartão QR / matrícula + PIN, no aparelho que a família tiver |
| E quem não tem internet em casa? | Laboratório/biblioteca, tablet com chip; painel "sem prática na semana" |
| A IA substitui o professor? | Professor indica trilhas, acompanha, pode corrigir o nível |
| Isso substitui as notas da escola? | Não; módulo de notas desligado; notas ficam no sistema da rede |
| Os pais conseguem acompanhar? | Área da família com acesso próprio |
| Mais de um filho na rede? | Um login, seletor de filhos |
| Mais de um familiar por aluno? | Vários responsáveis por aluno, cada um com acesso |
| Família sem e-mail? | Código de família do cartão + data de nascimento |
| E os dados dos alunos? | Isolamento por rede, IA sem identificação, sem anúncios |

## 8. Mapa de telas por perfil (o que precisa existir)

| Perfil | Telas |
|---|---|
| Aluno | Entrar (QR, código, matrícula+PIN, figuras) · Minha trilha · Atividade (escrita, fala, quiz) · Retorno · Minha evolução · Diagnóstico pendente |
| Família | Entrar / primeiro acesso com código · Meus filhos · Painel do filho (semana, trilha, evolução, retornos, dica, alertas, contato) · Preferências (resumo por e-mail) |
| Professor | Minhas turmas · Mapa da turma · Trilhas (criar, sugerir com IA, atribuir) · Atividades (criar, sugerir com IA) · Retornos para revisar · Diagnóstico da turma |
| Direção | Visão geral · Turmas e alunos · Famílias · Atribuições · Servidores e convites · Cartões de acesso · Participação |
| Coordenação | Visão geral · Diagnósticos · Trilhas (aprovar, biblioteca) · Habilidades prioritárias · Escolas e turmas |
| Gestor da rede | Visão geral · Implantação · Escolas · Turmas e alunos · Servidores e convites · Diagnósticos · Habilidades prioritárias · Indicadores · Auditoria |
| Administrador da plataforma | Visão geral · Redes · Convites · Administradores · Auditoria |

Regra: item de menu só aparece quando a tela existe. Toda tela segue o tema claro e os componentes do design (ver `.windsurf/rules/speakflow-escolas.md`).

## 9. Ordem de construção recomendada

1. Habilidades BNCC + atividades ligadas a habilidades.
2. Diagnóstico (criar, abrir, responder, consolidar, mapa da turma).
3. Trilhas (sugerir, editar, aprovar, atribuir) + "Minha trilha" do aluno.
4. Retorno por habilidade + regra de atualização do nível + aluno travado.
5. Família (acesso, vários filhos, painel, resumo semanal).
6. Painéis de direção, coordenação e rede + relatório de recomposição.
7. Novo ciclo de diagnóstico e comparativo início × agora.

Pare ao fim de cada item e mostre as telas com o exemplo da seção 4.
