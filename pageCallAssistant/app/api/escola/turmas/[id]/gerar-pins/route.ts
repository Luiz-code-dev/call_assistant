/**
 * POST /api/escola/turmas/[id]/gerar-pins
 * Gera PINs aleatorios de 4 digitos para alunos da turma (apenas quem nao tem hash).
 * Retorna lista plaintext para impressao — hash salvo no banco.
 * Acesso: SCHOOL_ADMIN, NETWORK_ADMIN (professor recebe 403 — acesso gerido pela escola/familia).
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

function flag() { return isEscolasEnabled(); }
function randomPin() { return String(randomInt(1000, 10000)).padStart(4, "0"); }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  // Professor não gera PINs — o acesso ao reforço é gerido pela escola e entregue à família
  if (!["SCHOOL_ADMIN","NETWORK_ADMIN"].includes(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão. O PIN é gerado pela direção ou secretaria." }, { status: 403 });
  }
  const { forceAll } = await req.json().catch(() => ({ forceAll: false }));

  const cls = await prismaEdu.eduClass.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    select: { id: true, name: true },
  });
  if (!cls) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  const enrollments = await prismaEdu.eduEnrollment.findMany({
    where: { classId: cls.id, status: "ACTIVE" },
    include: { student: { select: { id: true, fullName: true, pinHash: true, loginMode: true } } },
    orderBy: { student: { fullName: "asc" } },
  });

  type EnrollRow = typeof enrollments[number];
  const targets = forceAll
    ? enrollments
    : enrollments.filter((e: EnrollRow) => !e.student.pinHash || e.student.pinHash === "");

  const results: { studentId: string; name: string; pin: string }[] = [];
  for (const e of targets) {
    const pin = randomPin();
    const pinHash = await bcrypt.hash(pin, 10);
    await prismaEdu.eduStudent.update({
      where: { id: e.student.id },
      data: { pinHash, pinFailedCount: 0, pinLockedUntil: null },
    });
    results.push({ studentId: e.student.id, name: e.student.fullName, pin });
  }

  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "student.pins.generated", entity: "EduClass", entityId: cls.id },
  });

  return NextResponse.json({ ok: true, count: results.length, pins: results });
}
