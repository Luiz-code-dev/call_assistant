/**
 * GET /api/escola/coordenacao/turmas
 * Lista turmas da rede com contagens de alunos e componentes, para "Abrir para a rede".
 */
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["COORDINATOR", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const currentYear = await prismaEdu.eduSchoolYear.findFirst({
    where: { networkId: ctx.networkId, isCurrent: true },
    select: { id: true, year: true },
  });

  const turmas = await prismaEdu.eduClass.findMany({
    where: { networkId: ctx.networkId, isActive: true, ...(currentYear ? { schoolYearId: currentYear.id } : {}) },
    select: {
      id: true,
      name: true,
      stage: true,
      gradeYear: true,
      shift: true,
      school: { select: { id: true, name: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } }, subjects: true } },
    },
    orderBy: [{ school: { name: "asc" } }, { gradeYear: "asc" }, { name: "asc" }],
  });

  type TurmaRow = (typeof turmas)[number];
  return NextResponse.json({
    turmas: turmas.map((t: TurmaRow) => ({
      id: t.id,
      name: t.name,
      stage: t.stage,
      gradeYear: t.gradeYear,
      shift: t.shift,
      schoolName: t.school.name,
      studentCount: t._count.enrollments,
      subjectCount: t._count.subjects,
    })),
    schoolYear: currentYear,
  });
}
