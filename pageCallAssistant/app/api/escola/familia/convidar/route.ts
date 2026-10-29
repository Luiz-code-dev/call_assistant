/**
 * POST /api/escola/familia/convidar
 * Cria/envia convite de responsável para um aluno (wrapper sobre /alunos/[id]/responsaveis)
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
import { randomBytes } from "crypto";

const P = prismaEdu as any; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["SCHOOL_ADMIN", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { studentId, email, name, relation } = await req.json().catch(() => ({}));
  if (!studentId || !email) return NextResponse.json({ error: "studentId e email são obrigatórios" }, { status: 400 });

  // Verifica que o aluno pertence à rede
  const student = await P.eduStudent.findFirst({
    where: { id: studentId, networkId: ctx.networkId },
  }).catch(() => null);
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  // Verifica se já existe responsável com esse e-mail
  const existing = await P.eduGuardian.findFirst({
    where: { email, networkId: ctx.networkId },
  }).catch(() => null);

  let guardianId: string;
  if (existing) {
    guardianId = existing.id;
  } else {
    const guardian = await P.eduGuardian.create({
      data: {
        networkId: ctx.networkId,
        name: name ?? email.split("@")[0],
        email,
        relation: relation ?? "OUTRO",
      },
    });
    guardianId = guardian.id;
  }

  // Cria ou atualiza o vínculo
  const linkExisting = await P.eduGuardianLink.findFirst({
    where: { guardianId, studentId, networkId: ctx.networkId },
  }).catch(() => null);

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  if (linkExisting) {
    await P.eduGuardianLink.update({
      where: { id: linkExisting.id },
      data: { inviteToken: token, inviteExpiresAt: expiresAt, status: "PENDING" },
    });
  } else {
    await P.eduGuardianLink.create({
      data: {
        networkId: ctx.networkId,
        guardianId,
        studentId,
        relation: relation ?? "OUTRO",
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        status: "PENDING",
        isActive: false,
      },
    });
  }

  await P.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "user",
      actorId: ctx.userId,
      action: "guardian.invite.sent",
      entity: "EduGuardianLink",
      entityId: studentId,
    },
  }).catch(() => null);

  const invitePath = `/escola/familia/convite/${token}`;
  return NextResponse.json({ ok: true, invitePath, token });
}
