import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { studentSecret } from "@/lib/escola/secrets";

const bodySchema = z.object({
  accessCode: z.string().min(1),
  enrollmentCode: z.string().min(1),
  pin: z.string().length(6),
});

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { accessCode, enrollmentCode, pin } = parsed.data;

  const cls = await db.eduClass.findUnique({
    where: { accessCode },
    select: { id: true, networkId: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  }

  const student = await db.eduStudent.findUnique({
    where: { networkId_enrollmentCode: { networkId: cls.networkId, enrollmentCode } },
    select: {
      id: true,
      pinHash: true,
      pinFailedCount: true,
      pinLockedUntil: true,
      isActive: true,
    },
  });
  if (!student || !student.isActive) {
    return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  }

  const now = new Date();
  if (student.pinLockedUntil && student.pinLockedUntil > now) {
    const minutes = Math.ceil((student.pinLockedUntil.getTime() - now.getTime()) / 60000);
    return NextResponse.json(
      { error: `Acesso bloqueado. Tente novamente em ${minutes} min.` },
      { status: 429 }
    );
  }

  const validPin = await bcrypt.compare(pin, student.pinHash);
  if (!validPin) {
    const failedCount = student.pinFailedCount + 1;
    const locked = failedCount >= PIN_MAX_ATTEMPTS;
    await db.eduStudent.update({
      where: { id: student.id },
      data: {
        pinFailedCount: failedCount,
        pinLockedUntil: locked
          ? new Date(now.getTime() + PIN_LOCK_MINUTES * 60 * 1000)
          : null,
      },
    });
    return NextResponse.json(
      { error: locked ? "PIN bloqueado por excesso de tentativas" : "PIN inválido" },
      { status: 401 }
    );
  }

  await db.eduStudent.update({
    where: { id: student.id },
    data: { pinFailedCount: 0, pinLockedUntil: null },
  });

  const enrollment = await db.eduEnrollment.findFirst({
    where: { studentId: student.id, classId: cls.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Matrícula inativa nesta turma" }, { status: 403 });
  }

  const token = await new SignJWT({
    sub: student.id,
    nid: cls.networkId,
    eid: enrollment.id,
    cid: cls.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(studentSecret());

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sf_edu_student", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
    path: "/",
  });
  return res;
}
