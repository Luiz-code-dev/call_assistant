import { NextResponse } from "next/server";
import { findInviteByToken } from "@/lib/escola/invite";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { resolveInviteMode } from "@/lib/escola/invite-account";
import { findTenantByInviteHash } from "@/lib/escola/catalogo";
import crypto from "crypto";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  try {
    const invite = await findInviteByToken(params.token);
    if (!invite) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
    if (invite.acceptedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 409 });

    // Resolve rede para buscar nome (findInviteByToken já usou catálogo)
    const hash = crypto.createHash("sha256").update(params.token).digest("hex");
    const idx = await findTenantByInviteHash(hash);
    let networkName: string | null = null;
    if (invite.networkId && idx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = await getTenantDb(idx.tenantId) as any;
      const net = await db.eduNetwork.findUnique({ where: { id: invite.networkId }, select: { name: true } });
      networkName = net?.name ?? null;
    }

    const { mode } = await resolveInviteMode(invite.email, invite.userId);

    return NextResponse.json({
      id: invite.id, name: invite.name, email: invite.email,
      role: invite.role, networkName, expiresAt: invite.expiresAt,
      mode,
    });
  } catch (err) {
    console.error("[convite/GET]", err);
    return NextResponse.json({ error: "Erro interno ao buscar convite" }, { status: 500 });
  }
}
