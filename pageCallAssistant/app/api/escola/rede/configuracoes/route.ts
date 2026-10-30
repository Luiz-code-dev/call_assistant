import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const network = await prismaEdu.eduNetwork.findUnique({
    where: { id: ctx.networkId },
    select: { id: true, name: true, trackAssignmentMode: true, diagnosticAdaptive: true, requireTrackApproval: true },
  });
  if (!network) return NextResponse.json({ error: "Rede não encontrada" }, { status: 404 });

  return NextResponse.json({ network });
}

export async function PATCH(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { trackAssignmentMode, diagnosticAdaptive, requireTrackApproval } = body;

  if (trackAssignmentMode && !["AUTO", "SUGGEST"].includes(trackAssignmentMode)) {
    return NextResponse.json({ error: "trackAssignmentMode inválido: AUTO ou SUGGEST" }, { status: 400 });
  }

  const network = await prismaEdu.eduNetwork.update({
    where: { id: ctx.networkId },
    data: {
      ...(trackAssignmentMode !== undefined ? { trackAssignmentMode } : {}),
      ...(diagnosticAdaptive !== undefined ? { diagnosticAdaptive } : {}),
      ...(requireTrackApproval !== undefined ? { requireTrackApproval } : {}),
    },
    select: { id: true, name: true, trackAssignmentMode: true, diagnosticAdaptive: true, requireTrackApproval: true },
  });

  return NextResponse.json({ network });
}
