/**
 * POST /api/escola/familia/filhos/[studentId]/cartao
 * "Perdeu o cartão?": revoga o QR atual (incrementa cardVersion) e
 * retorna o novo token para exibição imediata.
 *
 * GET /api/escola/familia/filhos/[studentId]/cartao
 * Retorna o token QR atual para exibição sem revogar.
 *
 * Acesso: responsável com vínculo ativo ao aluno.
 */
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getFamilyContext } from "@/lib/escola/family-context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { studentSecret } from "@/lib/escola/secrets";
import { publicOrigin } from "@/lib/escola/public-url";

async function signCardToken(studentId: string, cardVersion: number, nid: string): Promise<string> {
  return new SignJWT({ studentId, cardVersion, nid })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("student-card")
    .setIssuedAt()
    .sign(studentSecret());
}

async function assertLink(ctx: { guardianId: string; networkId: string }, studentId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;
  return P.eduGuardianLink.findFirst({
    where: { guardianId: ctx.guardianId, studentId, networkId: ctx.networkId, isActive: true },
  });
}

export async function GET(req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const link = await assertLink(ctx, params.studentId);
  if (!link) return NextResponse.json({ error: "Sem permissão para este aluno." }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;
  const student = await P.eduStudent.findUnique({
    where: { id: params.studentId },
    select: { id: true, networkId: true, cardVersion: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });

  const origin = publicOrigin(req);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const qrToken = await signCardToken(params.studentId, student.cardVersion, student.networkId);
  const qrUrl = `${baseUrl}/escola/aluno/entrar?card=${encodeURIComponent(qrToken)}`;

  return NextResponse.json({ qrToken, qrUrl, cardVersion: student.cardVersion });
}

export async function POST(req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const link = await assertLink(ctx, params.studentId);
  if (!link) return NextResponse.json({ error: "Sem permissão para este aluno." }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;
  const student = await P.eduStudent.findUnique({
    where: { id: params.studentId },
    select: { id: true, networkId: true, cardVersion: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });

  const newVersion = (student.cardVersion ?? 1) + 1;
  await P.eduStudent.update({ where: { id: params.studentId }, data: { cardVersion: newVersion } });

  await P.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "guardian",
      actorId: ctx.guardianId,
      action: "student.card.revoked",
      entity: "EduStudent",
      entityId: params.studentId,
    },
  }).catch(() => {});

  const origin = publicOrigin(req);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const qrToken = await signCardToken(params.studentId, newVersion, student.networkId);
  const qrUrl = `${baseUrl}/escola/aluno/entrar?card=${encodeURIComponent(qrToken)}`;

  return NextResponse.json({ ok: true, qrToken, qrUrl, cardVersion: newVersion });
}
