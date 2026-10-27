import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent } from "@/lib/escola/family-guard";
import { subjectInfo } from "@/lib/escola/subjects";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    // Nivel do PRIMEIRO diagnostico por habilidade (evento DIAGNOSTIC mais antigo).
    const events = await (prismaEdu as any).eduSkillMasteryEvent.findMany({
      where: { studentId, source: "DIAGNOSTIC" }, orderBy: { createdAt: "asc" }, select: { skillId: true, level: true },
    });
    const firstLevel = new Map<string, string>();
    for (const e of events) if (!firstLevel.has(e.skillId)) firstLevel.set(e.skillId, e.level);

    const resumo = { MASTERED: 0, ALMOST: 0, NOT_YET: 0 };
    const grupos = new Map<string, { name: string; color: string; habilidades: any[] }>();
    for (const m of masteries) {
      resumo[m.level as "MASTERED" | "ALMOST" | "NOT_YET"]++;
      const info = subjectInfo(m.skill.subjectCode);
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
