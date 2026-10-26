import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const links = await (prismaEdu as any).eduGuardianLink.findMany({
    where: { guardianId: ctx.guardianId, isActive: true },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          enrollmentCode: true,
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              class: { select: { id: true, name: true, gradeYear: true, stage: true } },
            },
            take: 1,
          },
        },
      },
    },
  });

  const filhos = links.map((l: any) => ({
    studentId: l.student.id,
    fullName: l.student.fullName,
    enrollmentCode: l.student.enrollmentCode,
    relation: l.relation,
    class: l.student.enrollments[0]?.class ?? null,
  }));

  return NextResponse.json({ filhos });
}
