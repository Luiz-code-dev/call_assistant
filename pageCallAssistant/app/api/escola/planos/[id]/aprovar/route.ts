import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","COORDINATOR"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const plan = await prismaEdu.eduTeachingPlan.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  if (plan.status !== "IN_REVIEW") return NextResponse.json({ error: "Apenas planos em análise podem ser aprovados" }, { status: 400 });
  await prismaEdu.eduTeachingPlan.update({ where: { id: params.id }, data: { status: "APPROVED" } });
  await prismaEdu.eduAuditLog.create({ data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "plan.approved", entity: "EduTeachingPlan", entityId: params.id } });
  return NextResponse.json({ ok: true });
}
