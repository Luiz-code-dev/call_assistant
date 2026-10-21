import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { rotaDoPapel } from "@/lib/escola/context";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const secret = new TextEncoder().encode(
  process.env.EDU_STUDENT_JWT_SECRET || "edu-student-dev-secret"
);

async function buildCtxToken(userId: string, membershipId: string, networkId: string, schoolId: string | null, role: string) {
  return new SignJWT({ sub: userId, mid: membershipId, nid: networkId, sid: schoolId ?? undefined, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, password: true, emailVerified: true },
  });
  if (!user || !user.emailVerified) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password ?? "");
  if (!valid) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const memberships = await db.eduMembership.findMany({
    where: { userId: user.id, isActive: true, network: { isActive: true } },
    select: { id: true, role: true, schoolId: true, networkId: true },
    orderBy: [{ networkId: "asc" }, { schoolId: "asc" }],
  });

  if (memberships.length === 0) {
    return NextResponse.json(
      { error: "Seu e-mail não está vinculado a nenhuma rede de ensino. Fale com a Secretaria." },
      { status: 403 }
    );
  }

  let chosen = memberships[0];

  if (memberships.length > 1) {
    const lastId = req.cookies.get("sf_edu_last")?.value;
    const lastMatch = lastId ? memberships.find((m) => m.id === lastId) : null;
    if (lastMatch) {
      chosen = lastMatch;
    } else {
      const res = NextResponse.json({ ok: true, redirect: "/escola/escolher-perfil" });
      res.cookies.set("sf_edu_pending_uid", user.id, {
        httpOnly: true, secure: process.env.NODE_ENV === "production",
        sameSite: "lax", maxAge: 60 * 5, path: "/",
      });
      return res;
    }
  }

  const token = await buildCtxToken(user.id, chosen.id, chosen.networkId, chosen.schoolId, chosen.role);

  const res = NextResponse.json({ ok: true, redirect: rotaDoPapel(chosen.role) });
  res.cookies.set("sf_edu_ctx", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  res.cookies.set("sf_edu_last", chosen.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
