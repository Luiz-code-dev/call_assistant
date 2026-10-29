import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const classSubjects = await (prismaEdu as any).eduClassSubject.findMany({
    where: { teacherId: ctx.userId, networkId: ctx.networkId },
    include: { class: { select: { id: true, name: true, gradeYear: true, stage: true, isActive: true } } },
  });

  // Agrupa por turma, adicionando lista de subjectIds do professor nessa turma
  const byClass = new Map<string, { id: string; name: string; gradeYear: number; stage: string; isActive: boolean; subjects: { subjectId: string }[] }>();
  for (const cs of classSubjects as { subjectId: string; class: { id: string; name: string; gradeYear: number; stage: string; isActive: boolean } }[]) {
    if (!cs.class.isActive) continue;
    const entry = byClass.get(cs.class.id);
    if (entry) {
      entry.subjects.push({ subjectId: cs.subjectId });
    } else {
      byClass.set(cs.class.id, { ...cs.class, subjects: [{ subjectId: cs.subjectId }] });
    }
  }
  const classes = Array.from(byClass.values());

  return NextResponse.json({ classes, role: ctx.role });
}
