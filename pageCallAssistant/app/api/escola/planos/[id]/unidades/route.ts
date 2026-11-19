import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  const plan = await prismaEdu.eduTeachingPlan.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  if (plan.status === "ARCHIVED") return NextResponse.json({ error: "Plano arquivado não pode ser editado" }, { status: 400 });
  const { title, order, topics, termOrder } = await req.json();
  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  const unit = await prismaEdu.eduPlanUnit.create({
    // A unidade não tem colunas de semana nem lista de tópicos: os tópicos ficam como texto, um por linha.
    data: {
      planId: params.id, title, order: +order || 1,
      termOrder: Number.isInteger(+termOrder) && +termOrder > 0 ? +termOrder : null,
      objectives: Array.isArray(topics) ? topics.map((t: unknown) => String(t).trim()).filter(Boolean).join("\n") : "",
      bnccSkills: [],
    },
  });
  return NextResponse.json({ unit }, { status: 201 });
}
