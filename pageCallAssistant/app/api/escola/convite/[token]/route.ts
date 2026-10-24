import { NextResponse } from "next/server";
import { findInviteByToken } from "@/lib/escola/invite";
import { prismaEdu } from "@/lib/escola/db";
import { resolveInviteMode } from "@/lib/escola/invite-account";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  try {
    const invite = await findInviteByToken(params.token);
    if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
    if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 409 });

    const [network, { mode }] = await Promise.all([
      invite.networkId
        ? prismaEdu.eduNetwork.findUnique({ where: { id: invite.networkId }, select: { name: true } })
        : Promise.resolve(null),
      resolveInviteMode(invite.email, invite.userId),
    ]);

    return NextResponse.json({
      id: invite.id, name: invite.name, email: invite.email,
      role: invite.role, networkName: network?.name ?? null, expiresAt: invite.expiresAt,
      mode,
    });
  } catch (err) {
    console.error("[convite/GET]", err);
    return NextResponse.json({ error: "Erro interno ao buscar convite" }, { status: 500 });
  }
}
