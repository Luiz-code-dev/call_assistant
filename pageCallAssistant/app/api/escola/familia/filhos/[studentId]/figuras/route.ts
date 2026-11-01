/**
 * POST /api/escola/familia/filhos/[studentId]/figuras
 * Família define nova sequência de 3 figuras para aluno do 1º–5º ano.
 * A sequência antiga para de funcionar imediatamente.
 * Acesso: responsável com vínculo ativo ao aluno.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getFamilyContext } from "@/lib/escola/family-context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

const VALID_FIGURES = ["sun","star","heart","house","fish","flower","moon","drop","cloud"];

export async function POST(req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { figures } = await req.json().catch(() => ({}));
  if (!Array.isArray(figures) || figures.length !== 3 || !figures.every((f) => VALID_FIGURES.includes(f)))
    return NextResponse.json({ error: "Informe exatamente 3 figuras válidas." }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  const link = await P.eduGuardianLink.findFirst({
    where: { guardianId: ctx.guardianId, studentId: params.studentId, networkId: ctx.networkId, isActive: true },
  });
  if (!link) return NextResponse.json({ error: "Sem permissão para este aluno." }, { status: 403 });

  const student = await P.eduStudent.findUnique({
    where: { id: params.studentId },
    select: { id: true, loginMode: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  if (student.loginMode !== "PICTURE")
    return NextResponse.json({ error: "Este aluno usa PIN, não figuras." }, { status: 400 });

  const pictureSecretHash = await bcrypt.hash(figures.join(","), 10);
  await P.eduStudent.update({
    where: { id: params.studentId },
    data: { pictureSecretHash, pinFailedCount: 0, pinLockedUntil: null },
  });

  await P.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "guardian",
      actorId: ctx.guardianId,
      action: "student.figures.reset.familia",
      entity: "EduStudent",
      entityId: params.studentId,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
