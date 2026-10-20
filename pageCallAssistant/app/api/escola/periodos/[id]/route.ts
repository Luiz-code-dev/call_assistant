import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN" && ctx.role !== "COORDINATOR") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const body = await req.json();
  const term = await prismaEdu.eduTerm.update({
    where: { id: params.id },
    data: { status: body.status, name: body.name, startsAt: body.startsAt ? new Date(body.startsAt) : undefined, endsAt: body.endsAt ? new Date(body.endsAt) : undefined },
  });
  return NextResponse.json({ term });
}
