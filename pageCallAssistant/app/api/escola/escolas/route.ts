import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const schools = await prismaEdu.eduSchool.findMany({
    where: { networkId: ctx.networkId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ schools });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { name, inepCode } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const school = await prismaEdu.eduSchool.create({
    data: { networkId: ctx.networkId, name: name.trim(), inepCode: inepCode?.trim() || null },
  });
  return NextResponse.json({ school }, { status: 201 });
}
