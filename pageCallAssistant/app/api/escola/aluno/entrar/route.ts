/**
 * Student login endpoint — supports three modes:
 *   "aula"   - Session code already validated; studentId + PIN/picture
 *   "manual" - accessCode (turma) + enrollmentCode + PIN
 *   "qr"     - QR token (signed JWT) + PIN
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { studentSecret } from "@/lib/escola/secrets";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function issueStudentToken(student: { id: string; networkId: string }, classId: string, enrollmentId: string) {
  return new SignJWT({ sub: student.id, nid: student.networkId, cid: classId, eid: enrollmentId })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15h").sign(studentSecret());
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const { mode, pin, pictureSequence } = body;

  let student: { id: string; networkId: string; pinHash: string; pictureSecretHash: string | null; loginMode: string; pinFailedCount: number; pinLockedUntil: Date | null; isActive: boolean } | null = null;
  let classId: string | null = null;
  let enrollmentId: string | null = null;

  if (mode === "aula") {
    const { studentId, sessionId } = body;
    if (!studentId || !sessionId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const session = await prismaEdu.eduClassSession.findUnique({ where: { id: sessionId } });
    if (!session || session.closedAt || session.expiresAt < new Date()) return NextResponse.json({ error: "Sessão inválida ou encerrada" }, { status: 400 });

    const enrollment = await prismaEdu.eduEnrollment.findFirst({ where: { studentId, classId: session.classId, status: "ACTIVE" } });
    if (!enrollment) return NextResponse.json({ error: "Aluno não encontrado nesta turma" }, { status: 404 });

    student = await prismaEdu.eduStudent.findUnique({ where: { id: studentId } });
    classId = session.classId;
    enrollmentId = enrollment.id;

  } else if (mode === "manual") {
    const { accessCode, enrollmentCode } = body;
    if (!accessCode || !enrollmentCode) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const cls = await prismaEdu.eduClass.findUnique({ where: { accessCode: accessCode.toUpperCase() } });
    if (!cls) return NextResponse.json({ error: "Código de turma inválido" }, { status: 404 });

    student = await prismaEdu.eduStudent.findFirst({ where: { networkId: cls.networkId, enrollmentCode, isActive: true } });
    if (!student) return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });

    const enrollment = await prismaEdu.eduEnrollment.findFirst({ where: { studentId: student.id, classId: cls.id, status: "ACTIVE" } });
    if (!enrollment) return NextResponse.json({ error: "Aluno não está matriculado nesta turma" }, { status: 403 });

    classId = cls.id;
    enrollmentId = enrollment.id;

  } else if (mode === "qr") {
    const { qrToken } = body;
    if (!qrToken) return NextResponse.json({ error: "Token QR ausente" }, { status: 400 });
    try {
      const { payload } = await jwtVerify(qrToken, studentSecret());
      const { studentId, cardVersion } = payload as { studentId: string; cardVersion: number };
      const s = await prismaEdu.eduStudent.findUnique({ where: { id: studentId } });
      if (!s || s.cardVersion !== cardVersion) return NextResponse.json({ error: "Cartão revogado" }, { status: 401 });
      student = s;
      const enrollment = await prismaEdu.eduEnrollment.findFirst({ where: { studentId: s.id, status: "ACTIVE" }, orderBy: { startedAt: "desc" } });
      if (!enrollment) return NextResponse.json({ error: "Aluno sem turma ativa" }, { status: 403 });
      classId = enrollment.classId;
      enrollmentId = enrollment.id;
    } catch {
      return NextResponse.json({ error: "QR inválido" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Modo inválido. Use: aula, manual, qr" }, { status: 400 });
  }

  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  // Check lock
  if (student.pinLockedUntil && student.pinLockedUntil > new Date()) {
    const remaining = Math.ceil((student.pinLockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json({ error: `PIN bloqueado. Aguarde ${remaining} minuto${remaining !== 1 ? "s" : ""} ou peça ao professor para desbloquear.` }, { status: 429 });
  }

  // Verify credential
  let credOk = false;
  if (student.loginMode === "PICTURE" && pictureSequence) {
    credOk = student.pictureSecretHash ? await bcrypt.compare(pictureSequence.join(","), student.pictureSecretHash) : false;
  } else if (pin) {
    credOk = await bcrypt.compare(String(pin), student.pinHash);
  }

  if (!credOk) {
    const newCount = student.pinFailedCount + 1;
    const locked = newCount >= MAX_ATTEMPTS;
    await prismaEdu.eduStudent.update({
      where: { id: student.id },
      data: { pinFailedCount: newCount, pinLockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null },
    });
    const remaining = MAX_ATTEMPTS - newCount;
    const msg = locked ? "PIN bloqueado por 15 minutos. Peça ao professor para desbloquear." : `PIN incorreto. Você ainda tem ${remaining} tentativa${remaining !== 1 ? "s" : ""}.`;
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // Success — reset counter
  await prismaEdu.eduStudent.update({ where: { id: student.id }, data: { pinFailedCount: 0, pinLockedUntil: null } });

  const token = await issueStudentToken(student, classId!, enrollmentId!);
  const res = NextResponse.json({ ok: true, redirect: "/escola/aluno/painel" });
  res.cookies.set("sf_edu_student", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 15 * 3600 });
  return res;
}
