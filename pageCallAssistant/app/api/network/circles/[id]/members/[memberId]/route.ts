import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNetworkSession } from "../../../../_auth";
import { sendCircleRemovalEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const session = await getNetworkSession(req);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const actor = await db.circleMember.findUnique({
    where: { circleId_userId: { circleId: params.id, userId: session.sub } },
  });
  if (!actor || !["owner", "moderator"].includes(actor.role))
    return NextResponse.json({ error: "Apenas owner/moderador." }, { status: 403 });

  const target = await db.circleMember.findUnique({ where: { id: params.memberId } });
  if (!target || target.circleId !== params.id)
    return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  const { action, role } = await req.json();

  if (action === "approve") {
    const updated = await db.circleMember.update({
      where: { id: params.memberId },
      data: { status: "active" },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
    return NextResponse.json(updated);
  }

  if (action === "reject" || action === "remove") {
    if (target.userId === session.sub)
      return NextResponse.json({ error: "Não pode remover a si mesmo." }, { status: 400 });
    const [circle, removedUser] = await Promise.all([
      db.circle.findUnique({ where: { id: params.id }, select: { name: true, ownerId: true } }),
      db.user.findUnique({ where: { id: target.userId }, select: { name: true, email: true } }),
    ]);
    if (circle?.ownerId === target.userId)
      return NextResponse.json({ error: "Owner não pode ser removido." }, { status: 400 });
    await db.circleMember.update({ where: { id: params.memberId }, data: { status: "removed" } });
    if (action === "remove" && removedUser && circle) {
      sendCircleRemovalEmail(removedUser.email, removedUser.name, circle.name).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "set_role") {
    if (!["moderator", "member"].includes(role))
      return NextResponse.json({ error: "Role inválida." }, { status: 400 });
    if (actor.role !== "owner")
      return NextResponse.json({ error: "Apenas owner pode alterar roles." }, { status: 403 });
    const updated = await db.circleMember.update({
      where: { id: params.memberId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Ação inválida. Use: approve, reject, remove, set_role." }, { status: 400 });
}
