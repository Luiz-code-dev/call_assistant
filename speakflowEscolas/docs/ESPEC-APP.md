# SpeakFlow Escolas · App nativo — telas, layout e regras (para o Devin)

Documentos a manter no repositório (ler antes de começar):
- `.windsurf/rules/speakflow-escolas.md` (memória do projeto, com `trigger: always_on`);
- `pageCallAssistant/docs/escolas/ESPEC-Processo-Completo.md` (fonte da verdade do produto).

Referências visuais, nesta ordem de prioridade:
1. O site `https://speakflowescola.com.br` (mockups de "Minha trilha", demonstração do retorno e celular da família);
2. As telas web já prontas em `pageCallAssistant/app/(escola)/escola/` (aluno, família, professor): o app mostra a mesma informação, com o mesmo texto, adaptado ao celular;
3. Este documento.

Não mexer em `speakflowMobile/` (SpeakFlow AI): só leitura.

## 1. Regras gerais
- Produto: reforço escolar em casa. Ciclo: diagnóstico → trilha → prática em casa → retorno da IA → escola e família acompanham → novo diagnóstico.
- Nunca mostrar nota, média, boletim ou ata. O resultado é o nível da habilidade: Domina (verde `#166534` em `#DCFCE7`) · Quase lá (`#92400E` em `#FEF3C7`) · Ainda não (`#B91C1C` em `#FEE2E2`).
- Sem ranking, sem sequência de dias, sem push para aluno, sem rolagem infinita, sem anúncio, sem compra.
- A IA nunca recebe nome nem matrícula (isso é do servidor; o app não manda dados extras).
- Toda tela tem estados: carregando (esqueleto na forma dos cartões, cor `#EDE9FE`), vazio (frase que explica o motivo e o próximo passo) e erro ("Não foi possível carregar. Tente de novo." + botão). Erro de API nunca vira lista vazia.
- Funciona em celular (360 px), tablet de 7" a 13", retrato e paisagem. No tablet em paisagem, conteúdo em coluna central de até 640 px ou duas colunas quando indicado.

## 2. Visual (tokens em `lib/theme.ts`, iguais ao site)
- Fundo `#F8F7FC`; cartões brancos, borda `#E9E5F5`, raio 20 px, sombra muito suave; espaço entre cartões 12–16 px; margens laterais 16 px.
- Texto `#1F1A2E`; secundário `#5B5470`; ação roxo `#6D28D9` (pressionado `#5B21B6`); "Escolas" do logo em `#BE185D`.
- Cores dos componentes: Inglês `#6D28D9` · Português `#BE185D` · Matemática `#1D4ED8` · Ciências `#0F766E` · História `#C2410C` · Geografia `#15803D` · Espanhol `#A16207`. O selo do componente é pílula com fundo claro da cor e texto na cor.
- Fonte Inter (via `expo-font`); títulos 22–26 px peso 800; texto 15–16 px; legendas 12–13 px.
- Ícones lucide-react-native, traço 2. Nunca emoji.
- Botões: primário roxo com texto branco, altura 52 px nas telas do aluno e 48 px nas demais, raio 12 px; secundário branco com borda.
- Logo: balão roxo com barras de onda brancas + "SpeakFlow Escolas".

## 3. Navegação
```
Entrada (/)
 ├─ Sou aluno ──────────► Aluno: Minha trilha · Atividade · Retorno · Minha evolução · Configurações
 ├─ Equipe escolar ─────► Professor: Minhas turmas · Mapa da turma · Retornos para revisar · Configurações
 │                         Gestor / Coordenação / Direção: tela "Abrir no navegador"
 └─ Sou responsável* ───► Família: Painel do filho · Evolução · Retornos · Adicionar filho · Configurações
 (* só com familyEnabled = true em GET /api/escola/config)
```
- Abrir o app com sessão salva → vai direto para a tela inicial do perfil.
- Sessão: token no `expo-secure-store` enviado como `Authorization: Bearer` (o servidor aceita também cookie, para a web).
- Sair (em Configurações de cada perfil): apaga o token e volta para o login do mesmo perfil.

## 4. Telas

### 4.1 Entrada
```
        [logo SpeakFlow Escolas]
   Reforço escolar em casa, com
   retorno na hora, para cada aluno.

 ┌───────────────────────────────────┐
 │ [GraduationCap]  Sou aluno         │  roxo #6D28D9, texto branco, 96 px de altura
 │ Cartão QR, código da turma ou PIN │
 └───────────────────────────────────┘
 ┌───────────────────────────────────┐
 │ [HeartHandshake] Sou pai, mãe ou   │  branco com borda (só com familyEnabled)
 │ responsável                         │
 └───────────────────────────────────┘
 ┌───────────────────────────────────┐
 │ [Users] Equipe escolar             │  branco com borda
 └───────────────────────────────────┘
   Termos de Uso · Aviso de Privacidade
```

### 4.2 Aluno · Entrar (`POST /api/escola/auth/aluno/login`, `POST /api/escola/aluno/entrar`)
- Título "Olá! Como você quer entrar?" e três opções grandes empilhadas (como na web `/escola/aluno/entrar`):
  - **Ler meu cartão** (`QrCode`, roxo): abre a câmera (`CameraView`) só ao tocar; moldura quadrada; ao ler, mostra "Olá, {primeiro nome}!" e o PIN (teclado numérico 3×4, 6 bolinhas).
  - **Código da turma** (`Hash`, verde-água `#0F766E`): código da turma → lista de nomes da turma em botões grandes → PIN.
  - **Matrícula e PIN** (`IdCard`, laranja `#C2410C`): código da turma + matrícula + PIN.
- Aviso no rodapé: "Se este aparelho for da escola, toque sempre em Sair ao terminar."
- PIN errado: "PIN incorreto. Tente de novo." Após 5 erros: "Muitas tentativas. Peça ajuda ao professor." (bloqueio do servidor).
- Câmera negada: "Para ler o cartão, permita o uso da câmera em Ajustes" + botão "Abrir ajustes" + opção "Entrar com código".

### 4.3 Aluno · Minha trilha (início) (`GET /api/escola/aluno/trilhas`, `GET /api/escola/aluno/atividades`)
Igual ao cartão do topo do site:
```
 (A) Olá, Ana!   6º B · Manhã                 [Sair → Configurações]
 ┌ Próximo passo ─────────────────────────────┐
 │ [Matemática · 6º ano]          Minha trilha │
 │ Habilidade                                   │
 │ Frações: parte de um todo                    │
 │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  Atividade 3 de 5 · 10 min │
 │ [        Continuar        ] (52 px, roxo)    │
 └──────────────────────────────────────────────┘
 ┌ Retorno na hora ───────────────────────────┐  (último retorno, fundo #F5F3FF)
 │ Inglês · ontem · [Quase lá]                  │
 │ "Ligue as ideias com then e after that"      │
 └──────────────────────────────────────────────┘
 Outras trilhas (cartões menores com selo do componente e "x de y")
 Diagnóstico pendente (cartão com borda roxa: "Responder diagnóstico de Matemática")
 [Minha evolução]  (atalho)
```
- Vazio: "Você ainda não tem trilha. Quando o professor indicar, ela aparece aqui."
- Depois de 30 min seguidos de uso: cartão "Bom trabalho por hoje! Você pode continuar amanhã."

### 4.4 Aluno · Atividade (`GET /api/escola/aluno/atividades`, `PUT .../[id]/rascunho`, `POST .../[id]/enviar`, `POST /api/escola/aluno/transcrever`)
- Topo: "←", selo do componente, "Atividade 3 de 5", título.
- Enunciado em cartão (rótulo "ENUNCIADO" 12 px).
- **Fala**: cronômetro "0:24 / 1:30", onda sonora animada rosa `#DB2777` durante a gravação, botão redondo grande (88 px) rosa para gravar/parar; depois: Ouvir, Gravar de novo, Enviar resposta. Microfone pedido só ao tocar em gravar.
- **Escrita**: área de texto grande (16 px+), contador de palavras, selo "Rascunho salvo" (salva a cada 10 s no servidor e no aparelho), Enviar.
- **Quiz**: uma pergunta por tela, alternativas como botões de 56 px, barra de progresso, revisão antes de enviar.
- Aviso de IA no primeiro envio (uma vez por aluno no aparelho e registrado no servidor): "Suas respostas (texto ou áudio) são enviadas a um serviço de inteligência artificial para gerar o retorno. Seu nome e sua matrícula não são enviados." [Entendi].
- Sem internet: guarda o rascunho e o áudio no aparelho e mostra "Sem internet. Sua resposta foi guardada e será enviada quando a conexão voltar." com "Tentar enviar de novo".

### 4.5 Aluno · Retorno (`GET /api/escola/aluno/atividades/[id]/retorno`)
Igual à demonstração do site:
```
 Habilidade: Frações: parte de um todo
 ┌──────────────────────────────────────┐
 │  ( anel )  Quase lá                    │  anel 96 px com a cor do nível
 │  O professor acompanha este retorno    │
 │  no painel da turma.                   │
 └──────────────────────────────────────┘
 ┌ O que você acertou ── fundo #F0FDF4 ┐  ícone Check verde
 ┌ Como melhorar ──────── fundo #F5F3FF ┐  ícone ArrowUpRight roxo
 ┌ Exemplo de resposta ── branco, itálico ┐
 ┌ Sua fala (transcrição) ┐ (só em fala)
 [ Tentar de novo ]  [ Próxima atividade ]
 Reportar este retorno (link discreto, ícone Flag)
```
- "Analisando sua resposta…" enquanto `aiStatus` é PENDING/RUNNING (consultar a cada 3 s, até 60 s).
- IA falhou: "Seu professor vai ver sua resposta." (a entrega nunca se perde).
- Reportar: folha com motivos ("Retorno errado", "Conteúdo inadequado", "Outro" + texto) → `POST /api/escola/aluno/retornos/[submissionId]/reportar` → "Obrigado. Seu professor vai olhar."

### 4.6 Aluno · Minha evolução
- Por componente (título com a cor), lista de habilidades em linguagem simples com o selo do nível e "desde o diagnóstico: Ainda não → Quase lá". Sem comparação com colegas.

### 4.7 Família · Entrar (`POST /api/escola/familia/login`, `/ativar`, `/esqueci-senha`)
- Igual à web `/escola/familia/entrar` (PR #47): Entrar com "E-mail ou celular" + "Senha", "Esqueci minha senha", botão Entrar.
- Link "Primeiro acesso? Use o código do cartão do aluno" → código de família + data de nascimento dd/mm/aaaa (máscara ou seletor nativo; envia ISO) → confirmação "Você vai acompanhar Ana Souza, 6º B · EM …" → nome, parentesco, celular/e-mail, senha → Termos → painel.

### 4.8 Família · Painel do filho (`GET /api/escola/familia/filhos`, `.../filhos/[id]/resumo`)
Igual ao celular da seção "A família acompanha cada passo" do site e à web `/escola/familia/[studentId]`:
- Topo: logo, "Olá, Maria", menu.
- Seletor de filhos em chips ("Ana · 6º B" ativo roxo, "Pedro · 3º A").
- Blocos, nesta ordem: Alertas (se houver) · Esta semana (7 bolinhas S T Q Q S S D + "Ana praticou 4 dias esta semana. Muito bem!" + "7 atividades · cerca de 50 minutos") · Trilha atual (selo do componente, habilidade, barra "3 de 5") · Evolução (selos Domina 5 · Quase lá 2 · Ainda não 1 + "2 habilidades avançaram este mês" + "Ver evolução ›") · Como ajudar (fundo `#FEF3C7`, ícone Lightbulb, a dica) · Últimos retornos (3, com selo e uma linha de acertou / pode melhorar) · Escola (nome, turma, turno, telefone, e-mail).
- Tablet em paisagem: duas colunas (Esta semana + Trilha | Evolução + Como ajudar + Retornos).
- Telas internas: Evolução (`.../evolucao`), Retornos (`.../retornos`), Adicionar filho (`/api/escola/familia/adicionar-filho`).

### 4.9 Equipe · Entrar (`POST /api/escola/auth/staff/login`)
- E-mail + senha + "Esqueci minha senha" (abre a web). Vários vínculos → lista "Onde você vai trabalhar agora?".
- Professor → telas 4.10. Gestor, coordenação, direção, administrador → tela: ícone `Monitor`, "A gestão da rede e da escola é feita no computador.", botão Abrir no navegador (`https://www.speakflow.ia.br/escola/entrar`) e Sair. Nunca tela vazia.

### 4.10 Professor (`GET /api/escola/professor/turmas`, `.../turmas/[classId]/mastery`, `.../atividades/[id]/entregas`, `/api/escola/trilhas`, `.../[id]/atribuir`)
- Minhas turmas: cartões por turma e componente (selo), "x alunos praticaram nesta semana", "y precisam de ajuda".
- Mapa da turma: grade alunos × habilidades com quadrados verde/amarelo/vermelho/cinza; toque no aluno → ficha com níveis e últimas entregas; filtro por componente. No celular, rolagem horizontal das habilidades com a coluna do aluno fixa.
- Quem precisa de ajuda: sem prática há 7 dias; travados (3 tentativas em Ainda não).
- Retornos para revisar: lista; abrir → resposta, áudio (`.../audio`), retorno da IA, mudar o nível da habilidade com comentário.
- Atribuir trilha: escolher trilha aprovada → turma inteira ou alunos selecionados.

### 4.11 Configurações (todos os perfis)
Nome e perfil · Termos de Uso · Aviso de Privacidade · Excluir minha conta (família: exclui de verdade; equipe e aluno: "Pedir exclusão à escola") · Versão do app · Sair (vermelho).

## 5. Aceite visual
Para cada tela: print do app (celular 360 px e tablet em paisagem) ao lado do trecho correspondente do site ou da tela web. Diferença de texto, cor, ordem ou nome de nível = corrigir antes de seguir.
