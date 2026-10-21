import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { text } = await req.json();
  if (typeof text !== "string") return NextResponse.json({ error: "text obrigatório" }, { status: 400 });

  const activity = await prismaEdu.eduActivity.findUnique({ where: { id: params.id } });
  if (!activity || activity.status !== "PUBLISHED") return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  const existing = await prismaEdu.eduSubmission.findFirst({
    where: { activityId: params.id, studentId: ctx.studentId, status: "IN_PROGRESS" },
    orderBy: { attempt: "desc" },
  });

  if (existing) {
    await prismaEdu.eduSubmission.update({ where: { id: existing.id }, data: { text } });
  } else {
    const lastAttempt = await prismaEdu.eduSubmission.findFirst({
      where: { activityId: params.id, studentId: ctx.studentId },
      orderBy: { attempt: "desc" },
      select: { attempt: true },
    });
    const nextAttempt = (lastAttempt?.attempt ?? 0) + 1;
    if (nextAttempt > activity.maxAttempts) return NextResponse.json({ error: "Tentativas esgotadas" }, { status: 409 });

    await prismaEdu.eduSubmission.create({
      data: {
        networkId: ctx.networkId,
        activityId: params.id,
        studentId: ctx.studentId,
        attempt: nextAttempt,
        status: "IN_PROGRESS",
        text,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
