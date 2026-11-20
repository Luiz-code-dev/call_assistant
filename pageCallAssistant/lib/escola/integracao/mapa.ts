/**
 * lib/escola/integracao/mapa.ts
 *
 * De-para de campos: cada sistema externo chama as coisas de um jeito. Aqui o registro
 * que chega vira uma linha no nosso padrão (o mesmo da importação por planilha).
 * Funções puras (sem banco).
 *
 * Ordem: 1) o de-para configurado na chave; 2) os apelidos comuns abaixo; 3) o próprio nome.
 */
export type TipoCadastro = "SCHOOLS" | "STAFF" | "STUDENTS" | "ASSIGNMENTS";
export type Linha = Record<string, string>;

/** Campos do nosso padrão, por tipo. */
export const CAMPOS: Record<TipoCadastro, string[]> = {
  SCHOOLS: ["nome_escola", "codigo_inep"],
  STAFF: ["nome", "email", "papel", "codigo_inep_escola"],
  STUDENTS: ["nome_aluno", "matricula_aluno", "turma", "codigo_inep", "etapa", "turno", "ano_serie", "data_nascimento"],
  ASSIGNMENTS: ["turma", "componente", "email_professor", "codigo_inep"],
};

/** Apelidos comuns em sistemas de gestão escolar → campo do nosso padrão. */
const APELIDOS: Record<TipoCadastro, Record<string, string>> = {
  SCHOOLS: {
    nome: "nome_escola", escola: "nome_escola", nomeescola: "nome_escola", name: "nome_escola",
    inep: "codigo_inep", codigoinep: "codigo_inep", codinep: "codigo_inep", inepcode: "codigo_inep",
  },
  STAFF: {
    nomeservidor: "nome", nomecompleto: "nome", name: "nome", servidor: "nome", professor: "nome",
    mail: "email", emailinstitucional: "email",
    cargo: "papel", funcao: "papel", perfil: "papel", role: "papel",
    inep: "codigo_inep_escola", codigoinep: "codigo_inep_escola", inepescola: "codigo_inep_escola", codigoinepescola: "codigo_inep_escola",
  },
  STUDENTS: {
    nome: "nome_aluno", aluno: "nome_aluno", nomealuno: "nome_aluno", nomecompleto: "nome_aluno", name: "nome_aluno",
    matricula: "matricula_aluno", matriculaaluno: "matricula_aluno", codigoaluno: "matricula_aluno", ra: "matricula_aluno", idaluno: "matricula_aluno",
    nometurma: "turma", classe: "turma",
    inep: "codigo_inep", codigoinep: "codigo_inep", inepescola: "codigo_inep", codigoinepescola: "codigo_inep",
    segmento: "etapa", turnoturma: "turno",
    ano: "ano_serie", serie: "ano_serie", anoserie: "ano_serie", anoescolar: "ano_serie",
    nascimento: "data_nascimento", datanascimento: "data_nascimento", dtnascimento: "data_nascimento",
  },
  ASSIGNMENTS: {
    nometurma: "turma", classe: "turma",
    disciplina: "componente", materia: "componente", componentecurricular: "componente",
    email: "email_professor", emailprofessor: "email_professor", professor: "email_professor",
    inep: "codigo_inep", codigoinep: "codigo_inep", inepescola: "codigo_inep",
  },
};

/** Tira acento, espaço, traço e sublinhado, para comparar nomes de campo. */
export function chaveDeCampo(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Limpa o de-para vindo do gestor: só pares texto → campo conhecido do tipo. */
export function limparDePara(bruto: unknown): Record<string, string> {
  const todos = new Set(Object.values(CAMPOS).flat());
  const limpo: Record<string, string> = {};
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return limpo;
  for (const [de, para] of Object.entries(bruto as Record<string, unknown>)) {
    if (typeof para !== "string" || !todos.has(para)) continue;
    const k = chaveDeCampo(de);
    if (k && k.length <= 60) limpo[k] = para;
    if (Object.keys(limpo).length >= 60) break;
  }
  return limpo;
}

const ETAPAS: Record<string, string> = {
  infantil: "EARLY_CHILDHOOD", educacaoinfantil: "EARLY_CHILDHOOD",
  anosiniciais: "ELEMENTARY_EARLY", fundamental1: "ELEMENTARY_EARLY", fundamentali: "ELEMENTARY_EARLY", ef1: "ELEMENTARY_EARLY",
  anosfinais: "ELEMENTARY_LATE", fundamental2: "ELEMENTARY_LATE", fundamentalii: "ELEMENTARY_LATE", ef2: "ELEMENTARY_LATE",
  medio: "HIGH_SCHOOL", ensinomedio: "HIGH_SCHOOL",
};
const TURNOS: Record<string, string> = {
  manha: "MORNING", matutino: "MORNING", m: "MORNING",
  tarde: "AFTERNOON", vespertino: "AFTERNOON", t: "AFTERNOON",
  noite: "EVENING", noturno: "EVENING", n: "EVENING",
  integral: "FULL_TIME", i: "FULL_TIME",
};
const PAPEIS: Record<string, string> = {
  professor: "PROFESSOR", professora: "PROFESSOR", docente: "PROFESSOR", teacher: "PROFESSOR",
  coordenador: "COORDENADOR", coordenadora: "COORDENADOR", coordenadorpedagogico: "COORDENADOR", coordinator: "COORDENADOR",
  diretor: "DIRETOR", diretora: "DIRETOR", gestorescolar: "DIRETOR", schooladmin: "DIRETOR",
  gestorrede: "GESTOR_REDE", secretaria: "GESTOR_REDE", gestor: "GESTOR_REDE", networkadmin: "GESTOR_REDE",
};

/** Valor em texto simples (números e booleanos viram texto; objeto e lista são ignorados). */
function texto(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim().slice(0, 300);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/**
 * Converte um registro do sistema externo em uma linha do nosso padrão.
 * Campos desconhecidos são descartados (não guardamos o que não pedimos).
 */
export function paraLinha(tipo: TipoCadastro, registro: unknown, dePara: Record<string, string> = {}): Linha {
  const linha: Linha = {};
  if (!registro || typeof registro !== "object" || Array.isArray(registro)) return linha;
  const conhecidos = new Set(CAMPOS[tipo]);
  const porChave = new Map(CAMPOS[tipo].map((c) => [chaveDeCampo(c), c]));

  for (const [nome, valor] of Object.entries(registro as Record<string, unknown>)) {
    const t = texto(valor);
    if (t === null || t === "") continue;
    const k = chaveDeCampo(nome);
    const destino = dePara[k] ?? APELIDOS[tipo][k] ?? porChave.get(k);
    if (!destino || !conhecidos.has(destino)) continue;
    if (linha[destino] === undefined) linha[destino] = t;
  }

  // Valores que cada sistema escreve de um jeito
  if (linha.etapa) linha.etapa = ETAPAS[chaveDeCampo(linha.etapa)] ?? linha.etapa.toUpperCase();
  if (linha.turno) linha.turno = TURNOS[chaveDeCampo(linha.turno)] ?? linha.turno.toUpperCase();
  if (linha.papel) linha.papel = PAPEIS[chaveDeCampo(linha.papel)] ?? linha.papel.toUpperCase();
  if (linha.ano_serie) {
    const n = /\d{1,2}/.exec(linha.ano_serie);
    if (n) linha.ano_serie = String(Number(n[0]));
  }
  if (linha.email) linha.email = linha.email.toLowerCase();
  if (linha.email_professor) linha.email_professor = linha.email_professor.toLowerCase();
  return linha;
}
