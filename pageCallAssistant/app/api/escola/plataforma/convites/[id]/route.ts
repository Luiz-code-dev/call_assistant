import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { generateInviteToken, sendInviteEmail } from "@/lib/escola/invite";

function flag() {
  return process.env.FEATURE_ESCOLAS === "true";
}

async function getInvite(id: string) {
  return prismaEdu.eduInvite.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      networkId: true,
      acceptedAt: true,
      expiresAt: true,
      sentCount: true,
      tokenHash: true,
    },
  });
}

/** GET /api/escola/plataforma/convites/[id] — devolve link com token renovado */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const invite = await getInvite(id);
  if (!invite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já aceito" }, { status: 409 });

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prismaEdu.eduInvite.update({
    where: { id },
    data: { tokenHash: hash, expiresAt },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://speakflow.ia.br";

  return NextResponse.json({ link: `${base}/escola/convite/${raw}` });
}

/** POST /api/escola/plataforma/convites/[id] — reenvia e-mail */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const invite = await getInvite(id);
  if (!invite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já aceito" }, { status: 409 });

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let networkName = "SpeakFlow Escolas";
  if (invite.networkId) {
    const network = await prismaEdu.eduNetwork.findUnique({
      where: { id: invite.networkId },
      select: { name: true },
    });
    networkName = network?.name ?? networkName;
  }

  await prismaEdu.eduInvite.update({
    where: { id },
    data: { tokenHash: hash, expiresAt, sentCount: invite.sentCount + 1 },
  });

  await sendInviteEmail(invite.email, invite.name, raw, networkName);

  return NextResponse.json({ status: "resent" });
}

/** DELETE /api/escola/plataforma/convites/[id] — cancela convite */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const invite = await getInvite(id);
  if (!invite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "Convite já aceito, não pode cancelar" }, { status: 409 });

  await prismaEdu.eduInvite.delete({ where: { id } });

  return NextResponse.json({ status: "cancelled" });
}
