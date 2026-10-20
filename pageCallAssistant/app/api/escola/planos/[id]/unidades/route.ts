import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const plan = await prismaEdu.eduTeachingPlan.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  if (plan.status === "ARCHIVED") return NextResponse.json({ error: "Plano arquivado não pode ser editado" }, { status: 400 });
  const { title, order, startWeek, endWeek, topics } = await req.json();
  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  const unit = await prismaEdu.eduPlanUnit.create({
    data: { planId: params.id, title, order: +order || 1, startWeek: startWeek ?? null, endWeek: endWeek ?? null, topics: topics ?? [] },
  });
  return NextResponse.json({ unit }, { status: 201 });
}
