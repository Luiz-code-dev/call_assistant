import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

export const runtime = "nodejs";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const classSubjects = await prismaEdu.eduClassSubject.findMany({
    where: { teacherId: ctx.userId, networkId: ctx.networkId },
    include: {
      class: { select: { name: true, gradeYear: true } },
      subject: { select: { name: true } },
    },
    orderBy: [{ class: { gradeYear: "asc" } }],
  });

  type CsRow = (typeof classSubjects)[number];
  const items = classSubjects
    .map((cs: CsRow) => ({
      id: cs.id,
      className: cs.class.name,
      gradeYear: cs.class.gradeYear,
      subjectName: cs.subject.name,
    }));

  return NextResponse.json({ items });
}
