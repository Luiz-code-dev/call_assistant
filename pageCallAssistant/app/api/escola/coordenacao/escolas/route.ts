/**
 * GET /api/escola/coordenacao/escolas
 * Retorna escolas e turmas da rede com participação na semana.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(_req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["COORDINATOR", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);
  since7d.setHours(0, 0, 0, 0);

  const schools = await prismaEdu.eduSchool.findMany({
    where: { networkId: ctx.networkId },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });

  type EduSchoolRow = { id: string; name: string; city: string | null };
  type EduClassRow  = { id: string; name: string; gradeYear: number; shift: string };

  const escolas = await Promise.all((schools as EduSchoolRow[]).map(async (school) => {
    const turmasRaw = await prismaEdu.eduClass.findMany({
      where: { schoolId: school.id, networkId: ctx.networkId },
      select: { id: true, name: true, gradeYear: true, shift: true },
      orderBy: [{ gradeYear: "asc" }, { name: "asc" }],
    });

    const turmas = await Promise.all((turmasRaw as EduClassRow[]).map(async (t) => {
      const studentCount = await prismaEdu.eduEnrollment.count({
        where: { classId: t.id, status: "ACTIVE" },
      }).catch(() => 0);

      const practiceCount = await prismaEdu.eduSubmission.count({
        where: {
          networkId: ctx.networkId,
          submittedAt: { gte: since7d },
          enrollment: { classId: t.id },
        },
      }).catch(() => 0);

      const participationPct = studentCount > 0
        ? Math.min(100, Math.round((practiceCount / studentCount) * 100))
        : 0;

      return { id: t.id, name: t.name, gradeYear: t.gradeYear, shift: t.shift ?? "", studentCount, practiceCount, participationPct };
    }));

    return { id: school.id, name: school.name, city: school.city ?? "", turmas };
  }));

  return NextResponse.json({ escolas });
}
