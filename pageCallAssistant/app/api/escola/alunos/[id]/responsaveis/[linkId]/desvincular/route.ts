import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function POST(req: NextRequest, { params }: { params: { id: string; linkId: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { motivo } = await req.json();
  if (!motivo?.trim()) return NextResponse.json({ error: "Informe o motivo da desvinculação." }, { status: 400 });

  const link = await prismaEdu.eduGuardianLink.findFirst({
    where: { id: params.linkId, networkId: ctx.networkId, studentId: params.id, isActive: true },
  });
  if (!link) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 });

  await prismaEdu.eduGuardianLink.update({
    where: { id: link.id },
    data: { isActive: false, revokedAt: new Date(), revokedById: ctx.userId, revokeReason: motivo.trim() },
  });

  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "guardian.unlinked", entity: "EduGuardianLink", entityId: link.id, metadata: { motivo: motivo.trim() } },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
