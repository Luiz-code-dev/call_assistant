/**
 * Missões do dia do Flow: até 3 tarefas curtas, montadas a partir do que o aluno precisa.
 * 1) a próxima etapa da matéria que mais precisa de reforço;
 * 2) a revisão de 2 minutos (se houver cartões);
 * 3) o horário de estudo que a família marcou para hoje.
 */
export interface Missao { id: "etapa" | "revisao" | "agenda" | "trilha"; titulo: string; descricao: string; href: string; feita: boolean }

/** Matéria com mais "Praticando"/"Quase lá" recentes (Praticando pesa 2) */
export function materiaQueMaisPrecisa(niveis: Array<{ subjectCode: string | null; masteryLevel: string | null }>): string | null {
  const peso = new Map<string, number>();
  for (const n of niveis) {
    if (!n.subjectCode) continue;
    const p = n.masteryLevel === "NOT_YET" ? 2 : n.masteryLevel === "ALMOST" ? 1 : n.masteryLevel === "MASTERED" ? -1 : 0;
    peso.set(n.subjectCode, (peso.get(n.subjectCode) ?? 0) + p);
  }
  let melhor: [string, number] | null = null;
  for (const [k, v] of Array.from(peso.entries())) if (v > 0 && (!melhor || v > melhor[1])) melhor = [k, v];
  return melhor?.[0] ?? null;
}

export function montarMissoes(p: {
  fraca: { materia: string | null; titulo: string; href: string; subjectCode: string | null };
  estudouHojeEm: Set<string | null>;
  estudouHoje: boolean;
  revisao: { pendentes: number; feitasHoje: number };
  agendaHoje: { materia: string | null; subjectCode: string | null; time: string; minutes: number; href: string } | null;
  minimoRevisao: number;
}): Missao[] {
  const m: Missao[] = [];
  const feitaEtapa = p.fraca.subjectCode ? p.estudouHojeEm.has(p.fraca.subjectCode) : p.estudouHoje;
  m.push({
    id: p.fraca.subjectCode ? "etapa" : "trilha",
    titulo: p.fraca.materia ? `Uma etapa de ${p.fraca.materia}` : "Uma etapa da sua trilha",
    descricao: p.fraca.materia ? `${p.fraca.titulo}: é a matéria que mais precisa de reforço` : p.fraca.titulo,
    href: p.fraca.href, feita: feitaEtapa,
  });
  if (p.revisao.pendentes > 0 || p.revisao.feitasHoje > 0) {
    m.push({
      id: "revisao", titulo: "Revisão de 2 minutos",
      descricao: p.revisao.feitasHoje >= p.minimoRevisao || p.revisao.pendentes === 0 ? "Você revisou hoje. Mandou bem!" : `${Math.min(p.revisao.pendentes, 5)} perguntinhas do que você está praticando`,
      href: "/escola/aluno/revisao", feita: p.revisao.feitasHoje >= p.minimoRevisao || (p.revisao.feitasHoje > 0 && p.revisao.pendentes === 0),
    });
  }
  if (p.agendaHoje && !(p.agendaHoje.subjectCode && p.agendaHoje.subjectCode === p.fraca.subjectCode)) {
    const feita = p.agendaHoje.subjectCode ? p.estudouHojeEm.has(p.agendaHoje.subjectCode) : p.estudouHoje;
    m.push({
      id: "agenda", titulo: `${p.agendaHoje.minutes} minutos de ${p.agendaHoje.materia ?? "estudo"} às ${p.agendaHoje.time}`,
      descricao: "Combinado com a sua família", href: p.agendaHoje.href, feita,
    });
  }
  return m.slice(0, 3);
}
