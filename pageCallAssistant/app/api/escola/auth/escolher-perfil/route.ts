import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { rotaDoPapel } from "@/lib/escola/context";
import { signStaffToken, staffCookieOptions, STAFF_SESSION_SECONDS, verifyPendingStaffToken } from "@/lib/escola/staff-session";
import { isAppClient, APP_STAFF_SECONDS, bearerToken } from "@/lib/escola/app-auth";

const bodySchema = z.object({ membershipId: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appClient = isAppClient();
  const staffSeconds = appClient ? APP_STAFF_SECONDS : STAFF_SESSION_SECONDS;

  // App: token pendente no Bearer. Web: cookie de escolha pendente.
  const bearer = bearerToken();
  const pendingUid = bearer ? await verifyPendingStaffToken(bearer) : req.cookies.get("sf_edu_pending_uid")?.value;
  if (!pendingUid) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { membershipId } = parsed.data;

  // PLATFORM_ADMIN
  if (membershipId === "platform") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await (db as any).eduPlatformAdmin.findUnique({ where: { userId: pendingUid }, select: { isActive: true } });
    if (!admin?.isActive) return NextResponse.json({ error: "Acesso de plataforma inativo." }, { status: 403 });
    const token = await signStaffToken({ userId: pendingUid, role: "PLATFORM_ADMIN" }, staffSeconds);
    const res = NextResponse.json({ ok: true, redirect: rotaDoPapel("PLATFORM_ADMIN"), ...(appClient ? { token } : {}) });
    res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
    res.cookies.set("sf_edu_last", "platform", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
    res.cookies.delete("sf_edu_pending_uid");
    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = await (db as any).eduMembership.findFirst({
    where: { id: membershipId, userId: pendingUid, isActive: true, network: { isActive: true } },
    select: { id: true, userId: true, networkId: true, schoolId: true, role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Vínculo inválido ou inativo." }, { status: 403 });
  }

  const token = await signStaffToken({ userId: membership.userId, role: membership.role, membershipId: membership.id, networkId: membership.networkId, schoolId: membership.schoolId }, staffSeconds);

  const res = NextResponse.json({ ok: true, redirect: rotaDoPapel(membership.role), ...(appClient ? { token } : {}) });

  res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
  res.cookies.set("sf_edu_last", membership.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  res.cookies.delete("sf_edu_pending_uid");

  return res;
}
