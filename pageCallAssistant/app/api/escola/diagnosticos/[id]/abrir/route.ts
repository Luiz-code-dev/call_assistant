import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN" && ctx.role !== "COORDINATOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const diag = await (prismaEdu as any).eduDiagnostic.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
  });
  if (!diag) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (diag.status !== "DRAFT") return NextResponse.json({ error: "Apenas rascunhos podem ser abertos" }, { status: 400 });

  const updated = await (prismaEdu as any).eduDiagnostic.update({
    where: { id: params.id },
    data: { status: "OPEN", opensAt: new Date() },
  });
  return NextResponse.json({ diagnostic: updated });
}
