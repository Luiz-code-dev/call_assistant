/**
 * GET /api/escola/direcao/familias
 * Lista alunos da escola com a situação familiar de cada um.
 * Orientado por aluno (não por responsável), conforme Fix 5.
 *
 * EduGuardianLink não tem relação `student` — busca separada por studentId.
 */
import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["SCHOOL_ADMIN", "NETWORK_ADMIN", "COORDINATOR"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  // Filtra escola para SCHOOL_ADMIN
  const schoolFilter = ctx.role === "SCHOOL_ADMIN" && ctx.schoolId
    ? { schoolId: ctx.schoolId }
    : {};

  // Busca turmas da escola com alunos matriculados (status ACTIVE)
  const classes = await P.eduClass.findMany({
    where: { networkId: ctx.networkId, isActive: true, ...schoolFilter },
    select: {
      id: true, name: true, gradeYear: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: { studentId: true },
      },
    },
    orderBy: { gradeYear: "asc" },
  });

  // Coleta todos os studentIds únicos
  const studentIdSet = new Set<string>();
  for (const c of classes) {
    for (const e of c.enrollments) studentIdSet.add(e.studentId);
  }
  const studentIds = Array.from(studentIdSet);

  if (studentIds.length === 0) return NextResponse.json({ students: [], totais: { comAcesso: 0, convitePendente: 0, semResponsavel: 0 } });

  // Busca dados dos alunos
  const students = await P.eduStudent.findMany({
    where: { id: { in: studentIds }, isActive: true },
    select: { id: true, fullName: true, enrollmentCode: true },
    orderBy: { fullName: "asc" },
  });

  // Busca links ativos separados (sem relação student em EduGuardianLink)
  const activeLinks = await P.eduGuardianLink.findMany({
    where: { studentId: { in: studentIds }, isActive: true, networkId: ctx.networkId },
    select: { studentId: true, guardianId: true },
  });

  // Busca convites pendentes
  const pendingInvites = await P.eduGuardianInvite.findMany({
    where: {
      networkId: ctx.networkId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { studentId: true },
  }).catch(() => []);

  const linkedStudents = new Set(activeLinks.map((l: { studentId: string }) => l.studentId));
  const pendingStudents = new Set(pendingInvites.map((i: { studentId: string }) => i.studentId));

  // Mapeia turma por student
  const studentClass = new Map<string, { id: string; name: string; gradeYear: number }>();
  for (const c of classes) {
    for (const e of c.enrollments) {
      studentClass.set(e.studentId, { id: c.id, name: c.name, gradeYear: c.gradeYear });
    }
  }

  const result = students.map((s: { id: string; fullName: string; enrollmentCode: string }) => {
    const hasGuardian = linkedStudents.has(s.id);
    const hasPending = pendingStudents.has(s.id);
    const situacao: "com_acesso" | "convite_pendente" | "sem_responsavel" = hasGuardian ? "com_acesso" : hasPending ? "convite_pendente" : "sem_responsavel";
    return {
      id: s.id,
      fullName: s.fullName,
      enrollmentCode: s.enrollmentCode,
      situacao,
      turma: studentClass.get(s.id) ?? null,
    };
  });

  const totais = {
    comAcesso: result.filter((s: { situacao: string }) => s.situacao === "com_acesso").length,
    convitePendente: result.filter((s: { situacao: string }) => s.situacao === "convite_pendente").length,
    semResponsavel: result.filter((s: { situacao: string }) => s.situacao === "sem_responsavel").length,
  };

  return NextResponse.json({ students: result, totais });
}
