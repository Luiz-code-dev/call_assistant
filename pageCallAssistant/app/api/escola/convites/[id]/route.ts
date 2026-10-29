import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { generateInviteToken, sendInviteEmail, registerStaffInviteInCatalog } from "@/lib/escola/invite";

function flag() { return isEscolasEnabled(); }

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const invite = await prismaEdu.eduInvite.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!invite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já aceito não pode ser cancelado" }, { status: 400 });

  await prismaEdu.eduInvite.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Resend single invite
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const invite = await prismaEdu.eduInvite.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!invite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já aceito" }, { status: 400 });

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prismaEdu.eduInvite.update({
    where: { id: params.id },
    data: { tokenHash: hash, expiresAt, sentCount: invite.sentCount + 1 },
  });
  await registerStaffInviteInCatalog(hash, ctx.networkId, expiresAt).catch(() => null);
  const network = await prismaEdu.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { name: true } });
  await sendInviteEmail(invite.email, invite.name, raw, network?.name ?? "SpeakFlow Escolas");
  return NextResponse.json({ ok: true });
}
