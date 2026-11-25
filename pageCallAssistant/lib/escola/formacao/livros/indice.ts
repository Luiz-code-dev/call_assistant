/**
 * Livros de formação da equipe, lidos na tela "Formação".
 *
 * Cada livro tem cerca de trinta páginas quando impresso. O texto dos
 * capítulos fica em um arquivo por livro e só é carregado quando o livro é
 * aberto. A capa usa a identidade da rede, e o texto não cita o nome do
 * produto, para que o mesmo material sirva a qualquer município.
 */
import type { EduRole } from "@/lib/escola/types";
import type { CapituloDoLivro } from "./tipos";

export type GrupoDoLivro = "plataforma" | "pratica";

export interface Livro {
  slug: string;
  titulo: string;
  subtitulo: string;
  publico: string;
  /** Carga horária sugerida de estudo. */
  horas: number;
  capitulos: number;
  grupo: GrupoDoLivro;
  /** Perfis que enxergam este livro. */
  perfis: EduRole[];
}

export const NOME_DO_GRUPO: Record<GrupoDoLivro, string> = {
  plataforma: "Uso da plataforma",
  pratica: "Prática profissional",
};

export const LIVROS: Livro[] = [
  {
    slug: "guia-do-professor",
    titulo: "Guia do professor",
    subtitulo: "Como acompanhar o reforço das suas turmas e usar as informações no planejamento das aulas",
    publico: "Professores da rede municipal",
    horas: 12,
    capitulos: 32,
    grupo: "plataforma",
    perfis: ["TEACHER", "SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "guia-da-coordenacao-e-da-direcao",
    titulo: "Guia da coordenação pedagógica e da direção",
    subtitulo: "Como acompanhar a aprendizagem, organizar a escola e trazer os responsáveis",
    publico: "Coordenação pedagógica e direção escolar",
    horas: 14,
    capitulos: 33,
    grupo: "plataforma",
    perfis: ["SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "guia-da-secretaria",
    titulo: "Guia da Secretaria de Educação",
    subtitulo: "Como implantar, administrar e acompanhar o reforço em toda a rede",
    publico: "Equipe técnica e pedagógica da Secretaria Municipal de Educação",
    horas: 16,
    capitulos: 30,
    grupo: "plataforma",
    perfis: ["NETWORK_ADMIN"],
  },
  {
    slug: "etica-e-uso-responsavel",
    titulo: "Guia de ética e uso responsável",
    subtitulo: "Princípios e condutas para quem usa a plataforma de reforço escolar da rede municipal",
    publico: "Todos os servidores com acesso à plataforma",
    horas: 10,
    capitulos: 32,
    grupo: "plataforma",
    perfis: ["TEACHER", "SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "reunioes-pedagogicas",
    titulo: "Reuniões pedagógicas com professores",
    subtitulo: "Como planejar, conduzir e dar seguimento a reuniões que mudam a prática em sala",
    publico: "Coordenação pedagógica e direção escolar",
    horas: 16,
    capitulos: 33,
    grupo: "pratica",
    perfis: ["COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"],
  },
  {
    slug: "escola-familia-e-territorio",
    titulo: "Escola, família e território",
    subtitulo: "Como a gestão lida com conflitos com famílias, com a comunidade e com a violência no entorno da escola",
    publico: "Coordenação pedagógica e direção escolar",
    horas: 16,
    capitulos: 31,
    grupo: "pratica",
    perfis: ["SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "sala-de-aula-familia-e-territorio",
    titulo: "Sala de aula, família e território",
    subtitulo: "Como o professor lida com conflitos, com a violência no entorno e com o aluno afetado por fatores externos",
    publico: "Professores da rede municipal",
    horas: 16,
    capitulos: 32,
    grupo: "pratica",
    perfis: ["TEACHER", "SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "protecao-do-aluno",
    titulo: "Proteção do aluno",
    subtitulo: "Como perceber sinais de violência, abuso e bullying e o que fazer em cada caso",
    publico: "Professores, coordenação pedagógica e direção escolar",
    horas: 16,
    capitulos: 32,
    grupo: "pratica",
    perfis: ["TEACHER", "SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "cada-aluno-aprende-de-um-jeito",
    titulo: "Cada aluno aprende de um jeito",
    subtitulo: "Como perceber sinais de TDAH, de outras neurodivergências e de altas habilidades e o que fazer em sala",
    publico: "Professores, coordenação pedagógica e direção escolar",
    horas: 16,
    capitulos: 31,
    grupo: "pratica",
    perfis: ["TEACHER", "SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "turmas-desafiadoras",
    titulo: "Turmas desafiadoras",
    subtitulo: "Como se reinventar quando o que sempre funcionou deixa de funcionar",
    publico: "Professores da rede municipal",
    horas: 16,
    capitulos: 33,
    grupo: "pratica",
    perfis: ["TEACHER", "SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
  {
    slug: "gestao-e-organizacao-das-escolas",
    titulo: "Gestão e organização das escolas",
    subtitulo: "Como a Secretaria apoia as escolas no planejamento, na rotina, nas pessoas e nos resultados",
    publico: "Equipe da Secretaria Municipal de Educação e gestores escolares",
    horas: 20,
    capitulos: 30,
    grupo: "pratica",
    perfis: ["NETWORK_ADMIN", "SCHOOL_ADMIN", "COORDINATOR"],
  },
  {
    slug: "etica-profissional-na-escola",
    titulo: "Ética profissional na escola",
    subtitulo: "Princípios e condutas de cada colaborador da rede municipal de ensino",
    publico: "Todos os servidores e colaboradores das escolas e da Secretaria",
    horas: 16,
    capitulos: 32,
    grupo: "pratica",
    perfis: ["TEACHER", "SCHOOL_ADMIN", "COORDINATOR", "NETWORK_ADMIN"],
  },
];

export function livrosDoPerfil(perfil: EduRole): Livro[] {
  return LIVROS.filter((livro) => livro.perfis.includes(perfil));
}

export function livroDoPerfil(slug: string, perfil: EduRole): Livro | null {
  return livrosDoPerfil(perfil).find((livro) => livro.slug === slug) ?? null;
}

/** Carrega os capítulos de um livro. Devolve null quando o livro não existe. */
export async function capitulosDoLivro(slug: string): Promise<CapituloDoLivro[] | null> {
  switch (slug) {
    case "guia-do-professor":
      return (await import("./guia-do-professor")).capitulos;
    case "guia-da-coordenacao-e-da-direcao":
      return (await import("./guia-da-coordenacao-e-da-direcao")).capitulos;
    case "guia-da-secretaria":
      return (await import("./guia-da-secretaria")).capitulos;
    case "etica-e-uso-responsavel":
      return (await import("./etica-e-uso-responsavel")).capitulos;
    case "reunioes-pedagogicas":
      return (await import("./reunioes-pedagogicas")).capitulos;
    case "escola-familia-e-territorio":
      return (await import("./escola-familia-e-territorio")).capitulos;
    case "sala-de-aula-familia-e-territorio":
      return (await import("./sala-de-aula-familia-e-territorio")).capitulos;
    case "protecao-do-aluno":
      return (await import("./protecao-do-aluno")).capitulos;
    case "cada-aluno-aprende-de-um-jeito":
      return (await import("./cada-aluno-aprende-de-um-jeito")).capitulos;
    case "turmas-desafiadoras":
      return (await import("./turmas-desafiadoras")).capitulos;
    case "gestao-e-organizacao-das-escolas":
      return (await import("./gestao-e-organizacao-das-escolas")).capitulos;
    case "etica-profissional-na-escola":
      return (await import("./etica-profissional-na-escola")).capitulos;
    default:
      return null;
  }
}

/** Marcador que os capítulos usam no lugar do nome da rede. */
const MARCADOR_DA_REDE = "{{REDE}}";

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Troca o marcador pelo nome da rede, já protegido para uso em HTML. */
export function comNomeDaRede(html: string, nomeDaRede: string): string {
  return html.split(MARCADOR_DA_REDE).join(escaparHtml(nomeDaRede));
}
