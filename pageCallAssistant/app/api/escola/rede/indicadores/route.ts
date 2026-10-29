/**
 * GET /api/escola/rede/indicadores
 * Calcula indicadores reais da rede usando os modelos corretos do schema:
 * - EduEnrollment.status = ACTIVE
 * - EduSubmission (não eduActivitySubmission), submittedAt
 * - EduSkillMasteryEvent.level (não toLevel/fromLevel)
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

function flag() { return isEscolasEnabled(); }

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "COORDINATOR"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const escolaId = searchParams.get("escolaId") || undefined;
  const periodo = searchParams.get("periodo") || "7d";
  const since = periodo === "30d" ? daysAgo(30) : daysAgo(7);
  const semanaInicio = daysAgo(7);

  // Escolas da rede
  const schools: { id: string; name: string }[] = await P.eduSchool.findMany({
    where: { networkId: ctx.networkId, ...(escolaId ? { id: escolaId } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const schoolIds = schools.map((s) => s.id);

  // Matriculados ativos — EduEnrollment.status = "ACTIVE"
  const enrollments: { studentId: string; class: { schoolId: string } }[] = await P.eduEnrollment.findMany({
    where: {
      status: "ACTIVE",
      class: { schoolId: { in: schoolIds }, networkId: ctx.networkId },
    },
    select: { studentId: true, class: { select: { schoolId: true } } },
  });
  const totalMatriculados = enrollments.length;
  const studentIds = enrollments.map((e) => e.studentId);

  // Alunos que praticaram na semana — EduSubmission, submittedAt
  const praticouSet = studentIds.length
    ? await P.eduSubmission.groupBy({
        by: ["studentId"],
        where: {
          networkId: ctx.networkId,
          studentId: { in: studentIds },
          submittedAt: { gte: semanaInicio },
          status: { not: "IN_PROGRESS" },
        },
      })
    : [];
  const totalPraticaram = praticouSet.length;

  // Atividades concluídas — EduSubmission com status != IN_PROGRESS no período
  const atividades: number = studentIds.length
    ? await P.eduSubmission.count({
        where: {
          networkId: ctx.networkId,
          studentId: { in: studentIds },
          submittedAt: { gte: since },
          status: { not: "IN_PROGRESS" },
        },
      })
    : 0;

  // Habilidades recuperadas — EduSkillMasteryEvent.level = MASTERED no período
  const habilidades: number = studentIds.length
    ? await P.eduSkillMasteryEvent.count({
        where: {
          networkId: ctx.networkId,
          studentId: { in: studentIds },
          createdAt: { gte: since },
          level: "MASTERED",
        },
      })
    : 0;

  // Famílias acompanhando — alunos com guardianLink ativo
  const alunosComGuardian: number = studentIds.length
    ? await P.eduGuardianLink.count({
        where: {
          isActive: true,
          networkId: ctx.networkId,
          studentId: { in: studentIds },
        },
      })
    : 0;

  const pctPraticaram = totalMatriculados > 0 ? Math.round((totalPraticaram / totalMatriculados) * 100) : 0;
  const pctFamilias = totalMatriculados > 0 ? Math.round((alunosComGuardian / totalMatriculados) * 100) : 0;

  // Dados por escola
  const bySchool = await Promise.all(
    schools.map(async (school) => {
      const schoolStudentIds = enrollments
        .filter((e) => e.class.schoolId === school.id)
        .map((e) => e.studentId);
      const matriculados = schoolStudentIds.length;

      const praticouEscola = matriculados
        ? await P.eduSubmission.groupBy({
            by: ["studentId"],
            where: {
              networkId: ctx.networkId,
              studentId: { in: schoolStudentIds },
              submittedAt: { gte: semanaInicio },
              status: { not: "IN_PROGRESS" },
            },
          })
        : [];

      const atividadesEscola: number = matriculados
        ? await P.eduSubmission.count({
            where: {
              networkId: ctx.networkId,
              studentId: { in: schoolStudentIds },
              submittedAt: { gte: since },
              status: { not: "IN_PROGRESS" },
            },
          })
        : 0;

      const habilidadesEscola: number = matriculados
        ? await P.eduSkillMasteryEvent.count({
            where: {
              networkId: ctx.networkId,
              studentId: { in: schoolStudentIds },
              createdAt: { gte: since },
              level: "MASTERED",
            },
          })
        : 0;

      const guardiansEscola: number = matriculados
        ? await P.eduGuardianLink.count({
            where: {
              isActive: true,
              networkId: ctx.networkId,
              studentId: { in: schoolStudentIds },
            },
          })
        : 0;

      return {
        id: school.id,
        name: school.name,
        matriculados,
        praticaram: matriculados > 0 ? Math.round((praticouEscola.length / matriculados) * 100) : 0,
        atividades: atividadesEscola,
        habilidades: habilidadesEscola,
        familias: matriculados > 0 ? Math.round((guardiansEscola / matriculados) * 100) : 0,
      };
    })
  );

  return NextResponse.json({
    totais: { praticaram: pctPraticaram, atividades, habilidades, familias: pctFamilias },
    bySchool,
  });
}
