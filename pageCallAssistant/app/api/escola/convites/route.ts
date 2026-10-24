import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { generateInviteToken, sendInviteEmail } from "@/lib/escola/invite";
import { assertCanInvite, InvitePermissionError } from "@/lib/escola/roles";
import type { EduRole } from "@/lib/escola/types";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "pending" | "accepted" | "all"

  const where: Record<string, unknown> = { networkId: ctx.networkId };
  if (ctx.role === "SCHOOL_ADMIN" && ctx.schoolId) where["schoolId"] = ctx.schoolId;
  if (status === "pending") where["acceptedAt"] = null;
  else if (status === "accepted") where["acceptedAt"] = { not: null };

  const invites = await prismaEdu.eduInvite.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, email: true, name: true, role: true, sentCount: true, expiresAt: true, acceptedAt: true, createdAt: true, schoolId: true },
  });
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  // Accept single or batch { invites: [{email,name,role,schoolId?}] }
  const items: { email: string; name: string; role: EduRole; schoolId?: string }[] = body.invites ?? [body];

  const network = await prismaEdu.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { name: true } });
  const networkName = network?.name ?? "SpeakFlow Escolas";

  const results = [];
  for (const item of items) {
    const { email, name, role, schoolId } = item;
    if (!email || !name || !role) { results.push({ email, error: "Campos obrigatórios faltando" }); continue; }

    try {
      assertCanInvite(ctx.role, role);
    } catch (err) {
      if (err instanceof InvitePermissionError) {
        results.push({ email, error: err.message });
        continue;
      }
      throw err;
    }

    // Check if already has an active invite
    const existing = await prismaEdu.eduInvite.findFirst({ where: { networkId: ctx.networkId, email: email.toLowerCase(), acceptedAt: null } });
    if (existing) {
      // Resend
      const { raw, hash } = generateInviteToken();
      await prismaEdu.eduInvite.update({
        where: { id: existing.id },
        data: { tokenHash: hash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), sentCount: existing.sentCount + 1, role, schoolId: schoolId ?? null },
      });
      await sendInviteEmail(email, name, raw, networkName);
      results.push({ email, status: "resent" });
      continue;
    }

    const { raw, hash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const user = await prismaEdu.user.findFirst({ where: { email: email.toLowerCase() } });
    await prismaEdu.eduInvite.create({
      data: { networkId: ctx.networkId, schoolId: schoolId ?? null, email: email.toLowerCase(), name, role, tokenHash: hash, expiresAt, userId: user?.id ?? null, createdById: ctx.userId },
    });
    await sendInviteEmail(email, name, raw, networkName);
    results.push({ email, status: "sent" });
  }

  return NextResponse.json({ results }, { status: 201 });
}
