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

  const seen = new Set<string>();
  const classes = classSubjects
    .filter((cs: any) => cs.class.isActive)
    .reduce((acc: any[], cs: any) => {
      if (!seen.has(cs.class.id)) { seen.add(cs.class.id); acc.push(cs.class); }
      return acc;
    }, []);

  return NextResponse.json({ classes });
}
