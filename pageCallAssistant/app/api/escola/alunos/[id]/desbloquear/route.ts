import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const student = await prismaEdu.eduStudent.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  if (ctx.role === "TEACHER") {
    const enrollment = await prismaEdu.eduEnrollment.findFirst({
      where: { studentId: params.id, status: "ACTIVE", class: { subjects: { some: { teacherId: ctx.userId } } } },
    });
    if (!enrollment) return NextResponse.json({ error: "Aluno não é da sua turma" }, { status: 403 });
  }

  await prismaEdu.eduStudent.update({ where: { id: params.id }, data: { pinFailedCount: 0, pinLockedUntil: null } });

  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "staff", actorId: ctx.userId, action: "student.pin.unlock", entity: "EduStudent", entityId: params.id },
  });

  return NextResponse.json({ ok: true });
}
