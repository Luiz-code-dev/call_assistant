import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { gradeQuiz } from "@/lib/escola/ai-gateway";
import { uploadAudio, isAudioStorageConfigured } from "@/lib/escola/audio-store";
import { getOpenAI } from "@/lib/openai";
import { subjectToWhisperLang, stageToAgeGroup } from "@/lib/escola/subject-lang";
import { recordMasteryEvent, extractMisconceptionCodes } from "@/lib/escola/mastery-event";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB (limite Whisper)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });

  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // A6: busca a atividade garantindo rede e turma do aluno
  const activity = await (prismaEdu as any).eduActivity.findFirst({
    where: {
      id: params.id,
      networkId: ctx.networkId,
      status: "PUBLISHED",
      classSubject: { classId: ctx.classId },
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      classSubject: {
        include: { class: { select: { gradeYear: true, stage: true } } },
      },
    },
  });
  if (!activity) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  if (activity.dueAt && new Date(activity.dueAt) < new Date()) {
    return NextResponse.json({ error: "Prazo encerrado" }, { status: 409 });
  }

  // A2: derivar idioma e contexto pedagógico do componente (nunca do navegador)
  const subjectData = await (prismaEdu as any).eduSubject.findUnique({
    where: { id: activity.classSubject.subjectId },
    select: { name: true },
  });
  const subjectName: string = subjectData?.name ?? "";
  const gradeYear: number = activity.classSubject.class?.gradeYear ?? 0;
  const stage: string = activity.classSubject.class?.stage ?? "ELEMENTARY_LATE";
  const ageGroup = stageToAgeGroup(stage as any, gradeYear);
  const whisperLang = subjectToWhisperLang(subjectName);

  // Conta tentativas usadas
  const usedAttempts = await (prismaEdu as any).eduSubmission.count({
    where: { activityId: params.id, studentId: ctx.studentId, networkId: ctx.networkId, status: { not: "IN_PROGRESS" } },
  });
  if (usedAttempts >= activity.maxAttempts) {
    return NextResponse.json({ error: "Tentativas esgotadas" }, { status: 409 });
  }

  let text: string | null = null;
  let transcript: string | null = null;
  let audioKey: string | null = null;
  let quizAnswers: { questionId: string; selectedIndex: number }[] | null = null;

  // A3: SPOKEN — recebe multipart com áudio, transcreve e guarda no servidor
  if (activity.type === "SPOKEN") {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json({ error: "Envie o áudio como multipart/form-data" }, { status: 400 });
    }
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) return NextResponse.json({ error: "Campo 'audio' obrigatório" }, { status: 400 });
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Áudio excede 25 MB" }, { status: 413 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Guarda o áudio em storage privado
    if (isAudioStorageConfigured()) {
      const submissionDraftId = `draft-${ctx.studentId}-${params.id}`;
      audioKey = await uploadAudio(ctx.networkId, submissionDraftId, audioBuffer, audioFile.type);
    }

    // Transcreve no servidor com o idioma correto
    const openai = getOpenAI();
    const blob = new Blob([audioBuffer], { type: audioFile.type });
    const file = new File([blob], audioFile.name || "audio.webm", { type: audioFile.type });
    const resp = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: whisperLang,
    });
    transcript = resp.text ?? null;
  } else if (activity.type === "QUIZ") {
    const body = await req.json();
    quizAnswers = body.quizAnswers ?? null;
  } else {
    const body = await req.json();
    text = typeof body.text === "string" ? body.text.slice(0, 20000) : null;
  }

  // Encontra ou cria submission IN_PROGRESS
  const existing = await (prismaEdu as any).eduSubmission.findFirst({
    where: { activityId: params.id, studentId: ctx.studentId, networkId: ctx.networkId, status: "IN_PROGRESS" },
    orderBy: { attempt: "desc" },
  });

  const attempt = existing?.attempt ?? usedAttempts + 1;
  const now = new Date();

  // Persiste a entrega ANTES de qualquer avaliação
  let submission: { id: string };
  if (existing) {
    submission = await (prismaEdu as any).eduSubmission.update({
      where: { id: existing.id },
      data: {
        text: text ?? existing.text,
        transcript: transcript ?? existing.transcript,
        audioKey: audioKey ?? existing.audioKey,
        quizAnswers: quizAnswers ?? existing.quizAnswers,    // C: Json nativo (não string)
        status: "SUBMITTED",
        submittedAt: now,
        aiStatus: activity.type === "QUIZ" ? null : "PENDING",  // B8
      },
    });
  } else {
    submission = await (prismaEdu as any).eduSubmission.create({
      data: {
        networkId: ctx.networkId,
        activityId: params.id,
        studentId: ctx.studentId,
        attempt,
        status: "SUBMITTED",
        submittedAt: now,
        text,
        transcript,
        audioKey,
        quizAnswers: quizAnswers ?? undefined,               // C: Json nativo
        aiStatus: activity.type === "QUIZ" ? null : "PENDING",  // B8
      },
    });
  }

  // Atualiza audioKey com a key definitiva (substitui draft key) se storage configurado
  if (activity.type === "SPOKEN" && audioKey && isAudioStorageConfigured()) {
    const finalKey = audioKey.replace(`draft-${ctx.studentId}-${params.id}`, submission.id);
    if (finalKey !== audioKey) {
      await (prismaEdu as any).eduSubmission.update({
        where: { id: submission.id },
        data: { audioKey: finalKey },
      });
    }
  }

  // Quiz: auto-corrige imediatamente (sem IA externa)
  if (activity.type === "QUIZ") {
    try {
      const answers = quizAnswers ?? [];
      const result = gradeQuiz(activity.questions, answers, Number(activity.maxScore));
      const idx = (qid: string) =>
        activity.questions.findIndex((q: { id: string }) => q.id === qid) + 1;
      // Extrai misconceptionCodes das respostas erradas (sem enviar ao navegador)
      const misconceptions = extractMisconceptionCodes(activity.questions, answers);
      const feedback = {
        score: result.score,
        porCriterio: [] as unknown[],
        acertos: result.perQuestion.filter((q: any) => q.correct).map((q: any) => `Questão ${idx(q.questionId)} correta`),
        melhorar: result.perQuestion.filter((q: any) => !q.correct).map((q: any) => q.explanation ?? `Questão ${idx(q.questionId)}: reveja o conteúdo`),
        exemplo: "",
        quizDetail: result.perQuestion,
      };
      const masteryLevel = result.score >= 0.7 ? "MASTERED" : result.score >= 0.4 ? "ALMOST" : "NOT_YET";
      await (prismaEdu as any).eduSubmission.update({
        where: { id: submission.id },
        data: {
          status: "EVALUATED",
          aiScore: result.score,
          aiFeedback: { ...feedback, misconceptions: Object.keys(misconceptions).length ? misconceptions : {} },
          evaluatedAt: new Date(),
          aiStatus: "DONE",
          masteryLevel,
        },
      });
      // Grava evento de domínio (CLASS_ACTIVITY se tiver lessonId, senão TRACK)
      const source = activity.lessonId ? "CLASS_ACTIVITY" : "TRACK";
      // Grava por cada skillId ligado à atividade
      const skillIds: string[] = Array.isArray(activity.skillIds) ? activity.skillIds : [];
      for (const skillId of skillIds) {
        await recordMasteryEvent({
          networkId: ctx.networkId,
          studentId: ctx.studentId,
          skillId,
          level: masteryLevel as "NOT_YET" | "ALMOST" | "MASTERED",
          source,
          submissionId: submission.id,
        }).catch(() => null); // não falha o fluxo
      }
    } catch { /* mantém SUBMITTED */ }
  }
  // WRITTEN/SPOKEN: avaliação IA via cron (B8) — aiStatus=PENDING já gravado

  return NextResponse.json({ submissionId: submission.id, status: "SUBMITTED" });
}
