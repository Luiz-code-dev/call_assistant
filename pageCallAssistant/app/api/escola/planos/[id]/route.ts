import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bruto: any = await prismaEdu.eduTeachingPlan.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    include: { units: { orderBy: { order: "asc" } } },
  });
  if (!bruto) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  // O plano guarda só os ids do componente e do ano letivo (sem relação no banco).
  const [subject, schoolYear] = await Promise.all([
    prismaEdu.eduSubject.findFirst({ where: { id: bruto.subjectId, networkId: ctx.networkId }, select: { name: true, color: true } }),
    prismaEdu.eduSchoolYear.findFirst({ where: { id: bruto.schoolYearId, networkId: ctx.networkId }, select: { year: true } }),
  ]);
  const plan = {
    ...bruto,
    subject,
    schoolYear,
    // A unidade guarda os tópicos como texto (um por linha) em "objectives".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    units: (bruto.units ?? []).map((u: any) => ({
      ...u,
      startWeek: null,
      endWeek: null,
      topics: String(u.objectives ?? "").split("\n").map((t: string) => t.trim()).filter(Boolean),
    })),
  };
  return NextResponse.json({ plan });
}
