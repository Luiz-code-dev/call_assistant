import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { rotaDoPapel } from "@/lib/escola/context";
import { signStaffToken, signPendingStaffToken, staffCookieOptions, STAFF_SESSION_SECONDS } from "@/lib/escola/staff-session";
import { isAppClient, APP_STAFF_SECONDS } from "@/lib/escola/app-auth";
import { findTenantsByLogin, findPlatformAdmin } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const GENERIC = "E-mail ou senha incorretos.";

export async function POST(req: NextRequest) {
  try {
    if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: GENERIC }, { status: 400 });

    const { email, password } = parsed.data;
    const appClient = isAppClient();
    const staffSeconds = appClient ? APP_STAFF_SECONDS : STAFF_SESSION_SECONDS;

    // 1. Busca as redes onde esse e-mail está cadastrado como STAFF
    const tenantIds = await findTenantsByLogin("STAFF", email);

    // 2. Verifica se é admin de plataforma (no catálogo)
    const platformAdmin = await findPlatformAdmin(email);
    const isAdmin = !!(platformAdmin?.isActive);

    // 3. Verifica senha em cada rede onde o e-mail está indexado
    type MembershipRow = { id: string; role: string; schoolId: string | null; networkId: string; user: { id: string; passwordHash: string | null; loginFailedCount: number; loginLockedUntil: Date | null } };
    const allMemberships: MembershipRow[] = [];

    for (const tenantId of tenantIds) {
      try {
        const db = await getTenantDb(tenantId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const members = await (db as any).eduMembership.findMany({
          where: { isActive: true, user: { email: { equals: email, mode: "insensitive" } } },
          select: {
            id: true, role: true, schoolId: true, networkId: true,
            user: { select: { id: true, passwordHash: true, loginFailedCount: true, loginLockedUntil: true } },
          },
        });
        allMemberships.push(...members);
      } catch { /* ignore tenant errors */ }
    }

    const opcoes = allMemberships.length + (isAdmin ? 1 : 0);
    if (opcoes === 0) {
      return NextResponse.json({ error: "Seu e-mail não está vinculado ao SpeakFlow Escolas. Fale com a Secretaria de Educação." }, { status: 403 });
    }

    // 4. Para membros com EduUser: verifica senha (exige passwordHash)
    const validMemberships: MembershipRow[] = [];
    for (const m of allMemberships) {
      if (!m.user?.passwordHash) continue;
      if (m.user.loginLockedUntil && new Date(m.user.loginLockedUntil) > new Date()) continue;
      if (await bcrypt.compare(password, m.user.passwordHash)) validMemberships.push(m);
    }

    // Admin de plataforma: valida no catálogo
    if (isAdmin && platformAdmin?.passwordHash) {
      if (!(await bcrypt.compare(password, platformAdmin.passwordHash))) {
        return NextResponse.json({ error: GENERIC }, { status: 401 });
      }
    }

    if (validMemberships.length === 0 && !(isAdmin && opcoes === 1)) {
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }

    const lastCookie = req.cookies.get("sf_edu_last")?.value;
    const totalOptions = validMemberships.length + (isAdmin ? 1 : 0);

    // Escolha automática
    if (totalOptions === 1) {
      if (isAdmin && validMemberships.length === 0) {
        const token = await signStaffToken({ userId: platformAdmin!.id, role: "PLATFORM_ADMIN" }, staffSeconds);
        const res = NextResponse.json({ ok: true, redirect: rotaDoPapel("PLATFORM_ADMIN"), ...(appClient ? { token } : {}) });
        res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
        return res;
      }
      const chosen = validMemberships[0];
      const token = await signStaffToken({ userId: chosen.user.id, role: chosen.role, membershipId: chosen.id, networkId: chosen.networkId, schoolId: chosen.schoolId }, staffSeconds);
      const res = NextResponse.json({ ok: true, redirect: rotaDoPapel(chosen.role), ...(appClient ? { token } : {}) });
      res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
      res.cookies.set("sf_edu_last", chosen.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
      return res;
    }

    // Lembrar último acesso
    const lastMatch = lastCookie ? validMemberships.find(m => m.id === lastCookie) : null;
    if (lastMatch) {
      const token = await signStaffToken({ userId: lastMatch.user.id, role: lastMatch.role, membershipId: lastMatch.id, networkId: lastMatch.networkId, schoolId: lastMatch.schoolId }, staffSeconds);
      const res = NextResponse.json({ ok: true, redirect: rotaDoPapel(lastMatch.role), ...(appClient ? { token } : {}) });
      res.cookies.set("sf_edu_ctx", token, staffCookieOptions);
      res.cookies.set("sf_edu_last", lastMatch.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
      return res;
    }

    // Múltiplos — escolher perfil
    const pending = appClient ? await signPendingStaffToken(validMemberships[0]?.user.id ?? "") : undefined;
    const res = NextResponse.json({ ok: true, redirect: "/escola/escolher-perfil", ...(appClient ? { needsProfile: true, pending } : {}) });
    if (!appClient) {
      // Salva userId temporário para o fluxo web de escolha
      res.cookies.set("sf_edu_pending_uid", validMemberships[0]?.user.id ?? "", {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 5, path: "/",
      });
    }
    return res;
  } catch (err) {
    console.error("[staff/login]", err);
    return NextResponse.json({ error: "Erro interno ao autenticar" }, { status: 500 });
  }
}
