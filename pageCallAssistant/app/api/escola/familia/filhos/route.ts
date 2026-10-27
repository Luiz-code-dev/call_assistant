import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    // EduGuardianLink nao tem relacao "student" (so o escalar studentId);
    // busca os alunos e a turma ativa em separado.
    const links = await (prismaEdu as any).eduGuardianLink.findMany({
      where: { guardianId: ctx.guardianId, isActive: true },
      select: { studentId: true, relation: true },
    });
    const ids = links.map((l: { studentId: string }) => l.studentId);
    const students = ids.length
      ? await (prismaEdu as any).eduStudent.findMany({
          where: { id: { in: ids } },
          select: {
            id: true, fullName: true, enrollmentCode: true,
            enrollments: {
              where: { status: "ACTIVE" },
              include: { class: { select: { id: true, name: true, gradeYear: true, stage: true } } },
              take: 1,
            },
          },
        })
      : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byId = new Map<string, any>(students.map((s: any) => [s.id, s]));

    const filhos = links
      .map((l: { studentId: string; relation: string }) => {
        const s = byId.get(l.studentId);
        if (!s) return null;
        return {
          studentId: s.id,
          fullName: s.fullName,
          enrollmentCode: s.enrollmentCode,
          relation: l.relation,
          class: s.enrollments[0]?.class ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ filhos });
  } catch (err) {
    console.error("[familia/filhos:GET]", err);
    return NextResponse.json({ error: "Não foi possível carregar os filhos." }, { status: 500 });
  }
}
