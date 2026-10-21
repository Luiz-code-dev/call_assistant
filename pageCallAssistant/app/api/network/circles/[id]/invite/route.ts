import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (!member || !["owner", "moderator"].includes(member.role))
    return NextResponse.json({ error: "Apenas owner/moderador pode gerar convites." }, { status: 403 });

  const token = randomUUID();
  const circle = await db.circle.update({
    where: { id: params.id },
    data: { inviteToken: token },
    select: { id: true, name: true, inviteToken: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://speakf.com.br";
  return NextResponse.json({
    token,
    url: `${appUrl}/network/join/${token}`,
    circleName: circle.name,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (!member || !["owner", "moderator"].includes(member.role))
    return NextResponse.json({ error: "Apenas owner/moderador pode revogar convites." }, { status: 403 });

  await db.circle.update({ where: { id: params.id }, data: { inviteToken: null } });
  return NextResponse.json({ ok: true });
}
