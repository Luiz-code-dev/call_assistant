import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "NETWORK_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const nid = ctx.networkId;

    const [schools, currentYear, members, subjects, students, invites] = await Promise.all([
      prismaEdu.eduSchool.count({ where: { networkId: nid, isActive: true } }),
      prismaEdu.eduSchoolYear.findFirst({ where: { networkId: nid, isCurrent: true }, include: { terms: true, classes: { include: { subjects: true } } } }),
      prismaEdu.eduMembership.count({ where: { networkId: nid, isActive: true } }),
      prismaEdu.eduSubject.count({ where: { networkId: nid, isActive: true } }),
      prismaEdu.eduStudent.count({ where: { networkId: nid, isActive: true } }),
      prismaEdu.eduInvite.count({ where: { networkId: nid, acceptedAt: null, expiresAt: { gt: new Date() } } }),
    ]);

    const terms = currentYear?.terms?.length ?? 0;
    const classes = currentYear?.classes?.length ?? 0;
    const offersWithoutTeacher = currentYear?.classes?.reduce(
      (acc: number, cls: { subjects: { teacherId: string | null }[] }) => acc + cls.subjects.filter((s) => !s.teacherId).length, 0
    ) ?? 0;

    // Revisão: escolas sem diretor, alunos sem turma, alunos sem responsável
    const [schoolsWithDirector, studentsWithoutClass, guardianLinkedStudents] = await Promise.all([
      prismaEdu.eduMembership.groupBy({
        by: ["schoolId"],
        where: { networkId: nid, role: "SCHOOL_ADMIN", isActive: true, schoolId: { not: null } },
      }),
      prismaEdu.eduStudent.count({ where: { networkId: nid, isActive: true, enrollments: { none: { status: "ACTIVE" } } } }),
      prismaEdu.eduGuardianLink.groupBy({ by: ["studentId"], where: { networkId: nid, isActive: true } }),
    ]);
    const schoolsWithoutDirector = Math.max(0, schools - schoolsWithDirector.length);
    const studentsWithoutGuardian = Math.max(0, students - guardianLinkedStudents.length);

    // Pendência crítica: bloqueia "Concluir implantação"
    const criticalPending =
      schoolsWithoutDirector +
      offersWithoutTeacher +
      studentsWithoutClass +
      (students > 0 ? 0 : 1) +
      (classes > 0 ? 0 : 1);
    const reviewDone = criticalPending === 0;

    const steps = [
      { step: 1, label: "Escolas", done: schools > 0, count: schools, hint: "Importar escolas (Modelo A)" },
      { step: 2, label: "Ano letivo e períodos", done: !!currentYear && terms > 0, count: terms, hint: "Criar o ano letivo corrente e seus períodos" },
      { step: 3, label: "Matriz curricular", done: subjects > 0, count: subjects, hint: "Definir componentes curriculares da rede" },
      { step: 4, label: "Servidores", done: members > 0, count: members, hint: `Importar servidores e enviar convites (${invites} pendente${invites !== 1 ? "s" : ""})` },
      { step: 5, label: "Turmas e alunos", done: students > 0 && classes > 0, count: students, hint: "Importar turmas e alunos (Modelo C)" },
      { step: 6, label: "Atribuições", done: offersWithoutTeacher === 0 && classes > 0, count: Math.max(0, classes - offersWithoutTeacher), hint: offersWithoutTeacher > 0 ? `${offersWithoutTeacher} aula${offersWithoutTeacher !== 1 ? "s" : ""} sem professor` : "Todos os professores atribuídos" },
      { step: 7, label: "Cartões de acesso", done: students > 0, count: students, hint: "Gerar PDF dos cartões por turma" },
      { step: 8, label: "Revisão", done: reviewDone, count: criticalPending, hint: reviewDone ? "Tudo certo para concluir" : `${criticalPending} pendência${criticalPending !== 1 ? "s" : ""} crítica${criticalPending !== 1 ? "s" : ""}` },
    ];

    const pending = {
      schoolsWithoutDirector,
      offersWithoutTeacher,
      invitesPending: invites,
      studentsCount: students,
      classesCount: classes,
      studentsWithoutClass,
      studentsWithoutGuardian,
    };

    const stepsCompleted = steps.filter((s) => s.done).length;
    const ready = steps.every((s) => s.done);
    const canComplete = reviewDone;

    return NextResponse.json({ steps, pending, stepsCompleted, totalSteps: steps.length, ready, canComplete });
  } catch (err) {
    console.error("[implantacao/status]", err);
    return NextResponse.json({ error: "Não foi possível carregar a implantação." }, { status: 500 });
  }
}
