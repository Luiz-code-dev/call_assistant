import { NextResponse } from "next/server";
import { findInviteByToken } from "@/lib/escola/invite";
import { prismaEdu } from "@/lib/escola/db";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  try {
    const invite = await findInviteByToken(params.token);
    if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
    if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 409 });

    const network = invite.networkId
      ? await prismaEdu.eduNetwork.findUnique({ where: { id: invite.networkId }, select: { name: true } })
      : null;

    return NextResponse.json({
      id: invite.id, name: invite.name, email: invite.email,
      role: invite.role, networkName: network?.name ?? null, expiresAt: invite.expiresAt,
      hasAccount: !!invite.userId,
    });
  } catch (err) {
    console.error("[convite/GET]", err);
    return NextResponse.json({ error: "Erro interno ao buscar convite" }, { status: 500 });
  }
}
