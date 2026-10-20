import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  networkId: z.string().min(1),
});

const secret = new TextEncoder().encode(
  process.env.EDU_STUDENT_JWT_SECRET || "edu-student-dev-secret"
);

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { email, password, networkId } = parsed.data;

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

  const membership = await db.eduMembership.findFirst({
    where: { userId: user.id, networkId, isActive: true },
    select: { id: true, role: true, schoolId: true, networkId: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Sem acesso a esta rede" }, { status: 403 });
  }

  const token = await new SignJWT({
    sub: user.id,
    mid: membership.id,
    nid: membership.networkId,
    sid: membership.schoolId ?? undefined,
    role: membership.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  const res = NextResponse.json({ ok: true, role: membership.role });
  res.cookies.set("sf_edu_ctx", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return res;
}
