import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled, isNotasEnabled } from "@/lib/escola/feature-flag";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled() || !isNotasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const assessment = await prismaEdu.eduAssessment.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
    include: { classSubject: true },
  });
  if (!assessment) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  if (ctx.role === "TEACHER" && assessment.classSubject?.teacherId !== ctx.userId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (assessment.status !== "DRAFT") return NextResponse.json({ error: "Apenas rascunhos podem ser abertos" }, { status: 400 });
  await prismaEdu.eduAssessment.update({ where: { id: params.id }, data: { status: "OPEN" } });
  return NextResponse.json({ ok: true });
}
