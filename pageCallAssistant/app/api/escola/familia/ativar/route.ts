import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";
import { hashFamilyCode, sameBirthDate } from "@/lib/escola/familia";
import { FAMILY_COOKIE } from "@/lib/escola/cookies";
import { normalizePhone } from "@/lib/escola/phone";
import { isAppClient, APP_FAMILY_SECONDS } from "@/lib/escola/app-auth";
import bcrypt from "bcryptjs";

const schema = z.object({
  familyCode: z.string().min(6).max(16),
  birthDate: z.string().min(8), // YYYY-MM-DD
  guardianName: z.string().min(2),
  guardianEmail: z.string().email().optional(),
  guardianPhone: z.string().optional(),
  senha: z.string().min(6).max(72).optional(),
  relation: z.enum(["MAE", "PAI", "AVO_AVO", "TIO_TIA", "TUTOR_LEGAL", "OUTRO"]),
  termsVersion: z.string().min(1),
  consentIp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { familyCode, birthDate, guardianName, guardianEmail, guardianPhone, senha, relation, termsVersion, consentIp } = parsed.data;
  const phoneNorm = guardianPhone ? (normalizePhone(guardianPhone) || null) : null;
  const passwordHash = senha ? await bcrypt.hash(senha, 10) : null;

  // Acha o código pelo hash (busca O(1)); o código é por aluno (studentId único).
  const codeHash = hashFamilyCode(familyCode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prismaEdu as any).eduFamilyCode.findFirst({ where: { codeHash } });
  if (!record || record.activationsLeft <= 0 || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Código inválido ou expirado" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const student = await (prismaEdu as any).eduStudent.findFirst({ where: { id: record.studentId, isActive: true } });
  // A data de nascimento confirma que a pessoa conhece o aluno (prova de posse do cartão + vínculo real).
  if (!student || !sameBirthDate(birthDate, student.birthDate)) {
    return NextResponse.json({ error: "Código ou data de nascimento não conferem" }, { status: 400 });
  }

  const networkId = student.networkId;

  await (prismaEdu as any).eduFamilyCode.update({
    where: { id: record.id },
    data: { activationsLeft: record.activationsLeft - 1 },
  });

  let guardian = await (prismaEdu as any).eduGuardian.findFirst({
    where: { networkId, ...(guardianEmail ? { email: guardianEmail } : { phone: phoneNorm }) },
  });
  if (!guardian) {
    guardian = await (prismaEdu as any).eduGuardian.create({
      data: { networkId, name: guardianName, email: guardianEmail ?? null, phone: phoneNorm, ...(passwordHash ? { passwordHash } : {}) },
    });
  } else if (passwordHash) {
    // Primeiro acesso define/atualiza a senha do responsavel existente.
    guardian = await (prismaEdu as any).eduGuardian.update({ where: { id: guardian.id }, data: { passwordHash } });
  }

  await (prismaEdu as any).eduGuardianLink.upsert({
    where: { guardianId_studentId: { guardianId: guardian.id, studentId: student.id } },
    create: { networkId, guardianId: guardian.id, studentId: student.id, relation, isActive: true },
    update: { isActive: true, relation, revokedAt: null, revokedById: null, revokeReason: null },
  });

  await (prismaEdu as any).eduGuardianConsent.create({
    data: { guardianId: guardian.id, studentId: student.id, termsVersion, ip: consentIp ?? null },
  });

  const appClient = isAppClient();
  const familySeconds = appClient ? APP_FAMILY_SECONDS : 60 * 60 * 24 * 90;
  const token = await new SignJWT({ nid: networkId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("family")
    .setSubject(guardian.id)
    .setIssuedAt()
    .setExpirationTime(`${familySeconds}s`)
    .sign(familySecret());

  const res = NextResponse.json({ ok: true, guardianId: guardian.id, studentName: student.fullName, ...(appClient ? { token } : {}) });
  res.cookies.set(FAMILY_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: familySeconds,
    path: "/",
  });
  return res;
}
