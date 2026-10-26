import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";

const schema = z.object({
  networkId: z.string().min(1),
  studentEnrollmentCode: z.string().min(1),
  familyCode: z.string().min(6).max(12),
  guardianName: z.string().min(2),
  guardianEmail: z.string().email().optional(),
  guardianPhone: z.string().optional(),
  relation: z.enum(["MAE", "PAI", "AVO_AVO", "TIO_TIA", "TUTOR_LEGAL", "OUTRO"]),
  termsVersion: z.string().min(1),
  consentIp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { networkId, studentEnrollmentCode, familyCode, guardianName, guardianEmail, guardianPhone, relation, termsVersion, consentIp } = parsed.data;

  const student = await (prismaEdu as any).eduStudent.findFirst({
    where: { networkId, enrollmentCode: studentEnrollmentCode, isActive: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const record = await (prismaEdu as any).eduFamilyCode.findUnique({
    where: { studentId: student.id },
  });
  if (!record || record.activationsLeft <= 0 || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Código inválido ou expirado" }, { status: 400 });
  }

  const valid = await bcrypt.compare(familyCode, record.codeHash);
  if (!valid) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

  await (prismaEdu as any).eduFamilyCode.update({
    where: { id: record.id },
    data: { activationsLeft: record.activationsLeft - 1 },
  });

  let guardian = await (prismaEdu as any).eduGuardian.findFirst({
    where: { networkId, ...(guardianEmail ? { email: guardianEmail } : { phone: guardianPhone }) },
  });
  if (!guardian) {
    guardian = await (prismaEdu as any).eduGuardian.create({
      data: { networkId, name: guardianName, email: guardianEmail ?? null, phone: guardianPhone ?? null },
    });
  }

  await (prismaEdu as any).eduGuardianLink.upsert({
    where: { guardianId_studentId: { guardianId: guardian.id, studentId: student.id } },
    create: { networkId, guardianId: guardian.id, studentId: student.id, relation, isActive: true },
    update: { isActive: true, relation },
  });

  await (prismaEdu as any).eduGuardianConsent.create({
    data: { guardianId: guardian.id, studentId: student.id, termsVersion, ip: consentIp ?? null },
  });

  const token = await new SignJWT({ nid: networkId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(guardian.id)
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(familySecret());

  const res = NextResponse.json({ ok: true, guardianId: guardian.id });
  res.cookies.set("sf_family_ctx", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return res;
}
