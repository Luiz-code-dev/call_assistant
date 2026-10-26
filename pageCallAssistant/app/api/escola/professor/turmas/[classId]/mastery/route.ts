import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(_: Request, { params }: { params: { classId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const enrollments = await (prismaEdu as any).eduEnrollment.findMany({
    where: { classId: params.classId, status: "ACTIVE" },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e: any) => e.studentId);

  const masteries = await (prismaEdu as any).eduSkillMastery.findMany({
    where: { studentId: { in: studentIds }, networkId: ctx.networkId },
    select: { studentId: true, skillId: true, level: true },
  });

  const skillIds = [...new Set(masteries.map((m: any) => m.skillId))];
  const skills = skillIds.length > 0 ? await (prismaEdu as any).eduSkill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true, code: true, shortLabel: true, subjectCode: true },
    orderBy: { code: "asc" },
  }) : [];

  return NextResponse.json({ masteries, skills });
}
