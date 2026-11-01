/**
 * GET /api/escola/coordenacao/escolas
 * Retorna escolas e turmas da coordenação com participação na semana.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function GET(_req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["COORDINATOR", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);
  since7d.setHours(0, 0, 0, 0);

  const schools: Array<{ id: string; name: string; city: string | null }> = await P.eduSchool.findMany({
    where: { networkId: ctx.networkId },
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });

  const escolas = await Promise.all(schools.map(async (school: { id: string; name: string; city: string | null }) => {
    const turmasRaw: Array<{ id: string; name: string; gradeYear: number; shift: string }> = await P.eduOffering.findMany({
      where: { schoolId: school.id, networkId: ctx.networkId },
      select: { id: true, name: true, gradeYear: true, shift: true },
      orderBy: [{ gradeYear: "asc" }, { name: "asc" }],
    }).catch(() => []);

    const turmas = await Promise.all(turmasRaw.map(async (t: { id: string; name: string; gradeYear: number; shift: string }) => {
      const studentCount: number = await P.eduEnrollment.count({
        where: { offeringId: t.id, status: "ACTIVE" },
      }).catch(() => 0);

      const practiceCount: number = await P.eduSubmission.count({
        where: { networkId: ctx.networkId, submittedAt: { gte: since7d }, enrollment: { offeringId: t.id } },
      }).catch(() => 0);

      const participationPct = studentCount > 0 ? Math.min(100, Math.round((practiceCount / studentCount) * 100)) : 0;

      return { id: t.id, name: t.name, gradeYear: t.gradeYear, shift: t.shift ?? "", studentCount, practiceCount, participationPct };
    }));

    return { id: school.id, name: school.name, city: school.city ?? "", turmas };
  }));

  return NextResponse.json({ escolas });
}
