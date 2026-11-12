/**
 * Implantação rápida: a rede não precisa montar a matriz curricular à mão.
 * Usa as mesmas matérias da BNCC que o reforço já usa, cria as aulas (turma + matéria)
 * de cada turma do ano letivo e, se pedido, atribui um professor às aulas sem professor.
 */
import { codigoAgendaDaMateria } from "@/lib/escola/professor-familia";

export interface MateriaBncc { codigo: string; nome: string; area: string; cor: string; desdeAno: number }

/** Componentes curriculares do ensino fundamental (BNCC). Inglês a partir do 6º ano. */
export const MATERIAS_BNCC: MateriaBncc[] = [
  { codigo: "LP", nome: "Língua Portuguesa", area: "Linguagens", cor: "#BE185D", desdeAno: 1 },
  { codigo: "MA", nome: "Matemática", area: "Matemática", cor: "#1D4ED8", desdeAno: 1 },
  { codigo: "CI", nome: "Ciências", area: "Ciências da Natureza", cor: "#0F766E", desdeAno: 1 },
  { codigo: "HI", nome: "História", area: "Ciências Humanas", cor: "#C2410C", desdeAno: 1 },
  { codigo: "GE", nome: "Geografia", area: "Ciências Humanas", cor: "#15803D", desdeAno: 1 },
  { codigo: "AR", nome: "Arte", area: "Linguagens", cor: "#9333EA", desdeAno: 1 },
  { codigo: "EF", nome: "Educação Física", area: "Linguagens", cor: "#0369A1", desdeAno: 1 },
  { codigo: "LI", nome: "Língua Inglesa", area: "Linguagens", cor: "#6D28D9", desdeAno: 6 },
  { codigo: "ER", nome: "Ensino Religioso", area: "Ensino Religioso", cor: "#64748B", desdeAno: 1 },
];

/** Matérias que uma turma do ano informado tem */
export function materiasDoAno(ano: number): MateriaBncc[] {
  return MATERIAS_BNCC.filter((m) => ano >= m.desdeAno);
}

/** Código BNCC de um componente já cadastrado (pelo nome), para não duplicar */
export function codigoDoComponente(nome: string): string | null {
  return codigoAgendaDaMateria(nome);
}

/** Ano letivo padrão: de fevereiro a dezembro, em 4 bimestres */
export function anoLetivoPadrao(ano: number) {
  const d = (m: number, dia: number) => new Date(Date.UTC(ano, m - 1, dia, 12));
  return {
    year: ano,
    startsAt: d(2, 1),
    endsAt: d(12, 20),
    terms: [
      { name: "1º bimestre", order: 1, startsAt: d(2, 1), endsAt: d(4, 30) },
      { name: "2º bimestre", order: 2, startsAt: d(5, 1), endsAt: d(7, 15) },
      { name: "3º bimestre", order: 3, startsAt: d(8, 1), endsAt: d(9, 30) },
      { name: "4º bimestre", order: 4, startsAt: d(10, 1), endsAt: d(12, 20) },
    ],
  };
}
