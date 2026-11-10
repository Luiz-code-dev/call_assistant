import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { familySecret } from "@/lib/escola/secrets";
import { sameBirthDate, MAX_GUARDIANS_PER_STUDENT } from "@/lib/escola/familia";
import { acharCodigoFamilia, bloqueado, registrarErroData, usarCodigo } from "@/lib/escola/codigo-familia";
import { avisarFamilia, avisoNovoResponsavel } from "@/lib/escola/avisos-familia";
import { FAMILY_COOKIE } from "@/lib/escola/cookies";
import { normalizePhone } from "@/lib/escola/phone";
import { isAppClient, APP_FAMILY_SECONDS } from "@/lib/escola/app-auth";
import bcrypt from "bcryptjs";
import { syncGuardianLogin } from "@/lib/escola/catalogo-sync";

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
  // Autorização para avisos do reforço pelo WhatsApp (o número é o guardianPhone)
  aceitaWhatsapp: z.boolean().optional(),
});

const RELACAO: Record<string, string> = { MAE: "mãe", PAI: "pai", AVO_AVO: "avó ou avô", TIO_TIA: "tia ou tio", TUTOR_LEGAL: "tutor legal", OUTRO: "responsável" };

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { familyCode, birthDate, guardianName, guardianEmail, guardianPhone, senha, relation, termsVersion, consentIp, aceitaWhatsapp } = parsed.data;
  const phoneNorm = guardianPhone ? (normalizePhone(guardianPhone) || null) : null;
  const passwordHash = senha ? await bcrypt.hash(senha, 10) : null;

  // Acha o código em qualquer rede (o catálogo diz qual base); o código é por aluno.
  // Antes, sem contexto de rede, prismaEdu falhava e o primeiro acesso dava erro.
  const achado = await acharCodigoFamilia(familyCode);
  if (!achado) return NextResponse.json({ error: "Código inválido ou expirado. Peça uma ficha nova à escola." }, { status: 400 });
  setTenantDb(achado.db);
  const { record, student } = achado;
  const minutos = bloqueado(record);
  if (minutos) return NextResponse.json({ error: `Este código está bloqueado por segurança. Tente de novo em ${minutos} minutos.` }, { status: 429 });

  // A data de nascimento confirma que a pessoa conhece o aluno (prova de posse da ficha + vínculo real).
  if (!student.birthDate) {
    return NextResponse.json({ error: "A escola ainda não informou a data de nascimento deste aluno. Fale com a secretaria." }, { status: 400 });
  }
  if (!sameBirthDate(birthDate, student.birthDate)) {
    return NextResponse.json({ error: await registrarErroData(achado.db, record) }, { status: 400 });
  }

  const networkId = student.networkId;

  let guardian = await (prismaEdu as any).eduGuardian.findFirst({
    where: { networkId, ...(guardianEmail ? { email: guardianEmail } : { phone: phoneNorm }) },
  });
  // Quem já tem senha entra com ela e usa "Adicionar filho": o primeiro acesso não troca a
  // senha de uma conta existente (senão bastaria saber o e-mail de outra pessoa).
  if (guardian?.passwordHash) {
    return NextResponse.json({ error: "Esse e-mail ou WhatsApp já tem cadastro. Entre com a sua senha e toque em \"Adicionar filho\".", jaTemConta: true }, { status: 409 });
  }
  const vinculados = await (prismaEdu as any).eduGuardianLink.count({ where: { studentId: student.id, isActive: true, ...(guardian ? { guardianId: { not: guardian.id } } : {}) } });
  if (vinculados >= MAX_GUARDIANS_PER_STUDENT) {
    return NextResponse.json({ error: "Este aluno já tem o número máximo de responsáveis. Fale com a escola." }, { status: 409 });
  }
  await usarCodigo(achado.db, record);

  if (!guardian) {
    guardian = await (prismaEdu as any).eduGuardian.create({
      data: { networkId, name: guardianName, email: guardianEmail ?? null, phone: phoneNorm, ...(passwordHash ? { passwordHash } : {}), ...(aceitaWhatsapp && phoneNorm ? { whatsappOptInAt: new Date() } : {}) },
    });
  } else if (passwordHash || (aceitaWhatsapp && phoneNorm)) {
    // Primeiro acesso define/atualiza a senha do responsavel existente.
    guardian = await (prismaEdu as any).eduGuardian.update({
      where: { id: guardian.id },
      data: { ...(passwordHash ? { passwordHash } : {}), ...(aceitaWhatsapp && phoneNorm ? { phone: guardian.phone ?? phoneNorm, whatsappOptInAt: new Date() } : {}) },
    });
  }

  await (prismaEdu as any).eduGuardianLink.upsert({
    where: { guardianId_studentId: { guardianId: guardian.id, studentId: student.id } },
    create: { networkId, guardianId: guardian.id, studentId: student.id, relation, isActive: true },
    update: { isActive: true, relation, revokedAt: null, revokedById: null, revokeReason: null },
  });

  // Quem já acompanhava o aluno fica sabendo do novo responsável
  await avisarFamilia(achado.db, networkId, student.id, `NOVO_RESPONSAVEL:${guardian.id}`,
    avisoNovoResponsavel(student.fullName, guardianName, RELACAO[relation] ?? "responsável", student.id), new Date(), guardian.id).catch(() => 0);

  await (prismaEdu as any).eduGuardianConsent.create({
    data: { guardianId: guardian.id, studentId: student.id, termsVersion, ip: consentIp ?? null },
  });

  // Sincroniza índice de login no catálogo para que login futuro funcione
  if (guardianEmail) await syncGuardianLogin(guardianEmail.toLowerCase().trim(), networkId).catch(() => null);
  if (phoneNorm) await syncGuardianLogin(phoneNorm, networkId).catch(() => null);

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
