import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";
import { sendCircleInviteEmail } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (!member || !["owner", "moderator"].includes(member.role))
    return NextResponse.json({ error: "Apenas owner/moderador." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const members = await db.circleMember.findMany({
    where: { circleId: params.id, status },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const actor = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (!actor || !["owner", "moderator"].includes(actor.role))
    return NextResponse.json({ error: "Apenas owner/moderador pode adicionar membros." }, { status: 403 });

  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "Username ou e-mail obrigatório." }, { status: 400 });

  const q = query.trim().toLowerCase().replace(/^@/, "");

  const targetUser = await db.user.findFirst({
    where: { OR: [{ email: q }, { username: q }] },
  });
  if (!targetUser)
    return NextResponse.json({ error: "Usuário não encontrado. Verifique o @username ou e-mail." }, { status: 404 });

  const circle = await db.circle.findUnique({
    where: { id: params.id },
    include: { _count: { select: { members: { where: { status: "active" } } } } },
  });
  if (!circle) return NextResponse.json({ error: "Circle não encontrado." }, { status: 404 });
  if (circle._count.members >= circle.maxMembers)
    return NextResponse.json({ error: "Circle já está no limite de membros." }, { status: 400 });

  const existing = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: targetUser.id } },
  });

  if (existing) {
    if (existing.status === "active")
      return NextResponse.json({ error: "Usuário já é membro ativo." }, { status: 409 });
    if (existing.status === "invited")
      return NextResponse.json({ error: "Convite já enviado. Aguardando resposta." }, { status: 409 });
  }

  const invitor = await db.user.findUnique({ where: { id: session.sub }, select: { name: true } });
  const inviteToken = randomUUID();

  if (existing) {
    await db.circleMember.update({
      where: { id: existing.id },
      data: { status: "invited", inviteToken },
    });
  } else {
    await db.circleMember.create({
      data: { circleId: params.id, userId: targetUser.id, role: "member", status: "invited", inviteToken },
    });
  }

  await sendCircleInviteEmail(
    targetUser.email,
    targetUser.name,
    invitor?.name ?? "Alguém",
    circle.name,
    circle.description,
    inviteToken
  );

  return NextResponse.json({ invited: true, name: targetUser.name, email: targetUser.email }, { status: 201 });
}
