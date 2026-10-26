import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(_: Request, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const link = await (prismaEdu as any).eduGuardianLink.findFirst({
    where: { guardianId: ctx.guardianId, studentId: params.studentId, isActive: true },
  });
  if (!link) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 403 });

  const [masteries, trackProgress] = await Promise.all([
    (prismaEdu as any).eduSkillMastery.findMany({
      where: { studentId: params.studentId },
      include: { skill: { select: { code: true, shortLabel: true, subjectCode: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    (prismaEdu as any).eduTrackProgress.findMany({
      where: { studentId: params.studentId },
      include: {
        assignment: {
          include: { track: { select: { title: true, skillIds: true } } },
        },
      },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
    }),
  ]);

  const masteryByLevel = { NOT_YET: 0, ALMOST: 0, MASTERED: 0 };
  for (const m of masteries) masteryByLevel[m.level as keyof typeof masteryByLevel]++;

  return NextResponse.json({
    masteries,
    masteryByLevel,
    recentProgress: trackProgress,
  });
}
