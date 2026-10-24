import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() {
  return process.env.FEATURE_ESCOLAS === "true";
}

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const networks = await prismaEdu.eduNetwork.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, state: true, isActive: true },
  });

  return NextResponse.json({ networks });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  const city = (body?.city ?? "").trim();
  const state = (body?.state ?? "").trim();
  const ibgeCode = (body?.ibgeCode ?? "").trim() || null;

  if (!name || !city || !state) {
    return NextResponse.json({ error: "Nome, município e UF são obrigatórios." }, { status: 400 });
  }

  const network = await prismaEdu.eduNetwork.create({
    data: {
      name,
      city,
      state,
      ibgeCode,
      isActive: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: network.id }, { status: 201 });
}
