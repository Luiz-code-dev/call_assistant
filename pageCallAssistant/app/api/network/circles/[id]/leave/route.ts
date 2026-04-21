import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../_auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const member = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (!member || member.status !== "active")
    return NextResponse.json({ error: "Você não é membro deste Circle." }, { status: 404 });
  if (member.role === "owner")
    return NextResponse.json({ error: "O owner não pode sair. Transfira a ownership primeiro." }, { status: 400 });

  await db.circleMember.update({ where: { id: member.id }, data: { status: "removed" } });
  return NextResponse.json({ ok: true });
}
