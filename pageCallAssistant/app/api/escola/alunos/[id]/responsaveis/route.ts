import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { genInviteToken, hashToken } from "@/lib/escola/familia";
import { normalizePhone } from "@/lib/escola/phone";
import { sendGuardianInviteEmail } from "@/lib/email";

function flag() { return isEscolasEnabled(); }

const ESCOLA_BASE = process.env.NEXT_PUBLIC_ESCOLA_URL || "https://www.speakflow.ia.br";

const RELATIONS = ["MAE", "PAI", "AVO_AVO", "TIO_TIA", "TUTOR_LEGAL", "OUTRO"];

// Confirma que o aluno pertence a rede (e, p/ direcao, a escola) do usuario.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertStudentInScope(ctx: any, studentId: string) {
  const student = await prismaEdu.eduStudent.findFirst({ where: { id: studentId, networkId: ctx.networkId } });
  if (!student) return null;
  if (ctx.schoolId) {
    const enr = await prismaEdu.eduEnrollment.findFirst({
      where: { studentId, networkId: ctx.networkId, status: "ACTIVE", class: { schoolId: ctx.schoolId } },
    });
    if (!enr) return null;
  }
  return student;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const student = await assertStudentInScope(ctx, params.id);
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const links = await prismaEdu.eduGuardianLink.findMany({
    where: { networkId: ctx.networkId, studentId: params.id, isActive: true },
    include: { guardian: { select: { id: true, name: true, email: true, phone: true, userId: true } } },
    orderBy: { createdAt: "asc" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responsaveis = links.map((l: any) => ({
    linkId: l.id, guardianId: l.guardianId, relation: l.relation,
    name: l.guardian?.name, email: l.guardian?.email, phone: l.guardian?.phone,
    situacao: l.guardian?.userId ? "ACOMPANHANDO" : "SEM_ACESSO",
  }));
  return NextResponse.json({ responsaveis });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const student = await assertStudentInScope(ctx, params.id);
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const { name, relation, email, phone, guardianId } = await req.json();
  if (!relation || !RELATIONS.includes(relation)) return NextResponse.json({ error: "Parentesco inválido" }, { status: 400 });

  const emailN = email?.trim() || null;
  const phoneN = normalizePhone(phone) || null;

  // Limite de 4 responsaveis ativos por aluno
  const count = await prismaEdu.eduGuardianLink.count({ where: { networkId: ctx.networkId, studentId: params.id, isActive: true } });
  if (count >= 4) return NextResponse.json({ error: "Um aluno pode ter no máximo 4 responsáveis." }, { status: 409 });

  // Resolve o guardian: por id informado, por contato existente, ou cria novo (sem duplicar)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let guardian: any = null;
  if (guardianId) {
    guardian = await prismaEdu.eduGuardian.findFirst({ where: { id: guardianId, networkId: ctx.networkId } });
  } else if (emailN || phoneN) {
    guardian = await prismaEdu.eduGuardian.findFirst({
      where: { networkId: ctx.networkId, OR: [...(emailN ? [{ email: emailN }] : []), ...(phoneN ? [{ phone: phoneN }] : [])] },
    });
  }
  if (!guardian) {
    if (!name?.trim()) return NextResponse.json({ error: "Nome do responsável é obrigatório" }, { status: 400 });
    if (!emailN && !phoneN) return NextResponse.json({ error: "Informe celular ou e-mail" }, { status: 400 });
    guardian = await prismaEdu.eduGuardian.create({
      data: { networkId: ctx.networkId, name: name.trim(), email: emailN, phone: phoneN },
    });
  }

  await prismaEdu.eduGuardianLink.upsert({
    where: { guardianId_studentId: { guardianId: guardian.id, studentId: params.id } },
    create: { networkId: ctx.networkId, guardianId: guardian.id, studentId: params.id, relation, isActive: true },
    update: { isActive: true, relation, revokedAt: null, revokedById: null, revokeReason: null },
  });

  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "guardian.linked", entity: "EduGuardianLink", entityId: guardian.id },
  }).catch(() => {});

  // Convite (link por e-mail/WhatsApp) mostrando o nome do aluno no aceite.
  // Usa o e-mail RESOLVIDO do guardian (vale tanto para novo quanto para
  // responsavel existente que foi apenas religado por guardianId).
  const guardianEmail: string | null = guardian.email ?? null;
  const guardianPhone: string | null = guardian.phone ?? null;
  let invitePath: string | null = null;
  const token = genInviteToken();
  try {
    await prismaEdu.eduGuardianInvite.create({
      data: {
        networkId: ctx.networkId, guardianId: guardian.id, tokenHash: hashToken(token),
        channel: guardianEmail ? "email" : guardianPhone ? "whatsapp" : "link",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdById: ctx.userId,
      },
    });
    invitePath = `/escola/familia/convite/${token}`;
    // Dispara o e-mail do convite via Resend (se o responsável tem e-mail).
    if (guardianEmail) {
      await sendGuardianInviteEmail(guardianEmail, guardian.name, [student.fullName], `${ESCOLA_BASE}${invitePath}`);
    }
  } catch (e) { console.error("[responsaveis:convite]", e); }

  return NextResponse.json({ ok: true, guardianId: guardian.id, invitePath }, { status: 201 });
}
