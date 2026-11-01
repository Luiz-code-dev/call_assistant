/**
 * POST /api/escola/familia/filhos/[studentId]/aparelho
 * "Preparar este aparelho para o meu filho": a família autoriza o aparelho atual.
 * Adiciona o aluno ao cookie de dispositivo (sf_edu_device) para que ele
 * apareça em "Quem vai praticar agora?" sem precisar do cartão no dia a dia.
 * Acesso: responsável com vínculo ativo ao aluno.
 */
import { NextRequest, NextResponse } from "next/server";
import { getFamilyContext } from "@/lib/escola/family-context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { readDeviceToken, addDeviceStudent, signDeviceToken, studentDisplayParts, DEVICE_MAX_AGE } from "@/lib/escola/device";
import { DEVICE_COOKIE } from "@/lib/escola/cookies";

export async function POST(req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  const link = await P.eduGuardianLink.findFirst({
    where: { guardianId: ctx.guardianId, studentId: params.studentId, networkId: ctx.networkId, isActive: true },
  });
  if (!link) return NextResponse.json({ error: "Sem permissão para este aluno." }, { status: 403 });

  const student = await P.eduStudent.findUnique({
    where: { id: params.studentId },
    select: { id: true, fullName: true, loginMode: true, networkId: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });

  const { name, initial } = studentDisplayParts(student.fullName);
  const current = await readDeviceToken(req.cookies.get(DEVICE_COOKIE)?.value);
  const next = addDeviceStudent(current, { id: student.id, name, initial, loginMode: student.loginMode, nid: student.networkId });
  const newToken = await signDeviceToken(next);

  await P.eduAuditLog.create({
    data: {
      networkId: ctx.networkId,
      actorType: "guardian",
      actorId: ctx.guardianId,
      action: "student.device.authorized",
      entity: "EduStudent",
      entityId: params.studentId,
    },
  }).catch(() => {});

  const res = NextResponse.json({ ok: true, name });
  res.cookies.set(DEVICE_COOKIE, newToken, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: DEVICE_MAX_AGE,
  });
  return res;
}
