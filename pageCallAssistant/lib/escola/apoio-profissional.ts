/**
 * Cadastro do assistente social e do psicólogo da rede de proteção.
 *
 * A secretaria cadastra o profissional com o número do registro no conselho e declara que os dados
 * são verdadeiros. O profissional recebe um e-mail explicando onde foi cadastrado e por quê, e pode
 * aceitar o termo de sigilo e proteção de dados ou recusar e pedir a exclusão do cadastro.
 */
import type { FuncaoApoio } from "./apoio-aluno";

export type FuncaoRegistrada = Extract<FuncaoApoio, "ASSISTENTE_SOCIAL" | "PSICOLOGO">;
export const FUNCOES_REGISTRADAS: FuncaoRegistrada[] = ["ASSISTENTE_SOCIAL", "PSICOLOGO"];

/** Conselho que registra cada profissão. */
export const CONSELHO: Record<FuncaoRegistrada, { sigla: string; nome: string }> = {
  ASSISTENTE_SOCIAL: { sigla: "CRESS", nome: "Conselho Regional de Serviço Social" },
  PSICOLOGO: { sigla: "CRP", nome: "Conselho Regional de Psicologia" },
};

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

export function funcaoRegistrada(v: unknown): v is FuncaoRegistrada {
  return v === "ASSISTENTE_SOCIAL" || v === "PSICOLOGO";
}

/** Número do registro como o conselho escreve: dígitos, com barra, ponto ou hífen. */
export function registroLimpo(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, "").toUpperCase() : "";
}
export function registroValido(registro: string): boolean {
  if (!/^[0-9][0-9./-]{2,14}$/.test(registro)) return false;
  const digitos = registro.replace(/\D/g, "");
  return digitos.length >= 3 && digitos.length <= 10;
}

export interface CadastroNovo { nome: string; email: string; funcao: FuncaoRegistrada; registro: string; uf: string; schoolIds: string[] }

export function validarCadastro(b: Record<string, unknown>): CadastroNovo | { erro: string } {
  const nome = typeof b.nome === "string" ? b.nome.trim().replace(/\s+/g, " ") : "";
  if (nome.length < 5 || !nome.includes(" ")) return { erro: "Informe o nome completo do profissional." };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: "Informe um e-mail válido." };
  const funcao = b.funcao;
  if (!funcaoRegistrada(funcao)) return { erro: "Escolha assistente social ou psicólogo." };
  const registro = registroLimpo(b.registro);
  if (!registroValido(registro)) return { erro: `Informe o número do registro no ${CONSELHO[funcao].sigla}, só com números, barra, ponto ou hífen.` };
  const uf = typeof b.uf === "string" ? b.uf.trim().toUpperCase() : "";
  if (!(UFS as readonly string[]).includes(uf)) return { erro: "Escolha a UF do registro." };
  // A declaração de veracidade é obrigatória: sem ela o cadastro não é feito
  if (b.declaro !== true) return { erro: "Marque a declaração de que as informações são verdadeiras." };
  const schoolIds = Array.isArray(b.schoolIds) ? Array.from(new Set(b.schoolIds.filter((x): x is string => typeof x === "string" && !!x))) : [];
  return { nome, email, funcao, registro, uf, schoolIds };
}

/** Como o registro aparece em telas e documentos. */
export function registroFormatado(conselho: string, registro: string, uf: string): string {
  return `${conselho} ${registro}${uf ? `/${uf}` : ""}`;
}

// ── Consulta ao conselho ────────────────────────────────────────────────────

export type ResultadoDaConsulta = "ATIVO" | "INATIVO" | "NAO_ENCONTRADO" | "FALHA";

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();

/** Primeiro e último nome iguais já contam: os conselhos abreviam nomes do meio. */
export function nomesBatem(a: string, b: string): boolean {
  const x = semAcento(a).split(" "), y = semAcento(b).split(" ");
  if (x.length < 2 || y.length < 2) return false;
  return x[0] === y[0] && x[x.length - 1] === y[y.length - 1];
}

/**
 * Lê a resposta da consulta ao cadastro do conselho (lista de resultados com nome, registro e situação).
 * Qualquer formato inesperado vira FALHA, e FALHA nunca bloqueia nem confirma nada.
 */
export function interpretarConsulta(resposta: unknown, nomeInformado: string): { resultado: ResultadoDaConsulta; situacao: string | null } {
  const r = resposta as { code?: unknown; data?: unknown } | null;
  if (!r || typeof r !== "object" || typeof r.code !== "number") return { resultado: "FALHA", situacao: null };
  if (r.code === 612) return { resultado: "NAO_ENCONTRADO", situacao: null };
  if (r.code !== 200) return { resultado: "FALHA", situacao: null };
  const blocos = Array.isArray(r.data) ? r.data : [r.data];
  const lista: { nome?: unknown; situacao?: unknown }[] = [];
  for (const bloco of blocos) {
    const itens = (bloco as { resultados?: unknown } | null)?.resultados;
    if (Array.isArray(itens)) lista.push(...itens);
  }
  if (!lista.length) return { resultado: "NAO_ENCONTRADO", situacao: null };
  const daPessoa = lista.filter((i) => typeof i.nome === "string" && nomesBatem(i.nome, nomeInformado));
  if (!daPessoa.length) return { resultado: "NAO_ENCONTRADO", situacao: null };
  const situacoes = daPessoa.map((i) => (typeof i.situacao === "string" ? i.situacao.trim() : ""));
  const ativa = situacoes.find((s) => /^ativ/i.test(semAcento(s)));
  return ativa ? { resultado: "ATIVO", situacao: ativa } : { resultado: "INATIVO", situacao: situacoes[0] || null };
}

// ── Termo de sigilo e proteção de dados ─────────────────────────────────────

export const TERMO_VERSAO = "2026-11-25";

export const TERMO_ITENS: { titulo: string; texto: string }[] = [
  { titulo: "O que você vai acessar", texto: "Pedidos de apoio feitos por alunos da rede: relatos escritos ou gravados, com nome, turma e escola. São dados pessoais de crianças e adolescentes e podem incluir dados sensíveis." },
  { titulo: "Para que serve o acesso", texto: "Só para acolher o aluno e encaminhar o caso dentro da sua função. Não use essas informações para nenhuma outra finalidade." },
  { titulo: "Sigilo", texto: "Não copie, fotografe, imprima sem necessidade nem compartilhe o que ler fora dos canais oficiais da rede de proteção. O sigilo continua valendo depois que o seu vínculo terminar e se soma ao sigilo do código de ética da sua profissão." },
  { titulo: "Registro das suas ações", texto: "Cada pedido que você abrir, cada mudança de situação, cada caso passado a um colega e cada documento gerado ficam registrados com o seu nome, a data e a hora." },
  { titulo: "Quem responde pelos dados", texto: "A Secretaria de Educação é a controladora dos dados e decide quem tem acesso. A Codevelop Solutions opera a plataforma em nome dela, conforme a Lei 13.709/2018 (LGPD). A plataforma é só o canal: o atendimento é da rede do município." },
  { titulo: "Os seus dados", texto: "A Secretaria informou o seu nome, e-mail, função, número de registro no conselho, UF e as escolas que você atende. Eles servem para identificar você, conferir a sua habilitação profissional e assinar os encaminhamentos. Também ficam guardados os seus registros de acesso." },
  { titulo: "Os seus direitos", texto: "Você pode pedir à Secretaria a confirmação, o acesso, a correção e a exclusão dos seus dados, como prevê a LGPD. Se não reconhece este cadastro ou não quer participar, recuse nesta mesma tela: o número do seu registro é apagado na hora e a Secretaria é avisada para excluir o restante." },
  { titulo: "Dever de comunicar", texto: "Suspeita ou confirmação de maus-tratos contra criança ou adolescente deve ser comunicada ao Conselho Tutelar, como determina o art. 13 do Estatuto da Criança e do Adolescente." },
];

// ── E-mails ─────────────────────────────────────────────────────────────────

export interface DadosDoConvite { nome: string; rede: string; funcao: FuncaoRegistrada; registro: string; uf: string; atende: string; cadastradoPor: string; link: string }

const NOME_FUNCAO: Record<FuncaoRegistrada, string> = { ASSISTENTE_SOCIAL: "assistente social", PSICOLOGO: "psicólogo(a)" };

/** Explica onde a pessoa foi cadastrada, por quê, com quais dados e o que ela pode fazer. */
export function emailConviteProfissional(d: DadosDoConvite): { subject: string; text: string } {
  const c = CONSELHO[d.funcao];
  return {
    subject: `${d.rede}: você foi cadastrado(a) na equipe de apoio ao aluno`,
    text: [
      `Olá, ${d.nome.split(" ")[0]}.`,
      "",
      `A Secretaria de Educação de ${d.rede} cadastrou você como ${NOME_FUNCAO[d.funcao]} na equipe de apoio ao aluno.`,
      "",
      "O QUE É",
      "Os alunos da rede têm, na plataforma de reforço escolar, um espaço reservado para pedir ajuda ou contar algo que os preocupa. Só a equipe indicada pela Secretaria lê esses pedidos. Você foi indicado(a) para acolher o aluno e encaminhar o caso à rede de proteção do município.",
      "",
      "OS DADOS QUE FORAM CADASTRADOS SOBRE VOCÊ",
      `Nome: ${d.nome}`,
      `Função: ${NOME_FUNCAO[d.funcao]}`,
      `Registro: ${registroFormatado(c.sigla, d.registro, d.uf)}`,
      `Atende: ${d.atende}`,
      `Cadastrado(a) por: ${d.cadastradoPor}`,
      "",
      "O QUE FAZER",
      "1. Abra o link abaixo. Ele é pessoal: não encaminhe este e-mail.",
      "2. Confira os seus dados e leia o termo de sigilo e proteção de dados.",
      "3. Se concordar, aceite o termo e crie a sua senha.",
      "",
      d.link,
      "",
      "SE NÃO RECONHECE ESTE CADASTRO OU NÃO QUER PARTICIPAR",
      "Abra o mesmo link e escolha \"Recusar e pedir a exclusão do meu cadastro\". O número do seu registro é apagado na hora e a Secretaria é avisada para excluir o restante.",
      "",
      "O link vale por 7 dias.",
    ].join("\n"),
  };
}

/** Aviso ao gestor que fez o cadastro: a pessoa recusou e pediu a exclusão. */
export function emailRecusaAoGestor(nomeDoProfissional: string, siteBase: string): { subject: string; text: string } {
  return {
    subject: "Um profissional recusou o cadastro na equipe de apoio",
    text: `${nomeDoProfissional} recusou o cadastro na equipe de apoio ao aluno e pediu a exclusão dos dados.\n\nO número do registro profissional já foi apagado e o convite deixou de valer. Para concluir, exclua o cadastro em:\n${siteBase}/escola/rede/apoio`,
  };
}
