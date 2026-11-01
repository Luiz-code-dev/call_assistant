/**
 * POST /api/escola/ficha/[studentId]/atribuir-trilha
 * Aceita uma sugestão de trilha (EduTeacherAlert type=TRACK_SUGGESTION)
 * e atribui a trilha ao aluno via assignTrackToStudents.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { assignTrackToStudents } from "@/lib/escola/track-assignment";

const ALLOWED_ROLES = ["TEACHER", "COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"];

const bodySchema = z.object({
  trackId: z.string().min(1),
  /** ID do EduTeacherAlert (quando vem de sugestão pós-diagnóstico) */
  assignmentId: z.string().optional(),
  acceptSuggestion: z.boolean().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function POST(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { trackId, assignmentId, acceptSuggestion } = parsed.data;

  // Verifica que o aluno pertence à rede
  const student = await P.eduStudent.findFirst({
    where: { id: params.studentId, networkId: ctx.networkId },
    select: { id: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  // Atribui a trilha
  let result;
  try {
    result = await assignTrackToStudents({
      networkId: ctx.networkId,
      trackId,
      studentIds: [params.studentId],
      assignedBy: ctx.userId,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  // Marca o alerta como lido (se vier de sugestão pós-diagnóstico)
  if (acceptSuggestion && assignmentId) {
    await P.eduTeacherAlert.updateMany({
      where: { id: assignmentId, networkId: ctx.networkId },
      data: { readAt: new Date() },
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, atribuidos: result.atribuidos, pulados: result.pulados });
}
