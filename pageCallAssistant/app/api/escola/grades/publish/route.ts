import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getEduContext } from "@/lib/escola/context";
import { can } from "@/lib/escola/permissions";

const bodySchema = z.object({ assessmentId: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!can(ctx.role, "grade:publish")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { assessmentId } = parsed.data;

  const assessment = await db.eduAssessment.findUnique({
    where: { id: assessmentId },
    include: { classSubject: { select: { networkId: true } } },
  });
  if (!assessment || assessment.classSubject.networkId !== ctx.networkId) {
    return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  }
  if (assessment.status === "PUBLISHED") {
    return NextResponse.json({ error: "Já publicada" }, { status: 409 });
  }

  const updated = await db.eduAssessment.update({
    where: { id: assessmentId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  await db.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "staff",
      actorId: ctx.userId,
      action: "grade:publish",
      entity: "EduAssessment",
      entityId: assessmentId,
    },
  });

  return NextResponse.json(updated);
}
