import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { rotaDoPapel } from "@/lib/escola/context";
import { staffSecret } from "@/lib/escola/secrets";

const bodySchema = z.object({ membershipId: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pendingUid = req.cookies.get("sf_edu_pending_uid")?.value;
  if (!pendingUid) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { membershipId } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = await (db as any).eduMembership.findFirst({
    where: { id: membershipId, userId: pendingUid, isActive: true, network: { isActive: true } },
    select: { id: true, userId: true, networkId: true, schoolId: true, role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Vínculo inválido ou inativo." }, { status: 403 });
  }

  const token = await new SignJWT({
    sub: membership.userId,
    mid: membership.id,
    nid: membership.networkId,
    sid: membership.schoolId ?? undefined,
    role: membership.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(staffSecret());

  const res = NextResponse.json({ ok: true, redirect: rotaDoPapel(membership.role) });

  res.cookies.set("sf_edu_ctx", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  res.cookies.set("sf_edu_last", membership.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  res.cookies.delete("sf_edu_pending_uid");

  return res;
}
