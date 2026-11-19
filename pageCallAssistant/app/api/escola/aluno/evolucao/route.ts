/**
 * GET /api/escola/aluno/evolucao
 * Evolução do aluno por matéria e habilidade, a partir do nível consolidado
 * (EduSkillMastery). Inclui o que veio do diagnóstico, e não só das atividades:
 * quem acabou de fazer o primeiro diagnóstico já vê os seus níveis.
 *
 * Antes, a rota lia só EduSubmission e pedia skill.subject, relação que não existe
 * (EduSkill tem subjectCode). A consulta falhava, o erro era engolido e a tela
 * dizia "Nenhuma atividade feita ainda" para todo mundo.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { tituloParaAluno } from "@/lib/escola/texto-aluno";
import { consolidate } from "@/lib/escola/mastery-event";
import { observacoesDoPrimeiroDiagnostico, resumirEvolucao, type ObservacaoDegrau } from "@/lib/escola/evolucao-degraus";

const NOMES: Record<string, string> = {
  LP: "Língua Portuguesa", MA: "Matemática", CI: "Ciências", HI: "História", GE: "Geografia",
  AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso",
};
const CORES: Record<string, string> = {
  LP: "#BE185D", MA: "#1D4ED8", CI: "#0F766E", HI: "#C2410C",
  GE: "#15803D", AR: "#7C3AED", EF: "#0369A1", LI: "#6D28D9", ER: "#92400E",
};

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (student.db) setTenantDb(student.db);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
  const P = prismaEdu as any;

  try {
    const masteries: Array<{ level: string; skill: { id: string; code: string; subjectCode: string; shortLabel: string | null; description: string } }> =
      await P.eduSkillMastery.findMany({
        where: { studentId: student.studentId, networkId: student.networkId },
        select: { level: true, skill: { select: { id: true, code: true, subjectCode: true, shortLabel: true, description: true } } },
      });

    // Nome da habilidade em linguagem de aluno: o título da trilha SpeakFlow, se houver
    const skillIds = masteries.map((m) => m.skill.id);
    const tracks: Array<{ title: string; skillIds: string[] }> = skillIds.length
      ? await P.eduTrack.findMany({
          where: { status: "APPROVED", networkId: null, skillIds: { hasSome: skillIds } },
          select: { title: true, skillIds: true },
        })
      : [];
    const titulo = (s: { id: string; shortLabel: string | null; description: string }) => {
      const t = tracks.find((tr) => tr.skillIds.includes(s.id));
      return t ? tituloParaAluno(t.title) : (s.shortLabel ?? s.description);
    };

    // De onde o aluno partiu em cada conteúdo: as questões do primeiro diagnóstico, consolidadas
    // pela mesma regra do nível atual. Sem diagnóstico, o ponto de partida fica nulo.
    const eventos: Array<{ skillId: string; level: string; source: string; createdAt: Date }> = skillIds.length
      ? await P.eduSkillMasteryEvent.findMany({
          where: { studentId: student.studentId, networkId: student.networkId },
          orderBy: { createdAt: "asc" },
          select: { skillId: true, level: true, source: true, createdAt: true },
        })
      : [];
    const porConteudo = new Map<string, ObservacaoDegrau[]>();
    for (const e of eventos) {
      if (!porConteudo.has(e.skillId)) porConteudo.set(e.skillId, []);
      porConteudo.get(e.skillId)!.push(e);
    }
    const partida = (skillId: string): string | null => {
      const iniciais = observacoesDoPrimeiroDiagnostico(porConteudo.get(skillId) ?? []);
      return iniciais.length ? consolidate(iniciais) : null;
    };

    const ordemNivel: Record<string, number> = { NOT_YET: 0, ALMOST: 1, MASTERED: 2 };
    const porMateria = new Map<string, { subjectName: string; subjectColor: string; skills: { code: string; description: string; level: string; levelInicial: string | null }[] }>();
    for (const m of masteries) {
      const cod = m.skill.subjectCode;
      const grupo = porMateria.get(cod) ?? { subjectName: NOMES[cod] ?? cod, subjectColor: CORES[cod] ?? "#6D28D9", skills: [] };
      grupo.skills.push({ code: m.skill.code, description: titulo(m.skill), level: m.level, levelInicial: partida(m.skill.id) });
      porMateria.set(cod, grupo);
    }
    // Dentro da matéria: primeiro o que ainda falta, depois o que já domina
    const subjects = Array.from(porMateria.values()).map((g) => ({
      ...g,
      skills: g.skills.sort((a, b) => (ordemNivel[a.level] ?? 0) - (ordemNivel[b.level] ?? 0)),
    }));
    const evolucao = resumirEvolucao(subjects.flatMap((g) => g.skills));
    return NextResponse.json({ subjects, evolucao });
  } catch (err) {
    console.error(`[aluno/evolucao] aluno=${student.studentId}:`, (err as Error).message);
    return NextResponse.json({ error: "Não foi possível carregar a evolução agora." }, { status: 500 });
  }
}
