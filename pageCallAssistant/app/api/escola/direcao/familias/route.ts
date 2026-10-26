import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "SCHOOL_ADMIN" && ctx.role !== "NETWORK_ADMIN" && ctx.role !== "COORDINATOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const guardians = await (prismaEdu as any).eduGuardian.findMany({
    where: { networkId: ctx.networkId },
    include: {
      links: {
        include: { student: { select: { fullName: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ guardians });
}
