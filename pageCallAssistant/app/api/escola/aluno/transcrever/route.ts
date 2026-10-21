/**
 * A3: Prévia de transcrição — apenas para feedback imediato ao aluno enquanto grava.
 * A transcrição AUTORITATIVA é gerada no servidor durante /enviar.
 * Limites: máx 5 prévias por aluno por dia. Idioma derivado da atividade.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getOpenAI } from "@/lib/openai";
import { prismaEdu } from "@/lib/escola/db";
import { subjectToWhisperLang } from "@/lib/escola/subject-lang";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PREVIEWS_PER_DAY = 5;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB para prévia

function isHallucination(text: string): boolean {
  if (text.length < 4) return true;
  if (/[◆♪♫♩♬✦◉]/.test(text)) return true;
  const hallucinations = ["thank you for watching", "thanks for watching", "subtitles by", "www.", "http"];
  return hallucinations.some((h) => text.toLowerCase().includes(h));
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const audio = formData.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "audio obrigatório" }, { status: 400 });
  if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Áudio muito grande (máx 10 MB para prévia)" }, { status: 413 });
  if (audio.size < 500) return NextResponse.json({ error: "Áudio muito curto" }, { status: 422 });

  // A3: limite de prévias por aluno por dia usando contagem de submissions do dia
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayPreviews: number = await (prismaEdu as any).eduSubmission.count({
    where: {
      studentId: ctx.studentId,
      networkId: ctx.networkId,
      createdAt: { gte: startOfDay },
    },
  }) ?? 0;
  if (todayPreviews >= MAX_PREVIEWS_PER_DAY) {
    return NextResponse.json({ error: "Limite de prévias diárias atingido" }, { status: 429 });
  }

  // A2: deriva idioma da atividade no servidor (não aceita do cliente)
  let whisperLang = "pt";
  const activityId = formData.get("activityId") as string | null;
  if (activityId) {
    const activity = await (prismaEdu as any).eduActivity.findFirst({
      where: { id: activityId, networkId: ctx.networkId, classSubject: { classId: ctx.classId } },
      include: { classSubject: true },
    });
    if (activity) {
      const subjectData = await (prismaEdu as any).eduSubject.findUnique({
        where: { id: activity.classSubject.subjectId },
        select: { name: true },
      });
      whisperLang = subjectToWhisperLang(subjectData?.name ?? "");
    }
  }

  try {
    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: new File([await audio.arrayBuffer()], audio.name || "audio.m4a", { type: audio.type || "audio/m4a" }),
      model: "whisper-1",
      language: whisperLang,
    });

    const transcript = transcription.text?.trim();
    if (!transcript) return NextResponse.json({ error: "Não foi possível transcrever" }, { status: 422 });
    if (isHallucination(transcript)) return NextResponse.json({ error: "Áudio não reconhecido. Fale mais perto do microfone." }, { status: 422 });

    return NextResponse.json({ transcript, preview: true });
  } catch (err) {
    console.error("[escola/aluno/transcrever]", err);
    return NextResponse.json({ error: "Erro ao transcrever" }, { status: 500 });
  }
}
