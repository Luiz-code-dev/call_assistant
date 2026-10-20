import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","COORDINATOR"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  await prismaEdu.eduTeachingPlan.update({ where: { id: params.id, networkId: ctx.networkId }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ ok: true });
}
