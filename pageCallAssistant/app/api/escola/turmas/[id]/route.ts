import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function guardianSituacao(g: any): "ACOMPANHANDO" | "SEM_ACESSO" {
  // Tem acesso se ligado a uma conta (userId) OU se ja definiu senha propria
  // (modelo novo da familia: login direto por e-mail/celular + senha).
  return g?.userId || g?.passwordHash ? "ACOMPANHANDO" : "SEM_ACESSO";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const cls = await prismaEdu.eduClass.findFirst({
      where: {
        id: params.id,
        networkId: ctx.networkId,
        ...(ctx.schoolId ? { schoolId: ctx.schoolId } : {}),
      },
      include: {
        school: { select: { id: true, name: true } },
        schoolYear: { select: { year: true } },
        subjects: true,
      },
    });
    if (!cls) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

    // EduClassSubject nao tem relacao "subject"; busca os componentes por subjectId.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subjectIds = cls.subjects.map((cs: any) => cs.subjectId);
    const subjs = subjectIds.length
      ? await prismaEdu.eduSubject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, color: true } })
      : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subjMap = new Map<string, any>(subjs.map((s: any) => [s.id, s]));

    const enrollments = await prismaEdu.eduEnrollment.findMany({
      where: { networkId: ctx.networkId, classId: cls.id, status: "ACTIVE" },
      include: { student: true },
      orderBy: { student: { fullName: "asc" } },
    });
    const studentIds = enrollments.map((e: { studentId: string }) => e.studentId);

    const links = studentIds.length
      ? await prismaEdu.eduGuardianLink.findMany({
          where: { networkId: ctx.networkId, studentId: { in: studentIds }, isActive: true },
          include: { guardian: { select: { id: true, name: true, email: true, phone: true, userId: true, passwordHash: true } } },
        })
      : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byStudent = new Map<string, any[]>();
    for (const l of links) {
      const arr = byStudent.get(l.studentId) ?? [];
      arr.push({
        linkId: l.id,
        relation: l.relation,
        name: l.guardian?.name,
        contato: l.guardian?.email ?? l.guardian?.phone ?? null,
        situacao: guardianSituacao(l.guardian),
      });
      byStudent.set(l.studentId, arr);
    }

    const students = enrollments.map((e: { studentId: string; student: { enrollmentCode: string; fullName: string; birthDate: Date | null } }) => {
      const guardians = byStudent.get(e.studentId) ?? [];
      return {
        id: e.studentId,
        enrollmentCode: e.student.enrollmentCode,
        fullName: e.student.fullName,
        birthDate: e.student.birthDate,
        guardians,
        temResponsavel: guardians.length > 0,
        familiaComAcesso: guardians.some((g) => g.situacao === "ACOMPANHANDO"),
      };
    });

    const comAcesso = students.filter((s: { familiaComAcesso: boolean }) => s.familiaComAcesso).length;
    const semResponsavel = students.filter((s: { temResponsavel: boolean }) => !s.temResponsavel).length;

    return NextResponse.json({
      class: {
        id: cls.id, name: cls.name, stage: cls.stage, gradeYear: cls.gradeYear, shift: cls.shift,
        accessCode: cls.accessCode, schoolName: cls.school?.name, schoolId: cls.school?.id,
        year: cls.schoolYear?.year,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subjects: cls.subjects.map((cs: any) => ({ name: subjMap.get(cs.subjectId)?.name, color: subjMap.get(cs.subjectId)?.color, teacherId: cs.teacherId })),
      },
      students,
      indicadores: {
        totalAlunos: students.length,
        familiasComAcesso: comAcesso,
        semResponsavel,
      },
    });
  } catch (err) {
    console.error("[turmas/[id]:GET]", err);
    return NextResponse.json({ error: "Não foi possível carregar a turma." }, { status: 500 });
  }
}
