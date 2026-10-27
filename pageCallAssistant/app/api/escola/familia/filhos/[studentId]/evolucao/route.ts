import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent } from "@/lib/escola/family-guard";

/* eslint-disable @typescript-eslint/no-explicit-any */

// BNCC: codigo do componente -> nome em portugues + cor (tokens do site).
const SUBJECT_BY_CODE: Record<string, { name: string; color: string }> = {
  LP: { name: "Língua Portuguesa", color: "#BE185D" },
  PT: { name: "Língua Portuguesa", color: "#BE185D" },
  MA: { name: "Matemática", color: "#1D4ED8" },
  CI: { name: "Ciências", color: "#0F766E" },
  HI: { name: "História", color: "#C2410C" },
  GE: { name: "Geografia", color: "#15803D" },
  EN: { name: "Inglês", color: "#6D28D9" },
  LI: { name: "Inglês", color: "#6D28D9" },
  ES: { name: "Espanhol", color: "#A16207" },
  AR: { name: "Arte", color: "#6D28D9" },
  EF: { name: "Educação Física", color: "#0F766E" },
};
function subjInfo(code: string) {
  return SUBJECT_BY_CODE[code?.slice(0, 2)?.toUpperCase()] ?? { name: code || "Componente", color: "#6D28D9" };
}

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await guardianOwnsStudent(ctx.guardianId, params.studentId))) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  try {
    const studentId = params.studentId;
    const student = await (prismaEdu as any).eduStudent.findUnique({
      where: { id: studentId },
      select: { fullName: true, enrollments: { where: { status: "ACTIVE" }, take: 1, orderBy: { startedAt: "desc" }, select: { class: { select: { name: true } } } } },
    });

    const masteries = await (prismaEdu as any).eduSkillMastery.findMany({
      where: { studentId },
      include: { skill: { select: { id: true, code: true, subjectCode: true, shortLabel: true, description: true } } },
    });

    // Nivel do PRIMEIRO diagnostico por habilidade (evento mais antigo).
    const events = await (prismaEdu as any).eduSkillMasteryEvent.findMany({
      where: { studentId }, orderBy: { createdAt: "asc" }, select: { skillId: true, level: true },
    });
    const firstLevel = new Map<string, string>();
    for (const e of events) if (!firstLevel.has(e.skillId)) firstLevel.set(e.skillId, e.level);

    const resumo = { MASTERED: 0, ALMOST: 0, NOT_YET: 0 };
    const grupos = new Map<string, { name: string; color: string; habilidades: any[] }>();
    for (const m of masteries) {
      resumo[m.level as "MASTERED" | "ALMOST" | "NOT_YET"]++;
      const info = subjInfo(m.skill.subjectCode);
      if (!grupos.has(info.name)) grupos.set(info.name, { name: info.name, color: info.color, habilidades: [] });
      grupos.get(info.name)!.habilidades.push({
        skillId: m.skill.id,
        code: m.skill.code,
        label: m.skill.shortLabel || m.skill.description,
        level: m.level,
        levelInicial: firstLevel.get(m.skill.id) ?? null,
      });
    }

    return NextResponse.json({
      aluno: { fullName: student?.fullName ?? null, className: student?.enrollments?.[0]?.class?.name ?? null },
      resumo,
      componentes: Array.from(grupos.values()),
    });
  } catch (err) {
    console.error("[familia/evolucao:GET]", err);
    return NextResponse.json({ error: "Não foi possível carregar." }, { status: 500 });
  }
}
