import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const years = await prismaEdu.eduSchoolYear.findMany({
    where: { networkId: ctx.networkId },
    include: { terms: { orderBy: { order: "asc" } } },
    orderBy: { year: "desc" },
  });
  return NextResponse.json({ years });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { year, startsAt, endsAt } = await req.json();
  if (!year || !startsAt || !endsAt) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  const sy = await prismaEdu.eduSchoolYear.create({
    data: { networkId: ctx.networkId, year: +year, startsAt: new Date(startsAt), endsAt: new Date(endsAt), isCurrent: false },
  });
  return NextResponse.json({ year: sy }, { status: 201 });
}
