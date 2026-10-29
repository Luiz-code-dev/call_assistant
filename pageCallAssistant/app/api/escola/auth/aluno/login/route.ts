import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { studentSecret } from "@/lib/escola/secrets";
import { isAppClient, APP_STUDENT_SECONDS } from "@/lib/escola/app-auth";
import { findTenantByCode } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";

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
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { accessCode, enrollmentCode, pin } = parsed.data;

  // 1. Resolve a rede pelo código de turma (CodeIndex no catálogo)
  const tenantId = await findTenantByCode(accessCode);
  if (!tenantId) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  // 2. Usa a base da rede correta
  const db = await getTenantDb(tenantId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = db as any;

  const cls = await P.eduClass.findFirst({
    where: { accessCode, networkId: tenantId },
    select: { id: true, networkId: true },
  });
  if (!cls) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const student = await P.eduStudent.findUnique({
    where: { networkId_enrollmentCode: { networkId: cls.networkId, enrollmentCode } },
    select: { id: true, pinHash: true, pinFailedCount: true, pinLockedUntil: true, isActive: true },
  });
  if (!student || !student.isActive) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const now = new Date();
  if (student.pinLockedUntil && student.pinLockedUntil > now) {
    const minutes = Math.ceil((student.pinLockedUntil.getTime() - now.getTime()) / 60000);
    return NextResponse.json({ error: `Acesso bloqueado. Tente novamente em ${minutes} min.` }, { status: 429 });
  }

  const validPin = await bcrypt.compare(pin, student.pinHash);
  if (!validPin) {
    const failedCount = student.pinFailedCount + 1;
    const locked = failedCount >= PIN_MAX_ATTEMPTS;
    await P.eduStudent.update({
      where: { id: student.id },
      data: { pinFailedCount: failedCount, pinLockedUntil: locked ? new Date(now.getTime() + PIN_LOCK_MINUTES * 60 * 1000) : null },
    });
    return NextResponse.json({ error: locked ? "PIN bloqueado por excesso de tentativas" : "PIN inválido" }, { status: 401 });
  }

  await P.eduStudent.update({ where: { id: student.id }, data: { pinFailedCount: 0, pinLockedUntil: null } });

  const enrollment = await P.eduEnrollment.findFirst({
    where: { studentId: student.id, classId: cls.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) return NextResponse.json({ error: "Matrícula inativa nesta turma" }, { status: 403 });

  const appClient = isAppClient();
  const studentSeconds = appClient ? APP_STUDENT_SECONDS : 60 * 60 * 4;
  const token = await new SignJWT({ sub: student.id, nid: cls.networkId, eid: enrollment.id, cid: cls.id })
    .setProtectedHeader({ alg: "HS256" }).setAudience("student").setIssuedAt()
    .setExpirationTime(`${studentSeconds}s`).sign(studentSecret());

  const res = NextResponse.json({ ok: true, ...(appClient ? { token } : {}) });
  res.cookies.set("sf_edu_student", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: studentSeconds, path: "/" });
  return res;
}
