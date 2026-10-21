import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const where: Record<string, unknown> = { networkId: ctx.networkId };
  if (ctx.role === "TEACHER") where["authorId"] = ctx.userId;
  const plans = await prismaEdu.eduTeachingPlan.findMany({
    where,
    include: { subject: { select: { name: true, color: true } }, schoolYear: { select: { year: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","COORDINATOR","TEACHER"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { subjectId, stage, gradeYear, schoolYearId, title, objectives } = await req.json();
  if (!subjectId || !stage || !gradeYear || !schoolYearId || !title || !objectives) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  const plan = await prismaEdu.eduTeachingPlan.create({
    data: { networkId: ctx.networkId, authorId: ctx.userId, subjectId, stage, gradeYear: +gradeYear, schoolYearId, title, objectives, status: "DRAFT", version: 1 },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
