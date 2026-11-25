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
    let apoio: Record<string, unknown> | null = null;
    if (invite.networkId && idx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = await getTenantDb(idx.tenantId) as any;
      const net = await db.eduNetwork.findUnique({ where: { id: invite.networkId }, select: { name: true } });
      networkName = net?.name ?? null;
      // Profissional de apoio: mostra só o cadastro ligado a este convite, que é o da própria pessoa
      if (invite.role === "SUPPORT") {
        const c = await db.eduApoioCadastro.findFirst({ where: { inviteId: invite.id, status: "CONVIDADO" }, select: { funcao: true, conselho: true, registro: true, uf: true, schoolIds: true, verificacao: true } });
        if (!c) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
        const escolas: { name: string }[] = c.schoolIds.length ? await db.eduSchool.findMany({ where: { id: { in: c.schoolIds } }, select: { name: true }, orderBy: { name: "asc" } }) : [];
        apoio = { funcao: c.funcao, conselho: c.conselho, registro: c.registro, uf: c.uf, verificacao: c.verificacao, atende: escolas.length ? escolas.map((e) => e.name).join(", ") : "Toda a rede" };
      }
    }

    const { mode } = await resolveInviteMode(invite.email, invite.userId);

    return NextResponse.json({
      id: invite.id, name: invite.name, email: invite.email,
      role: invite.role, networkName, expiresAt: invite.expiresAt,
      mode,
      apoio,
    });
  } catch (err) {
    console.error("[convite/GET]", err);
    return NextResponse.json({ error: "Erro interno ao buscar convite" }, { status: 500 });
  }
}
