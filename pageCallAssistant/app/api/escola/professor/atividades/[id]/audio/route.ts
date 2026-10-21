/**
 * A3: URL assinada de curta duração para o professor ouvir o áudio da entrega.
 * Apenas o professor da turma, coordenação e direção podem acessar.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { assertCanViewClassSubject } from "@/lib/escola/permissions";
import { getAudioSignedUrl, isAudioStorageConfigured } from "@/lib/escola/audio-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const submissionId = searchParams.get("submission");
  if (!submissionId) return NextResponse.json({ error: "submission obrigatório" }, { status: 400 });

  // Busca a atividade com classSubject para verificar permissão
  const activity = await (prismaEdu as any).eduActivity.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    include: {
      classSubject: {
        include: { class: { select: { schoolId: true } } },
      },
    },
  });
  if (!activity) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    assertCanViewClassSubject(
      { ...ctx, schoolId: ctx.schoolId ?? null },
      {
        teacherId: activity.classSubject.teacherId ?? null,
        networkId: activity.networkId,
        schoolId: activity.classSubject.class?.schoolId ?? "",
      },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 403 });
  }

  const submission = await (prismaEdu as any).eduSubmission.findFirst({
    where: { id: submissionId, activityId: params.id, networkId: ctx.networkId },
    select: { audioKey: true },
  });
  if (!submission?.audioKey) return NextResponse.json({ error: "Áudio não disponível" }, { status: 404 });

  if (!isAudioStorageConfigured()) {
    return NextResponse.json({ error: "Armazenamento de áudio não configurado" }, { status: 503 });
  }

  const url = await getAudioSignedUrl(submission.audioKey);
  return NextResponse.json({ url, expiresInSec: parseInt(process.env.EDU_AUDIO_SIGNED_TTL ?? "300", 10) });
}
