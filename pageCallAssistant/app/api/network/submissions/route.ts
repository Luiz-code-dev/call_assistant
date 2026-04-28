import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../_auth";

export async function GET(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId");
  const mine = searchParams.get("mine") === "true";
  if (!challengeId) return NextResponse.json({ error: "challengeId obrigatório." }, { status: 400 });

  if (mine) {
    const submissions = await db.submission.findMany({
      where: { challengeId, userId: session.sub },
      include: {
        evaluation: {
          select: { totalScore: true, fluencyScore: true, contentScore: true, clarityScore: true, feedback: true, improvedResponse: true, tip: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(submissions);
  }

  const submissions = await db.submission.findMany({
    where: { challengeId, isPublic: true, isSelected: true },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      evaluation: {
        select: { totalScore: true, fluencyScore: true, contentScore: true, clarityScore: true, feedback: true, tip: true },
      },
    },
    orderBy: [
      { evaluation: { totalScore: "desc" } },
      { createdAt: "asc" },
    ],
    take: 50,
  });

  return NextResponse.json(submissions);
}

export async function POST(req: NextRequest) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { challengeId, circleId, content, isPublic } = body;

  if (!challengeId || !circleId || !content?.trim())
    return NextResponse.json({ error: "challengeId, circleId e content são obrigatórios." }, { status: 400 });
  if (content.trim().length > 3000)
    return NextResponse.json({ error: "Resposta muito longa (máx. 3000 caracteres)." }, { status: 400 });

  const [member, challenge] = await Promise.all([
    db.circleMember.findUnique({ where: { circleId_userId: { circleId, userId: session.sub } } }),
    db.challenge.findUnique({ where: { id: challengeId } }),
  ]);

  if (!member || member.status !== "active")
    return NextResponse.json({ error: "Você não é membro deste Circle." }, { status: 403 });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  if (new Date() < challenge.startsAt)
    return NextResponse.json({ error: "Este desafio ainda não iniciou." }, { status: 425 });
  if (new Date() > challenge.endsAt)
    return NextResponse.json({ error: "O período de submissão encerrou." }, { status: 410 });

  await db.submission.updateMany({
    where: { userId: session.sub, challengeId },
    data: { isSelected: false },
  });

  const submission = await db.submission.create({
    data: {
      userId: session.sub,
      challengeId,
      circleId,
      content: content.trim(),
      isPublic: isPublic !== false,
      isSelected: true,
    },
  });

  return NextResponse.json(submission, { status: 201 });
}
