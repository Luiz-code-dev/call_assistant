import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

export async function GET() {
  if (process.env.FEATURE_ESCOLAS !== "true")
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

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
