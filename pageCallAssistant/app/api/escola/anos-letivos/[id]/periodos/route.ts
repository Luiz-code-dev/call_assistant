import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { name, order, startsAt, endsAt } = await req.json();
  if (!name || !startsAt || !endsAt) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  const term = await prismaEdu.eduTerm.create({
    data: { schoolYearId: params.id, name, order: +order || 1, startsAt: new Date(startsAt), endsAt: new Date(endsAt), status: "OPEN" },
  });
  return NextResponse.json({ term }, { status: 201 });
}
