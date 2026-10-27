import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

/* eslint-disable @typescript-eslint/no-explicit-any */

const schema = z.object({
  reason: z.enum(["RETORNO_ERRADO", "CONTEUDO_INADEQUADO", "OUTRO"]),
  detail: z.string().max(1000).optional(),
});

// "Reportar este retorno": grava o relato (vai para o professor e a Codevelop).
export async function POST(req: NextRequest, { params }: { params: { submissionId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Garante que a submissão é do próprio aluno (isolamento).
  const sub = await (prismaEdu as any).eduSubmission.findFirst({
    where: { id: params.submissionId, studentId: student.studentId },
    select: { id: true },
  });
  if (!sub) return NextResponse.json({ error: "Retorno não encontrado" }, { status: 404 });

  await (prismaEdu as any).eduFeedbackReport.create({
    data: {
      networkId: student.networkId,
      submissionId: sub.id,
      studentId: student.studentId,
      reason: parsed.data.reason,
      detail: parsed.data.detail ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
