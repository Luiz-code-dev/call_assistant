/**
 * GET /api/escola/turmas/[id]/alunos
 * Lista alunos de uma turma com status de responsável.
 * Acesso: TEACHER, SCHOOL_ADMIN, NETWORK_ADMIN, COORDINATOR da mesma rede.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["TEACHER","SCHOOL_ADMIN","NETWORK_ADMIN","COORDINATOR"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const turma = await prismaEdu.eduClass.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
  });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

  // Usa status ACTIVE (EduEnrollmentStatus) e enrollmentCode (não enrollmentNumber)
  const enrollments = await prismaEdu.eduEnrollment.findMany({
    where: { classId: params.id, status: "ACTIVE" },
    include: {
      student: {
        select: { id: true, fullName: true, enrollmentCode: true },
      },
    },
    orderBy: { student: { fullName: "asc" } },
  });

  const studentIds = enrollments.map((e: { student: { id: string } }) => e.student.id);

  // Busca guardianLinks separadamente (sem relação direta em EduStudent)
  const guardianLinks = studentIds.length
    ? await prismaEdu.eduGuardianLink.findMany({
        where: { studentId: { in: studentIds }, isActive: true },
        select: { studentId: true },
        distinct: ["studentId"],
      })
    : [];

  const studentsWithGuardian = new Set(guardianLinks.map((g: { studentId: string }) => g.studentId));

  const students = enrollments.map((e: { student: { id: string; fullName: string; enrollmentCode: string } }) => ({
    id: e.student.id,
    fullName: e.student.fullName,
    enrollmentNumber: e.student.enrollmentCode,
    hasGuardian: studentsWithGuardian.has(e.student.id),
  }));

  return NextResponse.json({ students });
}
