import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../_auth";
import { sendPushToCircleMembers } from "@/lib/webpush";
import { sendExpoPushToCircleMembers } from "@/lib/expoPush";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const circleId = searchParams.get("circleId");
  if (!circleId) return NextResponse.json({ error: "circleId obrigatório." }, { status: 400 });

  const circle = await db.circle.findUnique({ where: { id: circleId }, select: { visibility: true } });
  if (!circle) return NextResponse.json({ error: "Circle não encontrado." }, { status: 404 });
  if (circle.visibility !== "public") {
    const member = await db.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: session.sub } },
    });
    if (!member || member.status !== "active")
      return NextResponse.json({ error: "Acesso restrito a membros." }, { status: 403 });
  }

  const challenges = await db.challenge.findMany({
    where: { circleId },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { startsAt: "desc" },
    take: 20,
  });

  const mySubmissions = await db.submission.findMany({
    where: { userId: session.sub, challengeId: { in: challenges.map((c) => c.id) } },
    select: { challengeId: true },
  });
  const submittedIds = new Set(mySubmissions.map((s) => s.challengeId));

  return NextResponse.json(
    challenges.map((c) => ({
      ...c,
      isActive: new Date() >= c.startsAt && new Date() <= c.endsAt,
      hasSubmitted: submittedIds.has(c.id),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { circleId, title, prompt, scenario, targetVocab, type, startsAt, endsAt, isRecurring, questions } = body;

  if (!circleId || !title?.trim() || !startsAt || !endsAt)
    return NextResponse.json({ error: "Campos obrigatórios: circleId, title, startsAt, endsAt." }, { status: 400 });

  const resolvedType = type === "spoken" ? "spoken" : type === "quiz" ? "quiz" : "written";
  if (resolvedType !== "quiz" && !prompt?.trim())
    return NextResponse.json({ error: "Prompt é obrigatório para desafios de texto/voz." }, { status: 400 });

  if (resolvedType === "quiz") {
    if (!Array.isArray(questions) || questions.length < 1)
      return NextResponse.json({ error: "O quiz precisa de pelo menos 1 pergunta." }, { status: 400 });
    for (const q of questions) {
      if (!q.question?.trim() || !Array.isArray(q.options) || q.options.length !== 4)
        return NextResponse.json({ error: "Cada pergunta precisa de 4 opções." }, { status: 400 });
      if (q.options.some((o: string) => !o?.trim()))
        return NextResponse.json({ error: "Nenhuma opção pode estar vazia." }, { status: 400 });
      if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3)
        return NextResponse.json({ error: "correctIndex inválido (0-3)." }, { status: 400 });
    }
  }

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.sub } },
  });
  if (!member || !["owner", "moderator"].includes(member.role))
    return NextResponse.json({ error: "Sem permissão para criar desafios neste Circle." }, { status: 403 });

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start)
    return NextResponse.json({ error: "Datas inválidas." }, { status: 400 });

  const promptText = resolvedType === "quiz"
    ? (prompt?.trim() || `Quiz com ${questions.length} perguntas`).slice(0, 2000)
    : prompt.trim().slice(0, 2000);

  // Vocabulário-alvo: aceita array de palavras, persiste como JSON (máx. 5 itens)
  const vocabList = Array.isArray(targetVocab)
    ? targetVocab.map((w: unknown) => String(w).trim()).filter(Boolean).slice(0, 5)
    : [];
  const targetVocabJson = resolvedType !== "quiz" && vocabList.length > 0 ? JSON.stringify(vocabList) : null;
  const scenarioText = resolvedType !== "quiz" && typeof scenario === "string" && scenario.trim()
    ? scenario.trim().slice(0, 1000)
    : null;

  try {
    const challenge = await db.challenge.create({
      data: {
        circleId,
        title: title.trim().slice(0, 120),
        prompt: promptText,
        scenario: scenarioText,
        targetVocab: targetVocabJson,
        type: resolvedType,
        startsAt: start,
        endsAt: end,
        isRecurring: !!isRecurring,
      },
    });

    if (resolvedType === "quiz" && questions?.length) {
      await db.quizQuestion.createMany({
        data: questions.slice(0, 20).map((q: { question: string; options: string[]; correctIndex: number }, i: number) => ({
          challengeId: challenge.id,
          question: q.question.trim().slice(0, 500),
          options: JSON.stringify(q.options.map((o: string) => o.trim().slice(0, 200))),
          correctIndex: q.correctIndex,
          orderIndex: i,
        })),
      });
    }

    // Fire-and-forget: notify circle members about new challenge
    const circleName = await db.circle.findUnique({
      where: { id: circleId },
      select: { name: true },
    }).then((c) => c?.name ?? "seu Circle");

    const startsNow = start <= new Date();
    const notifBody = startsNow
      ? `"${challenge.title}" está disponível agora!`
      : `"${challenge.title}" começa ${start.toLocaleDateString("pt-BR")} às ${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    sendPushToCircleMembers(circleId, session.sub, {
      title: `Novo desafio em ${circleName} 🎯`,
      body: notifBody,
      url: `/network/${circleId}`,
    }).catch(console.error);
    sendExpoPushToCircleMembers(circleId, session.sub, {
      title: `Novo desafio em ${circleName} 🎯`,
      body: notifBody,
      data: { circleId },
    }).catch(console.error);

    return NextResponse.json(challenge, { status: 201 });
  } catch (err) {
    console.error("POST /api/network/challenges error:", err);
    return NextResponse.json({ error: "Erro interno ao criar desafio.", detail: String(err) }, { status: 500 });
  }
}
