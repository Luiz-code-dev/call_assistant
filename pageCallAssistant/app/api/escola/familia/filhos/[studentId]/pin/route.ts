/**
 * POST /api/escola/familia/filhos/[studentId]/pin
 * Família define um novo PIN para o aluno.
 * O PIN antigo para de funcionar imediatamente.
 * Acesso: responsável com vínculo ativo ao aluno (sf_family_ctx).
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getFamilyContext } from "@/lib/escola/family-context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function POST(req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { pin } = await req.json().catch(() => ({}));
  if (!pin || !/^\d{4}$/.test(String(pin)))
    return NextResponse.json({ error: "PIN deve ter exatamente 4 dígitos." }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  // Verifica vínculo ativo entre guardian e aluno
  const link = await P.eduGuardianLink.findFirst({
    where: { guardianId: ctx.guardianId, studentId: params.studentId, networkId: ctx.networkId, isActive: true },
  });
  if (!link) return NextResponse.json({ error: "Sem permissão para este aluno." }, { status: 403 });

  const student = await P.eduStudent.findUnique({
    where: { id: params.studentId },
    select: { id: true, loginMode: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  if (student.loginMode !== "PIN")
    return NextResponse.json({ error: "Este aluno usa figuras, não PIN." }, { status: 400 });

  const pinHash = await bcrypt.hash(String(pin), 10);
  await P.eduStudent.update({
    where: { id: params.studentId },
    data: { pinHash, pinFailedCount: 0, pinLockedUntil: null },
  });

  await P.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "guardian",
      actorId: ctx.guardianId,
      action: "student.pin.reset.familia",
      entity: "EduStudent",
      entityId: params.studentId,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
