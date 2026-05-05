import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";
import { checkAndAwardBadges } from "@/lib/badges";
import { registerActivity } from "@/lib/streak";

// GET /api/network/challenges/[id]/quiz
// Returns questions with options but WITHOUT correctIndex
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const challenge = await db.challenge.findUnique({
    where: { id: params.id },
    include: { quizQuestions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  if (challenge.type !== "quiz") return NextResponse.json({ error: "Este desafio não é um quiz." }, { status: 400 });

  const now = new Date();
  if (now < challenge.startsAt)
    return NextResponse.json({ error: "Este desafio ainda não iniciou." }, { status: 425 });
  if (now > challenge.endsAt)
    return NextResponse.json({ error: "O período deste desafio encerrou." }, { status: 410 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: challenge.circleId, userId: session.sub } },
  });
  if (!member || member.status !== "active")
    return NextResponse.json({ error: "Acesso restrito a membros." }, { status: 403 });

  if (challenge.quizQuestions.length === 0) {
    return NextResponse.json({ error: "Este quiz não possui perguntas. Delete o desafio e recrie-o." }, { status: 422 });
  }

  const questions = challenge.quizQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: JSON.parse(q.options) as string[],
  }));

  return NextResponse.json({ questions, total: questions.length });
}

// POST /api/network/challenges/[id]/quiz
// Body: { answers: [{questionId, selectedText}], circleId }
// Creates a Submission + SubmissionEvaluation with quiz score
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { answers, circleId } = body as {
    answers: { questionId: string; selectedText: string }[];
    circleId: string;
  };

  if (!circleId || !Array.isArray(answers))
    return NextResponse.json({ error: "circleId e answers são obrigatórios." }, { status: 400 });

  const challenge = await db.challenge.findUnique({
    where: { id: params.id },
    include: { quizQuestions: true },
  });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  if (challenge.type !== "quiz") return NextResponse.json({ error: "Este desafio não é um quiz." }, { status: 400 });
  if (new Date() < challenge.startsAt) return NextResponse.json({ error: "Este desafio ainda não iniciou." }, { status: 425 });
  if (new Date() > challenge.endsAt) return NextResponse.json({ error: "O período de submissão encerrou." }, { status: 410 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.sub } },
  });
  if (!member || member.status !== "active")
    return NextResponse.json({ error: "Você não é membro deste Circle." }, { status: 403 });

  const existing = await db.submission.findFirst({
    where: { userId: session.sub, challengeId: params.id },
  });
  if (existing) return NextResponse.json({ error: "Você já completou este quiz." }, { status: 409 });

  // Evaluate answers
  const results = challenge.quizQuestions.map((q) => {
    const opts = JSON.parse(q.options) as string[];
    const correctText = opts[q.correctIndex];
    const ans = answers.find((a) => a.questionId === q.id);
    const selectedText = ans?.selectedText ?? "";
    return {
      questionId: q.id,
      question: q.question,
      correct: selectedText === correctText,
      correctText,
      selectedText,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const total = challenge.quizQuestions.length;
  const score = correctCount * 0.5; // 0.5 pts each
  const scoreOn10 = total > 0 ? Math.round((correctCount / total) * 10) : 0;

  const content = JSON.stringify({
    type: "quiz",
    score,
    correct: correctCount,
    total,
    results: results.map((r) => ({
      question: r.question,
      correct: r.correct,
      correctText: r.correctText,
      selectedText: r.selectedText,
    })),
  });

  const submission = await db.submission.create({
    data: { userId: session.sub, challengeId: params.id, circleId, content, isPublic: true, isSelected: true },
  });

  await db.submissionEvaluation.create({
    data: {
      submissionId: submission.id,
      fluencyScore: 0,
      contentScore: scoreOn10,
      clarityScore: 0,
      totalScore: scoreOn10,
      feedback: `Você acertou ${correctCount} de ${total} perguntas. Pontuação: ${score.toFixed(1)} pts.`,
      improvedResponse: "",
      tip: correctCount < total ? "Revise as questões erradas para fortalecer seu vocabulário técnico." : "Parabéns! Resposta perfeita!",
    },
  });

  await registerActivity(session.sub).catch(() => {});
  const newBadges = await checkAndAwardBadges(session.sub, "quiz", {
    quizCorrect: correctCount,
    quizTotal: total,
    quizScoreOn10: scoreOn10,
  }).catch(() => []);

  return NextResponse.json({ score, correct: correctCount, total, results, newBadges }, { status: 201 });
}
