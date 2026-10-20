import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const student = await prismaEdu.eduStudent.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const updated = await prismaEdu.eduStudent.update({
    where: { id: params.id },
    data: { cardVersion: { increment: 1 } },
    select: { id: true, cardVersion: true },
  });

  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "staff", actorId: ctx.userId, action: "student.card.revoked", entity: "EduStudent", entityId: params.id, metadata: { newVersion: updated.cardVersion } },
  });

  return NextResponse.json({ ok: true, cardVersion: updated.cardVersion });
}
