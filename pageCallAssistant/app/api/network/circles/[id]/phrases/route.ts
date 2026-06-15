import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";

async function ensureMember(circleId: string, userId: string) {
  const circle = await db.circle.findUnique({ where: { id: circleId }, select: { visibility: true } });
  if (!circle) return { ok: false, status: 404, error: "Circle não encontrado." };
  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  const isActive = member?.status === "active";
  if (circle.visibility !== "public" && !isActive)
    return { ok: false, status: 403, error: "Acesso restrito a membros." };
  return { ok: true, isActive };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const access = await ensureMember(params.id, session.sub);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const phrases = await db.circlePhrase.findMany({
    where: { circleId: params.id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      likes: { where: { userId: session.sub }, select: { id: true } },
    },
    orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json(
    phrases.map((p) => ({
      id: p.id,
      text: p.text,
      translation: p.translation,
      likeCount: p.likeCount,
      createdAt: p.createdAt,
      likedByMe: p.likes.length > 0,
      user: p.user,
      isMine: p.userId === session.sub,
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const access = await ensureMember(params.id, session.sub);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.isActive)
    return NextResponse.json({ error: "Você precisa ser membro deste Circle para postar." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const translation = typeof body.translation === "string" ? body.translation.trim() : "";

  if (text.length < 2)
    return NextResponse.json({ error: "Escreva uma frase ou expressão válida." }, { status: 400 });

  const phrase = await db.circlePhrase.create({
    data: {
      circleId: params.id,
      userId: session.sub,
      text: text.slice(0, 300),
      translation: translation ? translation.slice(0, 300) : null,
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(
    {
      id: phrase.id,
      text: phrase.text,
      translation: phrase.translation,
      likeCount: 0,
      createdAt: phrase.createdAt,
      likedByMe: false,
      user: phrase.user,
      isMine: true,
    },
    { status: 201 }
  );
}
