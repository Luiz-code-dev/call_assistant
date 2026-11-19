import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  const where: Record<string, unknown> = { networkId: ctx.networkId };
  if (ctx.role === "TEACHER") where["createdById"] = ctx.userId;
  // O plano guarda só os ids do componente e do ano letivo (sem relação no banco): busca os nomes à parte.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brutos: any[] = await prismaEdu.eduTeachingPlan.findMany({
    where,
    orderBy: [{ gradeYear: "asc" }, { title: "asc" }, { version: "desc" }],
  });
  const [subjects, years]: [Array<{ id: string; name: string; color: string | null }>, Array<{ id: string; year: number }>] = await Promise.all([
    prismaEdu.eduSubject.findMany({ where: { networkId: ctx.networkId }, select: { id: true, name: true, color: true } }),
    prismaEdu.eduSchoolYear.findMany({ where: { networkId: ctx.networkId }, select: { id: true, year: true } }),
  ]);
  const plans = brutos.map((pl) => ({
    ...pl,
    subject: subjects.find((s) => s.id === pl.subjectId) ?? null,
    schoolYear: years.find((y) => y.id === pl.schoolYearId) ?? null,
  }));
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["NETWORK_ADMIN","COORDINATOR","TEACHER"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { subjectId, stage, gradeYear, schoolYearId, title, objectives } = await req.json();
  if (!subjectId || !stage || !gradeYear || !schoolYearId || !title || !objectives) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  const plan = await prismaEdu.eduTeachingPlan.create({
    data: { networkId: ctx.networkId, createdById: ctx.userId, schoolId: ctx.schoolId ?? null, subjectId, stage, gradeYear: +gradeYear, schoolYearId, title, objectives, status: "DRAFT", version: 1 },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
