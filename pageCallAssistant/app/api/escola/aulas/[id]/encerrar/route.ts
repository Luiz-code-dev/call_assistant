import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const session = await prismaEdu.eduClassSession.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!session) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  if (session.openedById !== ctx.userId && ctx.role !== "SCHOOL_ADMIN" && ctx.role !== "NETWORK_ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (session.closedAt) return NextResponse.json({ error: "Sessão já encerrada" }, { status: 400 });

  await prismaEdu.eduClassSession.update({ where: { id: params.id }, data: { closedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
