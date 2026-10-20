import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = await req.json();
  if (body.isCurrent === true) {
    await prismaEdu.eduSchoolYear.updateMany({ where: { networkId: ctx.networkId }, data: { isCurrent: false } });
  }
  const sy = await prismaEdu.eduSchoolYear.update({
    where: { id: params.id, networkId: ctx.networkId },
    data: { isCurrent: body.isCurrent, startsAt: body.startsAt ? new Date(body.startsAt) : undefined, endsAt: body.endsAt ? new Date(body.endsAt) : undefined },
  });
  return NextResponse.json({ year: sy });
}
