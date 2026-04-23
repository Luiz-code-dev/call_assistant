import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../_auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const target = await db.submission.findUnique({ where: { id: params.id } });
  if (!target || target.userId !== session.sub)
    return NextResponse.json({ error: "Tentativa não encontrada." }, { status: 404 });

  const { action } = await req.json().catch(() => ({}));

  if (action === "select") {
    await db.submission.updateMany({
      where: { userId: session.sub, challengeId: target.challengeId },
      data: { isSelected: false },
    });
    await db.submission.update({ where: { id: params.id }, data: { isSelected: true } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const target = await db.submission.findUnique({ where: { id: params.id } });
  if (!target || target.userId !== session.sub)
    return NextResponse.json({ error: "Tentativa não encontrada." }, { status: 404 });

  await db.submission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
