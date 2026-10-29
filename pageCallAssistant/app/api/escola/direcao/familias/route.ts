/**
 * GET /api/escola/direcao/familias
 * Lista alunos da escola com a situação familiar de cada um.
 *
 * Situação:
 *  - "com_acesso"       → aluno tem ≥1 vínculo ativo com guardian que já ativou o portal
 *                         (guardian.userId != null OU guardian.passwordHash != null)
 *  - "convite_pendente" → aluno tem vínculo ativo mas nenhum guardian ativou O PORTAL,
 *                         ou tem convite EduGuardianInvite ainda não aceite
 *  - "sem_responsavel"  → sem nenhum vínculo ativo
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

  const schoolFilter = ctx.role === "SCHOOL_ADMIN" && ctx.schoolId
    ? { schoolId: ctx.schoolId }
    : {};

  // Turmas da escola com alunos matriculados
  const classes = await P.eduClass.findMany({
    where: { networkId: ctx.networkId, isActive: true, ...schoolFilter },
    select: {
      id: true, name: true, gradeYear: true,
      enrollments: { where: { status: "ACTIVE" }, select: { studentId: true } },
    },
    orderBy: { gradeYear: "asc" },
  });

  const studentIdSet = new Set<string>();
  for (const c of classes) {
    for (const e of c.enrollments) studentIdSet.add(e.studentId);
  }
  const studentIds = Array.from(studentIdSet);

  if (studentIds.length === 0)
    return NextResponse.json({ students: [], totais: { comAcesso: 0, convitePendente: 0, semResponsavel: 0 } });

  const students = await P.eduStudent.findMany({
    where: { id: { in: studentIds }, isActive: true },
    select: { id: true, fullName: true, enrollmentCode: true },
    orderBy: { fullName: "asc" },
  });

  // Vínculos ativos: inclui dados do guardian para saber se já ativou o portal
  const activeLinks: { studentId: string; guardian: { userId: string | null; passwordHash: string | null } }[] =
    await P.eduGuardianLink.findMany({
      where: { studentId: { in: studentIds }, isActive: true, networkId: ctx.networkId },
      select: { studentId: true, guardian: { select: { userId: true, passwordHash: true } } },
    }).catch(() => []);

  // Separa: guardian com portal ativado (userId ou passwordHash preenchido)
  const withAccessStudents = new Set<string>();
  const linkedButNotActivated = new Set<string>();
  for (const link of activeLinks) {
    const activated = !!(link.guardian?.userId || link.guardian?.passwordHash);
    if (activated) withAccessStudents.add(link.studentId);
    else linkedButNotActivated.add(link.studentId);
  }

  // Convites pendentes via EduGuardianInvite → EduGuardianLink (resolve studentId pelo guardianId)
  // EduGuardianInvite não tem studentId — resolve via vínculos do guardian convidado
  const pendingInvites: { guardianId: string }[] = await P.eduGuardianInvite.findMany({
    where: { networkId: ctx.networkId, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { guardianId: true },
  }).catch(() => []);

  const pendingGuardianIds = pendingInvites.map((i) => i.guardianId);
  const pendingLinks: { studentId: string }[] = pendingGuardianIds.length
    ? await P.eduGuardianLink.findMany({
        where: { guardianId: { in: pendingGuardianIds }, studentId: { in: studentIds }, networkId: ctx.networkId },
        select: { studentId: true },
      }).catch(() => [])
    : [];
  const pendingStudents = new Set(pendingLinks.map((l) => l.studentId));

  // Mapeia turma por aluno
  const studentClass = new Map<string, { id: string; name: string; gradeYear: number }>();
  for (const c of classes) {
    for (const e of c.enrollments) {
      studentClass.set(e.studentId, { id: c.id, name: c.name, gradeYear: c.gradeYear });
    }
  }

  const result = (students as { id: string; fullName: string; enrollmentCode: string }[]).map(s => {
    let situacao: "com_acesso" | "convite_pendente" | "sem_responsavel";
    if (withAccessStudents.has(s.id)) {
      situacao = "com_acesso";
    } else if (linkedButNotActivated.has(s.id) || pendingStudents.has(s.id)) {
      situacao = "convite_pendente";
    } else {
      situacao = "sem_responsavel";
    }
    return { id: s.id, fullName: s.fullName, enrollmentCode: s.enrollmentCode, situacao, turma: studentClass.get(s.id) ?? null };
  });

  const totais = {
    comAcesso:        result.filter(s => s.situacao === "com_acesso").length,
    convitePendente:  result.filter(s => s.situacao === "convite_pendente").length,
    semResponsavel:   result.filter(s => s.situacao === "sem_responsavel").length,
  };

  return NextResponse.json({ students: result, totais });
}
