import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../_auth";

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
  const { circleId, title, prompt, type, startsAt, endsAt, isRecurring } = body;

  if (!circleId || !title?.trim() || !prompt?.trim() || !startsAt || !endsAt)
    return NextResponse.json({ error: "Campos obrigatórios: circleId, title, prompt, startsAt, endsAt." }, { status: 400 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.sub } },
  });
  if (!member || !["owner", "moderator"].includes(member.role))
    return NextResponse.json({ error: "Sem permissão para criar desafios neste Circle." }, { status: 403 });

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start)
    return NextResponse.json({ error: "Datas inválidas." }, { status: 400 });

  const challenge = await db.challenge.create({
    data: {
      circleId,
      title: title.trim().slice(0, 120),
      prompt: prompt.trim().slice(0, 2000),
      type: type === "spoken" ? "spoken" : "written",
      startsAt: start,
      endsAt: end,
      isRecurring: !!isRecurring,
    },
  });

  return NextResponse.json(challenge, { status: 201 });
}
