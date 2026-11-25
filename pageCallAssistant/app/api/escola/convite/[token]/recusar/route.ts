/**
 * O profissional de apoio recusa o cadastro e pede a exclusão dos dados.
 * O link do convite é pessoal: só mexe no cadastro ligado a este convite.
 * Efeito imediato: o número do registro é apagado, o convite deixa de valer e a secretaria é avisada.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { findInviteByToken, deregisterInviteFromCatalog, hashToken } from "@/lib/escola/invite";
import { findTenantByInviteHash } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";
import { remetenteFamilia } from "@/lib/escola/email-familia";
import { urlDoSite } from "@/lib/escola/public-url";
import { emailRecusaAoGestor } from "@/lib/escola/apoio-profissional";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const invite = await findInviteByToken(params.token);
  if (!invite || invite.role !== "SUPPORT") return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Este convite já foi aceito. Para sair da equipe, fale com a Secretaria de Educação." }, { status: 409 });

  const tokenHash = hashToken(params.token);
  const idx = await findTenantByInviteHash(tokenHash);
  if (!idx) return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 });
  const db = (await getTenantDb(idx.tenantId)) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const cadastro = await db.eduApoioCadastro.findFirst({ where: { inviteId: invite.id }, select: { id: true, name: true, declaradoPorId: true, networkId: true } });
  if (cadastro) {
    await db.eduApoioCadastro.update({
      where: { id: cadastro.id },
      data: { status: "RECUSOU", recusadoEm: new Date(), registro: "", uf: "", situacaoNoConselho: null, inviteId: null },
    });
    await db.eduAuditLog.create({
      data: { networkId: cadastro.networkId, actorType: "user", actorId: cadastro.id, action: "apoio.profissional.recusou", entity: "EduApoioCadastro", entityId: cadastro.id },
    }).catch(() => null);
  }
  await deregisterInviteFromCatalog(tokenHash).catch(() => null);
  await db.eduInvite.delete({ where: { id: invite.id } }).catch(() => null);

  // Aviso a quem fez o cadastro, para concluir a exclusão
  const key = process.env.RESEND_API_KEY;
  if (key && cadastro) {
    const gestor = await db.eduUser.findUnique({ where: { id: cadastro.declaradoPorId }, select: { email: true } }).catch(() => null);
    if (gestor?.email) {
      const msg = emailRecusaAoGestor(cadastro.name, urlDoSite());
      await new Resend(key).emails.send({ from: remetenteFamilia(), to: gestor.email, subject: msg.subject, text: msg.text }).catch(() => null);
    }
  }
  return NextResponse.json({ ok: true });
}
