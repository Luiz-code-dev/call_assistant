import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const aula = await P.eduLesson.findUnique({ where: { id: params.id, networkId: ctx.networkId }, select: { id: true, offeringId: true } });
  if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });

  // Alunos com NOT_YET nesta aula recebem nova tentativa
  const notYetEnrollments = await P.eduSubmission.findMany({
    where: { networkId: ctx.networkId, lessonId: params.id, level: "NOT_YET" },
    select: { enrollmentId: true },
    distinct: ["enrollmentId"],
  }).catch(() => []);

  return NextResponse.json({ aulaId: params.id, segundaChancePara: notYetEnrollments.length });
}
