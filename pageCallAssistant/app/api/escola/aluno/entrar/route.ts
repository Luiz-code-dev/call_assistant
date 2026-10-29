import { isEscolasEnabled } from "@/lib/escola/feature-flag";
/**
 * Student login endpoint — supports three modes:
 *   "aula"       - Session code already validated; studentId + PIN/picture
 *   "manual"     - accessCode (turma) + enrollmentCode + PIN
 *   "qr"         - QR token (signed JWT) + PIN
 *   "dispositivo"- Device cookie (remembered student) + PIN
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { studentSecret } from "@/lib/escola/secrets";
import { STUDENT_COOKIE, DEVICE_COOKIE } from "@/lib/escola/cookies";
import { readDeviceToken, addDeviceStudent, signDeviceToken, studentDisplayParts, DEVICE_MAX_AGE } from "@/lib/escola/device";
import { isAppClient, APP_STUDENT_SECONDS, APP_STUDENT_HOME_SECONDS } from "@/lib/escola/app-auth";
import { findTenantByCode } from "@/lib/escola/catalogo";
import { getTenantDb } from "@/lib/escola/tenant-db";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function issueStudentToken(student: { id: string; networkId: string }, classId: string, enrollmentId: string, seconds: number = APP_STUDENT_SECONDS) {
  return new SignJWT({ sub: student.id, nid: student.networkId, cid: classId, eid: enrollmentId })
    .setProtectedHeader({ alg: "HS256" }).setAudience("student").setIssuedAt().setExpirationTime(`${seconds}s`).sign(studentSecret());
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const { mode, pin, pictureSequence } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let student: any = null;
  let classId: string | null = null;
  let enrollmentId: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any = null;

  if (mode === "aula") {
    const { studentId, sessionId, nid: bodyNid } = body;
    if (!studentId || !sessionId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    // nid pode vir do body (enviado pelo cliente) OU ser resolvido a partir do sessionId
    // via CodeIndex no catálogo. Isso garante compatibilidade com clientes antigos.
    let resolvedNid = bodyNid;
    if (!resolvedNid) {
      // sessionId não está no catálogo, mas o código da sessão sim.
      // Tentamos resolver indiretamente: o sessionId é uma PK uuid — não existe índice
      // por isso. Se o cliente não enviar nid, retornamos erro orientador.
      return NextResponse.json({ error: "Rede não identificada. Atualize o app ou use o código da aula novamente." }, { status: 400 });
    }

    db = await getTenantDb(resolvedNid);
    const session = await db.eduClassSession.findUnique({ where: { id: sessionId } });
    if (!session || session.closedAt || session.expiresAt < new Date()) return NextResponse.json({ error: "Sessão inválida ou encerrada" }, { status: 400 });

    const enrollment = await db.eduEnrollment.findFirst({ where: { studentId, classId: session.classId, status: "ACTIVE" } });
    if (!enrollment) return NextResponse.json({ error: "Aluno não encontrado nesta turma" }, { status: 404 });

    student = await db.eduStudent.findUnique({ where: { id: studentId } });
    classId = session.classId;
    enrollmentId = enrollment.id;

  } else if (mode === "manual") {
    const { accessCode, enrollmentCode } = body;
    if (!accessCode || !enrollmentCode) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    // Resolve rede pelo CodeIndex (CLASS_ACCESS)
    const tenantIdManual = await findTenantByCode(accessCode.toUpperCase().trim());
    if (!tenantIdManual) return NextResponse.json({ error: "Código de turma inválido" }, { status: 404 });

    db = await getTenantDb(tenantIdManual);
    const cls = await db.eduClass.findUnique({ where: { accessCode: accessCode.toUpperCase().trim() } });
    if (!cls) return NextResponse.json({ error: "Código de turma inválido" }, { status: 404 });

    student = await db.eduStudent.findFirst({ where: { networkId: cls.networkId, enrollmentCode, isActive: true } });
    if (!student) return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });

    const enrollment = await db.eduEnrollment.findFirst({ where: { studentId: student.id, classId: cls.id, status: "ACTIVE" } });
    if (!enrollment) return NextResponse.json({ error: "Aluno não está matriculado nesta turma" }, { status: 403 });

    classId = cls.id;
    enrollmentId = enrollment.id;

  } else if (mode === "qr") {
    const { qrToken } = body;
    if (!qrToken) return NextResponse.json({ error: "Token QR ausente" }, { status: 400 });
    try {
      const { payload } = await jwtVerify(qrToken, studentSecret());
      const { studentId, cardVersion, nid } = payload as { studentId: string; cardVersion: number; nid?: string };
      if (!nid) return NextResponse.json({ error: "Token sem rede. Refaça o cartão." }, { status: 400 });

      db = await getTenantDb(nid);
      const s = await db.eduStudent.findUnique({ where: { id: studentId } });
      if (!s || s.cardVersion !== cardVersion) return NextResponse.json({ error: "Cartão revogado" }, { status: 401 });
      student = s;
      const enrollment = await db.eduEnrollment.findFirst({ where: { studentId: s.id, status: "ACTIVE" }, orderBy: { startedAt: "desc" } });
      if (!enrollment) return NextResponse.json({ error: "Aluno sem turma ativa" }, { status: 403 });
      classId = enrollment.classId;
      enrollmentId = enrollment.id;
    } catch {
      return NextResponse.json({ error: "QR inválido" }, { status: 401 });
    }

  } else if (mode === "dispositivo") {
    const { studentId, nid: bodyNid } = body;
    if (!studentId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const known = await readDeviceToken(req.cookies.get(DEVICE_COOKIE)?.value);
    if (!known.some((s) => s.id === studentId)) {
      return NextResponse.json({ error: "Este aparelho não reconhece o aluno. Entre por outra opção." }, { status: 403 });
    }

    if (!bodyNid) return NextResponse.json({ error: "Rede não identificada." }, { status: 400 });
    db = await getTenantDb(bodyNid);
    const s = await db.eduStudent.findUnique({ where: { id: studentId } });
    if (!s || !s.isActive) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

    const enrollment = await db.eduEnrollment.findFirst({ where: { studentId: s.id, status: "ACTIVE" }, orderBy: { startedAt: "desc" } });
    if (!enrollment) return NextResponse.json({ error: "Aluno sem turma ativa" }, { status: 403 });

    student = s;
    classId = enrollment.classId;
    enrollmentId = enrollment.id;

  } else {
    return NextResponse.json({ error: "Modo inválido. Use: aula, manual, qr, dispositivo" }, { status: 400 });
  }

  if (!student || !db) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

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
    await db.eduStudent.update({
      where: { id: student.id },
      data: { pinFailedCount: newCount, pinLockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null },
    });
    const remaining = MAX_ATTEMPTS - newCount;
    const msg = locked ? "PIN bloqueado por 15 minutos. Peça ao professor para desbloquear." : `PIN incorreto. Você ainda tem ${remaining} tentativa${remaining !== 1 ? "s" : ""}.`;
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // Success — reset counter
  await db.eduStudent.update({ where: { id: student.id }, data: { pinFailedCount: 0, pinLockedUntil: null } });

  // Gravar presença quando modo "aula"
  if (mode === "aula" && body.sessionId) {
    try {
      await db.eduSessionPresence.upsert({
        where: { sessionId_studentId: { sessionId: body.sessionId as string, studentId: student.id } },
        create: { sessionId: body.sessionId as string, studentId: student.id },
        update: { enteredAt: new Date() },
      });
    } catch { /* schema ainda não migrado em dev */ }
  }

  const remember = mode === "dispositivo" || (mode === "manual" && body.rememberDevice === true);
  const appClient = isAppClient();
  const studentSeconds = remember ? APP_STUDENT_HOME_SECONDS : APP_STUDENT_SECONDS;

  const token = await issueStudentToken(student, classId!, enrollmentId!, studentSeconds);
  const res = NextResponse.json({ ok: true, redirect: "/escola/aluno/painel", ...(appClient ? { token } : {}) });
  res.cookies.set(STUDENT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: studentSeconds });

  if (remember) {
    const { name, initial } = studentDisplayParts(student.fullName);
    const current = await readDeviceToken(req.cookies.get(DEVICE_COOKIE)?.value);
    const next = addDeviceStudent(current, { id: student.id, name, initial, loginMode: student.loginMode });
    res.cookies.set(DEVICE_COOKIE, await signDeviceToken(next), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DEVICE_MAX_AGE,
    });
  }

  return res;
}
