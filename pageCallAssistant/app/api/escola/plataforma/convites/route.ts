import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { generateInviteToken, sendInviteEmail, registerStaffInviteInCatalog } from "@/lib/escola/invite";
import { assertCanInvite, InvitePermissionError } from "@/lib/escola/roles";
import type { EduRole } from "@/lib/escola/types";

function flag() {
  return isEscolasEnabled();
}

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status === "pending") where["acceptedAt"] = null;
  else if (status === "accepted") where["acceptedAt"] = { not: null };

  const invites = await prismaEdu.eduInvite.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      sentCount: true,
      expiresAt: true,
      acceptedAt: true,
      createdAt: true,
      networkId: true,
    },
  });
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { name, email, role, networkId } = body as {
    name: string;
    email: string;
    role: EduRole;
    networkId?: string;
  };

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Campos obrigatórios: name, email, role." }, { status: 400 });
  }

  try {
    assertCanInvite("PLATFORM_ADMIN", role);
  } catch (err) {
    if (err instanceof InvitePermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  let networkName = "SpeakFlow Escolas";
  let resolvedNetworkId: string | null = null;

  if (role === "NETWORK_ADMIN") {
    if (!networkId) {
      return NextResponse.json(
        { error: "Selecione a rede para a qual o gestor será convidado." },
        { status: 400 }
      );
    }
    const network = await prismaEdu.eduNetwork.findUnique({
      where: { id: networkId },
      select: { id: true, name: true },
    });
    if (!network) {
      return NextResponse.json({ error: "Rede não encontrada." }, { status: 404 });
    }
    networkName = network.name;
    resolvedNetworkId = network.id;
  }

  const emailLower = email.toLowerCase();

  const existing = await prismaEdu.eduInvite.findFirst({
    where: {
      email: emailLower,
      role,
      acceptedAt: null,
      ...(resolvedNetworkId ? { networkId: resolvedNetworkId } : {}),
    },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: `Já existe um convite pendente para ${email}. Reenvie em Convites.`,
        code: "INVITE_PENDING",
        inviteId: existing.id,
      },
      { status: 409 }
    );
  }

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const user = await prismaEdu.eduUser.findFirst({
    where: { email: emailLower },
    select: { id: true },
  }).catch(() => null);

  await prismaEdu.eduInvite.create({
    data: {
      networkId: resolvedNetworkId,
      schoolId: null,
      email: emailLower,
      name,
      role,
      tokenHash: hash,
      expiresAt,
      userId: user?.id ?? null,
      createdById: ctx.userId,
    },
  });

  if (resolvedNetworkId) await registerStaffInviteInCatalog(hash, resolvedNetworkId, expiresAt).catch(() => null);
  await sendInviteEmail(email, name, raw, networkName);

  return NextResponse.json({ status: "sent" }, { status: 201 });
}
