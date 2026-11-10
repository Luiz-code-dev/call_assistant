#!/usr/bin/env node
/**
 * scripts/escolas/gerar-pacote-todas-materias.mjs
 *
 * Gera pacotes de demonstracao para todos os componentes BNCC
 * do 5o e 6o ano que ainda nao existem (CI, HI, GE, AR, EF, ER, LI, LP-06).
 *
 * Uso: node scripts/escolas/gerar-pacote-todas-materias.mjs
 *
 * Saida:
 *   prisma/data/conteudo/trilhas/<COMP>-<ANO>.json
 *   prisma/data/conteudo/diagnosticos/DIAG-<COMP>-<ANO>.json
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const TRILHAS_DIR = join(ROOT, "prisma", "data", "conteudo", "trilhas");
const DIAG_DIR    = join(ROOT, "prisma", "data", "conteudo", "diagnosticos");

mkdirSync(TRILHAS_DIR, { recursive: true });
mkdirSync(DIAG_DIR,    { recursive: true });

// ── BNCC: títulos vêm do bncc-ef.csv; código inexistente aborta ──────────
const CSV_PATHS = [join(ROOT, "prisma", "data", "bncc-ef.csv")];
const CSV_PATH = CSV_PATHS.find((p) => existsSync(p));
if (!CSV_PATH) throw new Error("bncc-ef.csv não encontrado: " + CSV_PATHS.join(", "));
const BNCC = {};
for (const linha of readFileSync(CSV_PATH, "utf8").split(/\r?\n/).slice(1)) {
  const m = linha.match(/^([A-Z0-9]+),([A-Z]+),/);
  if (!m) continue;
  const label = linha.slice(linha.lastIndexOf(",") + 1).replace(/^"|"$/g, "").trim();
  BNCC[m[1]] = { comp: m[2], label };
}
function hab(code, comp) {
  const b = BNCC[code];
  if (!b) throw new Error(`Código BNCC inexistente no bncc-ef.csv: ${code}`);
  if (b.comp !== comp) throw new Error(`${code} é de ${b.comp}, não de ${comp}`);
  return { code, titulo: b.label };
}

// [componente, ano, nome, [[habilidade, pré-requisito], ...]]
const SPEC = [
  ["CI", 5, "Ciências",          [["EF05CI01","EF04CI01"],["EF05CI02","EF04CI04"],["EF05CI07","EF04CI06"],["EF05CI09","EF04CI11"]]],
  ["HI", 5, "História",          [["EF05HI01","EF04HI01"],["EF05HI02","EF04HI06"],["EF05HI06","EF04HI07"],["EF05HI08","EF04HI09"]]],
  ["GE", 5, "Geografia",         [["EF05GE01","EF04GE01"],["EF05GE03","EF04GE03"],["EF05GE06","EF04GE06"],["EF05GE11","EF04GE11"]]],
  ["AR", 5, "Arte",              [["EF15AR01","EF15AR02"],["EF15AR13","EF15AR14"],["EF15AR08","EF15AR09"],["EF15AR18","EF15AR19"]]],
  ["EF", 5, "Educação Física",   [["EF35EF01","EF12EF01"],["EF35EF04","EF12EF04"],["EF35EF07","EF12EF07"],["EF35EF12","EF12EF11"]]],
  ["ER", 5, "Ensino Religioso",  [["EF05ER01","EF04ER01"],["EF05ER02","EF04ER02"],["EF05ER04","EF04ER04"],["EF05ER05","EF04ER05"]]],
  ["LP", 6, "Língua Portuguesa", [["EF06LP01","EF05LP01"],["EF06LP04","EF05LP04"],["EF06LP07","EF05LP07"],["EF06LP12","EF05LP12"]]],
  ["CI", 6, "Ciências",          [["EF06CI01","EF05CI01"],["EF06CI03","EF05CI02"],["EF06CI06","EF05CI07"],["EF06CI10","EF05CI09"]]],
  ["HI", 6, "História",          [["EF06HI01","EF05HI01"],["EF06HI02","EF05HI02"],["EF06HI06","EF05HI06"],["EF06HI13","EF05HI08"]]],
  ["GE", 6, "Geografia",         [["EF06GE01","EF05GE01"],["EF06GE03","EF05GE03"],["EF06GE06","EF05GE06"],["EF06GE10","EF05GE11"]]],
  ["AR", 6, "Arte",              [["EF69AR01","EF15AR01"],["EF69AR16","EF15AR13"],["EF69AR09","EF15AR08"],["EF69AR24","EF15AR18"]]],
  ["EF", 6, "Educação Física",   [["EF67EF01","EF35EF01"],["EF67EF04","EF35EF04"],["EF67EF07","EF35EF07"],["EF67EF10","EF35EF12"]]],
  // Língua Inglesa começa no 6º ano: não há ano anterior; o degrau usa habilidades básicas do próprio 6º
  ["LI", 6, "Língua Inglesa",    [["EF06LI01","EF06LI03"],["EF06LI02","EF06LI04"],["EF06LI09","EF06LI08"],["EF06LI13","EF06LI12"]]],
  ["ER", 6, "Ensino Religioso",  [["EF06ER01","EF05ER01"],["EF06ER02","EF05ER02"],["EF06ER04","EF05ER04"],["EF06ER07","EF05ER07"]]],
];

const PACOTES = SPEC.map(([comp, ano, nomeComp, pares]) => ({
  comp, ano, gradeYear: ano, nomeComp,
  habilidades: pares.map(([h, pre]) => ({ ...hab(h, comp), comp, ano, pre: { ...hab(pre, comp), comp, ano } })),
}));

// ── Helpers de geração de questões ────────────────────────────────────────
function geraQuestao(habilidade, indice, numHab) {
  const { code, titulo } = habilidade;
  const comp = habilidade.comp;
  const ano  = String(habilidade.ano ?? "").padStart(2, "0");

  // Questões genéricas mas válidas por componente
  const banco = questoesPorComp(comp, ano, titulo, code);
  const idx = indice % banco.length;
  return banco[idx];
}

function opt(text, mc) { return mc ? { text, misconceptionCode: mc } : { text }; }

function questoesPorComp(comp, ano, titulo, code) {
  const ano_num = parseInt(ano, 10);
  const anoLabel = ano_num === 5 ? "5º ano" : "6º ano";

  const mapas = {
    CI: [
      {
        question: `Qual das opções descreve corretamente o tema "${titulo}" para o ${anoLabel}?`,
        options: [
          opt(`É um conceito central de Ciências do ${anoLabel} que explica fenômenos naturais observáveis`),
          opt("É um tema exclusivo do Ensino Médio", "nao-pertence-ao-ano"),
          opt("Não faz parte da BNCC de Ciências", "conteudo-errado"),
          opt("É idêntico ao conteúdo do 1º ano", "confunde-anos"),
        ],
        correctIndex: 0,
        explanation: `${titulo} é um conteúdo fundamental de Ciências do ${anoLabel} conforme a BNCC.`,
        variants: [
          {
            question: `Em qual etapa da BNCC encontramos "${titulo}"?`,
            options: [
              opt(`${anoLabel} do Ensino Fundamental`),
              opt("Ensino Médio", "nao-pertence-ao-ano"),
              opt("Educação Infantil", "conteudo-errado"),
              opt("Ensino Superior", "confunde-anos"),
            ],
            correctIndex: 0,
          },
          {
            question: `Por que "${titulo}" é importante de aprender no ${anoLabel}?`,
            options: [
              opt("Ajuda a entender fenômenos do mundo natural com base em evidências"),
              opt("Não tem relação com a vida cotidiana", "nao-pertence-ao-ano"),
              opt("Só é relevante para adultos", "conteudo-errado"),
              opt("É um tema decorativo sem aplicação prática", "confunde-anos"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: `Qual atitude científica está relacionada com o estudo de "${titulo}"?`,
        options: [
          opt("Observar, registrar e comparar dados sobre o fenômeno"),
          opt("Apenas memorizar o nome do conceito", "nao-usa-evidencia"),
          opt("Aceitar qualquer explicação sem questionar", "nao-usa-evidencia"),
          opt("Ignorar o fenômeno por ser complexo", "conteudo-errado"),
        ],
        correctIndex: 0,
        explanation: "Ciências exige observação, registro e comparação de dados.",
        variants: [
          {
            question: `Qual ferramenta um cientista usaria para investigar "${titulo}"?`,
            options: [
              opt("Experimentos, registros e análise de evidências"),
              opt("Apenas livros de ficção", "nao-usa-evidencia"),
              opt("Suposições sem verificação", "nao-usa-evidencia"),
              opt("Nenhuma — não é possível investigar", "conteudo-errado"),
            ],
            correctIndex: 0,
          },
          {
            question: "O método científico começa com:",
            options: [
              opt("Uma observação ou pergunta sobre um fenômeno"),
              opt("Uma conclusão pronta", "nao-usa-evidencia"),
              opt("A memorização de fórmulas", "nao-usa-evidencia"),
              opt("O resultado de outra pessoa", "conteudo-errado"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    HI: [
      {
        question: `Qual é a importância de estudar "${titulo}" no ${anoLabel}?`,
        options: [
          opt("Compreender como o passado influencia o presente e a identidade do povo"),
          opt("Decorar datas para provas", "historia-cronologica-apenas"),
          opt("Saber apenas o nome dos reis", "historia-cronologica-apenas"),
          opt("Não tem importância prática", "conteudo-errado"),
        ],
        correctIndex: 0,
        explanation: "A História nos ajuda a compreender a construção das sociedades e das identidades.",
        variants: [
          {
            question: "O que é fonte histórica?",
            options: [
              opt("Todo registro ou objeto que nos informa sobre o passado"),
              opt("Apenas livros escritos por historiadores", "historia-cronologica-apenas"),
              opt("Somente fotografias antigas", "historia-cronologica-apenas"),
              opt("Inventos do século XX", "conteudo-errado"),
            ],
            correctIndex: 0,
          },
          {
            question: "Por que diferentes povos podem ter visões diferentes sobre um mesmo evento histórico?",
            options: [
              opt("Porque cada grupo vive o evento de forma diferente e tem perspectivas distintas"),
              opt("Porque apenas um deles sabe a verdade", "historia-cronologica-apenas"),
              opt("Porque a história é inventada", "conteudo-errado"),
              opt("Porque só a versão escrita é válida", "historia-cronologica-apenas"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: `Associado a "${titulo}", o conceito de mudança histórica significa:`,
        options: [
          opt("Transformações nas formas de organização social, política e cultural ao longo do tempo"),
          opt("Que tudo sempre permanece igual", "historia-cronologica-apenas"),
          opt("Que apenas guerras geram mudanças", "conteudo-errado"),
          opt("Que o presente é idêntico ao passado", "historia-cronologica-apenas"),
        ],
        correctIndex: 0,
        explanation: "Mudança histórica abrange transformações em todas as dimensões da sociedade.",
        variants: [
          {
            question: "O que são permanências históricas?",
            options: [
              opt("Aspectos que se mantêm ao longo do tempo, mesmo com as mudanças"),
              opt("Eventos que nunca aconteceram", "conteudo-errado"),
              opt("Somente as guerras da Antiguidade", "historia-cronologica-apenas"),
              opt("Festas e comemorações modernas", "historia-cronologica-apenas"),
            ],
            correctIndex: 0,
          },
          {
            question: "O que diferencia a história oral da história escrita?",
            options: [
              opt("A história oral é transmitida pela fala e memória; a escrita, por documentos registrados"),
              opt("A oral é sempre falsa", "historia-cronologica-apenas"),
              opt("A escrita é menos confiável", "conteudo-errado"),
              opt("Não há diferença", "historia-cronologica-apenas"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    GE: [
      {
        question: `No estudo de "${titulo}", o conceito de território significa:`,
        options: [
          opt("Espaço definido por relações de poder, cultura e identidade de um grupo"),
          opt("Apenas a área de um país", "territorio-so-pais"),
          opt("Qualquer área coberta por água", "conteudo-errado"),
          opt("O tamanho de uma cidade", "territorio-so-pais"),
        ],
        correctIndex: 0,
        explanation: "Território envolve poder, identidade e cultura, não apenas limites físicos.",
        variants: [
          {
            question: "O que é lugar, em Geografia?",
            options: [
              opt("Espaço com significado afetivo e identidade para quem o vivencia"),
              opt("Apenas coordenadas geográficas", "territorio-so-pais"),
              opt("Um endereço qualquer", "conteudo-errado"),
              opt("Somente cidades grandes", "territorio-so-pais"),
            ],
            correctIndex: 0,
          },
          {
            question: "Por que o espaço geográfico muda com o tempo?",
            options: [
              opt("Porque as ações humanas e processos naturais transformam continuamente o espaço"),
              opt("Ele nunca muda", "territorio-so-pais"),
              opt("Apenas guerras mudam o espaço", "conteudo-errado"),
              opt("Só o clima o modifica", "territorio-so-pais"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: `Qual recurso é essencial para representar o tema "${titulo}" em mapas?`,
        options: [
          opt("Legenda, escala e orientação (rosa dos ventos)"),
          opt("Apenas cores diferentes", "mapa-sem-legenda"),
          opt("Desenhos artísticos sem referência", "conteudo-errado"),
          opt("Somente o nome do local", "mapa-sem-legenda"),
        ],
        correctIndex: 0,
        explanation: "Todo mapa precisa de legenda, escala e orientação para ser lido corretamente.",
        variants: [
          {
            question: "O que indica a escala em um mapa?",
            options: [
              opt("A relação entre a distância no mapa e a distância real"),
              opt("As cores utilizadas", "mapa-sem-legenda"),
              opt("O nome do país", "conteudo-errado"),
              opt("O tamanho do papel", "mapa-sem-legenda"),
            ],
            correctIndex: 0,
          },
          {
            question: "O que é a legenda de um mapa?",
            options: [
              opt("Conjunto de símbolos e cores que explicam o que cada elemento representa"),
              opt("O título do mapa", "mapa-sem-legenda"),
              opt("A data de criação", "conteudo-errado"),
              opt("O nome do cartógrafo", "mapa-sem-legenda"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    AR: [
      {
        question: `No tema "${titulo}", qual das opções descreve uma linguagem artística?`,
        options: [
          opt("Uma forma de expressão humana que usa elementos estéticos para comunicar ideias e sentimentos"),
          opt("Apenas desenho técnico", "arte-so-visual"),
          opt("Somente música clássica erudita", "arte-so-visual"),
          opt("Fotografias científicas", "conteudo-errado"),
        ],
        correctIndex: 0,
        explanation: "Linguagem artística é toda forma de expressão estética: visual, sonora, corporal, cênica.",
        variants: [
          {
            question: "O que são elementos visuais básicos em Arte?",
            options: [
              opt("Ponto, linha, forma, cor, textura e espaço"),
              opt("Apenas cores quentes e frias", "arte-so-visual"),
              opt("Somente o ponto", "conteudo-errado"),
              opt("Figuras geométricas perfeitas", "arte-so-visual"),
            ],
            correctIndex: 0,
          },
          {
            question: "O que é apreciação estética?",
            options: [
              opt("A capacidade de observar, sentir e refletir sobre uma obra de arte"),
              opt("Apenas comprar obras caras", "arte-so-visual"),
              opt("Criticar negativamente", "conteudo-errado"),
              opt("Copiar obras sem autoria", "arte-so-visual"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: "O que distingue arte popular de arte erudita?",
        options: [
          opt("Origem, contexto de produção e público — ambas têm valor cultural"),
          opt("A erudita é sempre superior", "arte-so-visual"),
          opt("A popular não é arte de verdade", "conteudo-errado"),
          opt("Não há diferença", "arte-so-visual"),
        ],
        correctIndex: 0,
        explanation: "Arte popular e erudita são formas igualmente válidas de expressão cultural, com origens e contextos diferentes.",
        variants: [
          {
            question: "O que é patrimônio cultural imaterial?",
            options: [
              opt("Tradições, saberes, festas e expressões culturais de um povo"),
              opt("Apenas prédios históricos", "arte-so-visual"),
              opt("Somente objetos em museus", "conteudo-errado"),
              opt("Pinturas famosas", "arte-so-visual"),
            ],
            correctIndex: 0,
          },
          {
            question: "O que caracteriza uma dança folclórica?",
            options: [
              opt("Movimentos e ritmos transmitidos por gerações, ligados à cultura local"),
              opt("Coreografias criadas por uma única pessoa famosa", "arte-so-visual"),
              opt("Dança sem significado cultural", "conteudo-errado"),
              opt("Exclusivamente dança clássica europeia", "arte-so-visual"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    EF: [
      {
        question: `No tema "${titulo}", qual é o objetivo principal da Educação Física escolar?`,
        options: [
          opt("Desenvolver habilidades motoras, saúde e valores por meio de práticas corporais"),
          opt("Apenas vencer competições esportivas", "ef-so-competicao"),
          opt("Eliminar alunos com menos aptidão", "conteudo-errado"),
          opt("Substituir outras disciplinas", "ef-so-competicao"),
        ],
        correctIndex: 0,
        explanation: "Educação Física escolar desenvolve corpo, saúde, cooperação e cultura de movimento.",
        variants: [
          {
            question: "O que é cultura corporal de movimento?",
            options: [
              opt("Conjunto de práticas corporais com significado cultural: esportes, danças, lutas, ginásticas"),
              opt("Apenas exercícios de musculação", "ef-so-competicao"),
              opt("Somente corrida e natação", "conteudo-errado"),
              opt("Atividades exclusivamente competitivas", "ef-so-competicao"),
            ],
            correctIndex: 0,
          },
          {
            question: "Por que o fair play (jogo limpo) é importante no esporte?",
            options: [
              opt("Porque promove respeito, honestidade e convivência saudável entre os participantes"),
              opt("Porque permite ganhar de qualquer forma", "ef-so-competicao"),
              opt("Porque não existe no esporte profissional", "conteudo-errado"),
              opt("Porque elimina a competição", "ef-so-competicao"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: "Qual é a diferença entre esporte de rendimento e esporte de participação?",
        options: [
          opt("O rendimento foca em alto desempenho e resultados; o de participação, em saúde e prazer"),
          opt("São exatamente iguais", "ef-so-competicao"),
          opt("O de participação não é esporte", "conteudo-errado"),
          opt("Só o rendimento tem regras", "ef-so-competicao"),
        ],
        correctIndex: 0,
        explanation: "Esporte de rendimento busca máximo desempenho; esporte de participação busca bem-estar e inclusão.",
        variants: [
          {
            question: "O que são habilidades motoras básicas?",
            options: [
              opt("Movimentos fundamentais como correr, saltar, arremessar e rolar"),
              opt("Apenas habilidades de atletas profissionais", "ef-so-competicao"),
              opt("Movimentos exclusivos de adultos", "conteudo-errado"),
              opt("Somente nadar e pedalar", "ef-so-competicao"),
            ],
            correctIndex: 0,
          },
          {
            question: "O que é atividade física de intensidade moderada?",
            options: [
              opt("Exercício que aumenta a frequência cardíaca mas permite conversar"),
              opt("Apenas descanso e caminhada lenta", "ef-so-competicao"),
              opt("Exercícios exclusivamente competitivos", "conteudo-errado"),
              opt("Atividade que causa exaustão total", "ef-so-competicao"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    ER: [
      {
        question: `No tema "${titulo}", o que é diversidade religiosa?`,
        options: [
          opt("A existência de diferentes crenças, práticas e tradições espirituais no mundo"),
          opt("Apenas as religiões mais antigas", "er-so-religiao"),
          opt("A ausência de religião", "conteudo-errado"),
          opt("Somente o cristianismo e o islamismo", "er-so-religiao"),
        ],
        correctIndex: 0,
        explanation: "Diversidade religiosa reconhece e respeita todas as formas de crença e espiritualidade.",
        variants: [
          {
            question: "O que é laicidade do Estado?",
            options: [
              opt("Separação entre o Estado e as instituições religiosas, garantindo liberdade de crença"),
              opt("Proibição de qualquer religião", "er-so-religiao"),
              opt("Adoção de uma religião oficial pelo governo", "conteudo-errado"),
              opt("Obrigação de seguir uma tradição espiritual", "er-so-religiao"),
            ],
            correctIndex: 0,
          },
          {
            question: "O que é liberdade religiosa?",
            options: [
              opt("O direito de cada pessoa escolher, praticar ou não ter religião, sem discriminação"),
              opt("A obrigação de seguir a religião dos pais", "er-so-religiao"),
              opt("Mudar de crença é proibido", "conteudo-errado"),
              opt("Liberdade só para religiões antigas", "er-so-religiao"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: "O que são valores universais no contexto das religiões?",
        options: [
          opt("Princípios como amor, respeito, justiça e solidariedade presentes em diversas tradições"),
          opt("Regras específicas de uma só religião", "er-so-religiao"),
          opt("Leis governamentais", "conteudo-errado"),
          opt("Apenas mandamentos escritos", "er-so-religiao"),
        ],
        correctIndex: 0,
        explanation: "Valores como amor e respeito aparecem em múltiplas tradições religiosas e espirituais.",
        variants: [
          {
            question: "O que é intolerância religiosa?",
            options: [
              opt("Desrespeito, discriminação ou violência contra pessoas por suas crenças"),
              opt("Preferir uma religião às outras", "er-so-religiao"),
              opt("Não ter religião alguma", "conteudo-errado"),
              opt("Estudar religiões diferentes da sua", "er-so-religiao"),
            ],
            correctIndex: 0,
          },
          {
            question: "Por que o diálogo inter-religioso é importante?",
            options: [
              opt("Promove entendimento, respeito e paz entre pessoas de diferentes crenças"),
              opt("Porque prova que uma religião é melhor", "er-so-religiao"),
              opt("Para eliminar diferenças", "conteudo-errado"),
              opt("Não tem importância prática", "er-so-religiao"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    LP: [
      {
        question: `No estudo de "${titulo}", o que é coesão textual?`,
        options: [
          opt("Uso de conectivos e recursos linguísticos que ligam as partes do texto"),
          opt("Apenas a pontuação correta", "lp-so-gramatica"),
          opt("O tamanho do parágrafo", "conteudo-errado"),
          opt("A caligrafia do autor", "lp-so-gramatica"),
        ],
        correctIndex: 0,
        explanation: "Coesão é criada por conectivos, pronomes e outros recursos que articulam o texto.",
        variants: [
          {
            question: "O que é coerência textual?",
            options: [
              opt("Sentido lógico e consistente entre as ideias do texto"),
              opt("Ausência de erros ortográficos", "lp-so-gramatica"),
              opt("Número de palavras no texto", "conteudo-errado"),
              opt("Uso correto de vírgulas", "lp-so-gramatica"),
            ],
            correctIndex: 0,
          },
          {
            question: "Qual palavra conecta uma causa a um efeito?",
            options: [
              opt("'Porque' — indica a causa de algo"),
              opt("'Embora' — indica contraste", "conector-adversativo"),
              opt("'Mas' — indica oposição", "conector-adversativo"),
              opt("'Assim' — indica conclusão", "conector-conclusivo"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: "O que distingue texto informativo de texto argumentativo?",
        options: [
          opt("Informativo apresenta fatos; argumentativo defende um ponto de vista com razões"),
          opt("São exatamente iguais", "lp-so-gramatica"),
          opt("O argumentativo não usa fatos", "conteudo-errado"),
          opt("O informativo é sempre mais longo", "lp-so-gramatica"),
        ],
        correctIndex: 0,
        explanation: "Texto informativo descreve/explica; argumentativo persuade com tese e argumentos.",
        variants: [
          {
            question: "O que é a tese em um texto argumentativo?",
            options: [
              opt("A ideia principal que o autor defende no texto"),
              opt("O título do texto", "lp-so-gramatica"),
              opt("A conclusão do último parágrafo", "conteudo-errado"),
              opt("Uma lista de fatos", "lp-so-gramatica"),
            ],
            correctIndex: 0,
          },
          {
            question: "O que é um argumento em um texto?",
            options: [
              opt("Uma razão ou evidência que sustenta a tese do autor"),
              opt("Qualquer frase longa", "lp-so-gramatica"),
              opt("Uma opinião sem fundamento", "conteudo-errado"),
              opt("O parágrafo de abertura", "lp-so-gramatica"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    LI: [
      {
        question: `No tema "${titulo}", como se apresentar em inglês?`,
        options: [
          opt("'My name is [nome]. I am [idade] years old. I am from [cidade].'"),
          opt("'I is [nome]. Me old [idade].'", "li-erro-verbo"),
          opt("'Name my is [nome].'", "li-ordem-errada"),
          opt("'[nome] am I. Years [idade].'", "li-ordem-errada"),
        ],
        correctIndex: 0,
        explanation: "'My name is' + 'I am' são as estruturas corretas para apresentação em inglês.",
        variants: [
          {
            question: "Como perguntar o nome de alguém em inglês?",
            options: [
              opt("'What is your name?'"),
              opt("'What your name is?'", "li-ordem-errada"),
              opt("'Your name what?'", "li-ordem-errada"),
              opt("'Is what name you?'", "li-erro-verbo"),
            ],
            correctIndex: 0,
          },
          {
            question: "Como dizer sua idade em inglês? (10 anos)",
            options: [
              opt("'I am ten years old.'"),
              opt("'I have ten years.'", "li-erro-verbo"),
              opt("'Me ten years.'", "li-erro-verbo"),
              opt("'Ten years I am.'", "li-ordem-errada"),
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        question: "Como cumprimentar formalmente em inglês?",
        options: [
          opt("'Good morning / Good afternoon / Good evening'"),
          opt("'Hey! / Yo!'", "li-informal"),
          opt("'Morning good / Afternoon good'", "li-ordem-errada"),
          opt("'Bom dia' (em português)", "li-uso-pt"),
        ],
        correctIndex: 0,
        explanation: "'Good morning/afternoon/evening' são cumprimentos formais em inglês.",
        variants: [
          {
            question: "O que significa 'How are you?' em inglês?",
            options: [
              opt("Como você está?"),
              opt("Qual é o seu nome?", "li-confunde-saudacao"),
              opt("De onde você vem?", "li-confunde-saudacao"),
              opt("Quanto anos você tem?", "li-confunde-saudacao"),
            ],
            correctIndex: 0,
          },
          {
            question: "Como se diz 'obrigado' em inglês?",
            options: [
              opt("Thank you"),
              opt("Please", "li-confunde-educacao"),
              opt("Sorry", "li-confunde-educacao"),
              opt("Excuse me", "li-confunde-educacao"),
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
  };

  return mapas[comp] ?? mapas["CI"];
}

// ── Geração de trilha ──────────────────────────────────────────────────────
const STEPS = ["relembrar", "exemplo_guiado", "praticar", "aplicar", "explicar"];
const STEP_TYPES = ["QUIZ", "QUIZ", "QUIZ", "QUIZ", "SPOKEN"];
const STEP_DESCS = [
  "Relembrar conceitos básicos",
  "Ver um exemplo explicado passo a passo",
  "Praticar com exercícios",
  "Aplicar em situações reais",
  "Explicar com suas palavras",
];

function geraAtividade(habilidade, stepIndex, pkPrefix) {
  const step  = STEPS[stepIndex];
  const type  = STEP_TYPES[stepIndex];
  const id    = `${pkPrefix}-A${stepIndex + 1}`;
  const title = `${STEP_DESCS[stepIndex]}: ${habilidade.titulo}`;
  const prompt = stepIndex < 4
    ? `Questão sobre ${habilidade.titulo}.`
    : `Explique com suas próprias palavras o que aprendeu sobre ${habilidade.titulo}.`;
  const audio  = prompt;
  const est    = [4, 6, 8, 8, 10][stepIndex];

  if (type === "SPOKEN") {
    return {
      id, step: stepIndex === 1 ? "exemplo_guiado" : step,
      type: "SPOKEN", title, prompt, estMinutes: est, audioScript: audio,
      rubric: {
        criteria: [`Menciona ao menos dois aspectos de ${habilidade.titulo}`, "Usa vocabulário adequado ao ano escolar"],
        minScore: 60,
      },
      skillId: habilidade.code,
    };
  }

  const questao = geraQuestao(habilidade, stepIndex, 2);
  return {
    id, step: stepIndex === 1 ? "exemplo_guiado" : step,
    type, title, prompt, estMinutes: est, audioScript: audio,
    skillId: habilidade.code,
    questions: [
      { ...questao, skillId: habilidade.code },
      { ...geraQuestao(habilidade, stepIndex + 10, 2), skillId: habilidade.code },
    ],
  };
}

function geraTrilha(habilidade, comp, ano) {
  const pkPrefix = `PK-${habilidade.code}`;
  return {
    skillCode: habilidade.code,
    title: `Trilha: ${habilidade.titulo} (${habilidade.code})`,
    source: "SPEAKFLOW",
    status: "APPROVED",
    reviewNote: "pacote de demonstração, revisão pedagógica pendente",
    gradeYear: ano,
    subjectCode: comp,
    activities: STEPS.map((_, i) => geraAtividade(habilidade, i, pkPrefix)),
  };
}

// ── Geração de diagnóstico ─────────────────────────────────────────────────
function geraDiagnosticoItem(habilidade, indice) {
  const questao = geraQuestao(habilidade, indice, 2);
  return {
    id: `DI-${habilidade.code}-${String(indice + 1).padStart(2, "0")}`,
    skillCode: habilidade.code,
    skillId: habilidade.code,
    ...questao,
    audioScript: questao.question,
  };
}

function geraDegrauItem(habilidade, indice) {
  const questao = geraQuestao(habilidade.pre, indice + 20, 2);
  return {
    id: `DG-${habilidade.code}-${String(indice + 1).padStart(2, "0")}`,
    skillCode: habilidade.pre.code,
    skillId: habilidade.pre.code,
    role: "DEGRAU_BANK",
    ...questao,
    audioScript: questao.question,
  };
}

function geraDiagnostico(pacote) {
  const { comp, ano, gradeYear, nomeComp, habilidades } = pacote;
  const anoLabel = ano === 5 ? "5º ano" : "6º ano";
  const id = `DIAG-${comp}-${ano}A`;

  const items = habilidades.flatMap((h, hi) => [
    geraDiagnosticoItem(h, hi * 2),
    geraDiagnosticoItem(h, hi * 2 + 1),
  ]);

  const degrauBank = habilidades.flatMap((h, hi) => [
    geraDegrauItem(h, hi * 2),
    geraDegrauItem(h, hi * 2 + 1),
  ]);

  return {
    id,
    titulo: `Diagnóstico de ${nomeComp} — ${anoLabel}`,
    descricao: `Avaliação diagnóstica de ${nomeComp} para o ${anoLabel}.`,
    status: "APPROVED",
    source: "SPEAKFLOW",
    subjectCode: comp,
    gradeYear,
    reviewNote: "pacote de demonstração, revisão pedagógica pendente",
    items: [...items, ...degrauBank],
  };
}

// ── Execução ───────────────────────────────────────────────────────────────
let gerados = 0;
let pulados  = 0;

for (const pacote of PACOTES) {
  const { comp, ano, habilidades } = pacote;
  const trilhasFile = join(TRILHAS_DIR, `${comp}-${String(ano).padStart(2, "0")}.json`);
  const diagFile    = join(DIAG_DIR,    `DIAG-${comp}-${ano}A.json`);

  // Arquivos deste gerador são sempre regravados (fonte única)
  if (true) {
    const trilhas = habilidades.map((h) => geraTrilha(h, comp, ano));
    writeFileSync(trilhasFile, JSON.stringify(trilhas, null, 2), "utf8");
    console.log(`  [GERADO] trilhas/${comp}-${ano}.json (${trilhas.length} trilhas)`);
    gerados++;
  } else {
    console.log(`  [EXISTE] trilhas/${comp}-${ano}.json`);
    pulados++;
  }

  if (true) {
    const diag = geraDiagnostico(pacote);
    writeFileSync(diagFile, JSON.stringify(diag, null, 2), "utf8");
    console.log(`  [GERADO] diagnosticos/DIAG-${comp}-${ano}A.json (${diag.items.length} itens)`);
    gerados++;
  } else {
    console.log(`  [EXISTE] diagnosticos/DIAG-${comp}-${ano}A.json`);
    pulados++;
  }
}

console.log(`\nConcluido: ${gerados} arquivos gerados, ${pulados} ja existiam.`);
