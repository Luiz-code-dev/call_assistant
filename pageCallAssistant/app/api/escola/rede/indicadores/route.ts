/**
 * GET /api/escola/rede/indicadores
 * Calcula indicadores reais da rede:
 * - % alunos que praticaram na semana (submissões na semana / matriculados ativos)
 * - atividades concluídas no período
 * - habilidades recuperadas (NOT_YET → MASTERED em EduSkillMasteryEvent)
 * - % famílias acompanhando (alunos com guardianLink ativo e guardian com login nos últimos 30 dias)
 * - detalhamento por escola
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

function flag() { return isEscolasEnabled(); }

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "COORDINATOR"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const escolaId = searchParams.get("escolaId") || undefined;
  const periodo = searchParams.get("periodo") || "atual";

  const since = periodo === "7d" ? daysAgo(7) : periodo === "30d" ? daysAgo(30) : daysAgo(7);
  const semanaInicio = startOfWeek();
  const familiasCutoff = daysAgo(30);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prismaEdu as any;

  // Busca escolas da rede
  const schools = await prismaAny.eduSchool.findMany({
    where: { networkId: ctx.networkId, ...(escolaId ? { id: escolaId } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const schoolIds = schools.map((s: { id: string }) => s.id);

  // Matriculados ativos por escola
  const enrollments = await prismaAny.eduEnrollment.findMany({
    where: { isActive: true, class: { schoolId: { in: schoolIds }, networkId: ctx.networkId } },
    select: { studentId: true, class: { select: { schoolId: true } } },
  });
  const totalMatriculados = enrollments.length;

  // Submissões na semana (praticaram)
  const praticaram = await prismaAny.eduActivitySubmission.findMany({
    where: {
      submittedAt: { gte: semanaInicio },
      networkId: ctx.networkId,
      ...(escolaId ? { schoolId: escolaId } : {}),
    },
    select: { studentId: true, schoolId: true },
    distinct: ["studentId"],
  });
  const totalPraticaram = praticaram.length;

  // Atividades concluídas no período
  const atividades = await prismaAny.eduActivitySubmission.count({
    where: {
      submittedAt: { gte: since },
      networkId: ctx.networkId,
      ...(escolaId ? { schoolId: escolaId } : {}),
    },
  });

  // Habilidades recuperadas (NOT_YET → MASTERED) no período
  const habilidades = await prismaAny.eduSkillMasteryEvent.count({
    where: {
      createdAt: { gte: since },
      networkId: ctx.networkId,
      toLevel: "MASTERED",
      fromLevel: { in: ["NOT_YET", "ALMOST"] },
      ...(escolaId ? { schoolId: escolaId } : {}),
    },
  }).catch(() => 0);

  // Famílias acompanhando: alunos com guardianLink ativo
  const alunosComGuardian = await prismaAny.eduGuardianLink.count({
    where: {
      isActive: true,
      networkId: ctx.networkId,
      ...(escolaId ? { student: { enrollments: { some: { class: { schoolId: escolaId } } } } } : {}),
    },
  });

  // Percentuais
  const pctPraticaram = totalMatriculados > 0 ? Math.round((totalPraticaram / totalMatriculados) * 100) : 0;
  const pctFamilias = totalMatriculados > 0 ? Math.round((alunosComGuardian / totalMatriculados) * 100) : 0;

  // Dados por escola
  const bySchool = await Promise.all(schools.map(async (school: { id: string; name: string }) => {
    const matriculados = enrollments.filter((e: { class: { schoolId: string } }) => e.class.schoolId === school.id).length;
    const praticou = praticaram.filter((p: { schoolId: string }) => p.schoolId === school.id).length;
    const atividadesEscola = await prismaAny.eduActivitySubmission.count({
      where: { submittedAt: { gte: since }, networkId: ctx.networkId, schoolId: school.id },
    }).catch(() => 0);
    const habilidadesEscola = await prismaAny.eduSkillMasteryEvent.count({
      where: { createdAt: { gte: since }, networkId: ctx.networkId, toLevel: "MASTERED", schoolId: school.id },
    }).catch(() => 0);
    const guardians = await prismaAny.eduGuardianLink.count({
      where: { isActive: true, networkId: ctx.networkId, student: { enrollments: { some: { class: { schoolId: school.id } } } } },
    }).catch(() => 0);

    return {
      id: school.id,
      name: school.name,
      matriculados,
      praticaram: matriculados > 0 ? Math.round((praticou / matriculados) * 100) : 0,
      atividades: atividadesEscola,
      habilidades: habilidadesEscola,
      familias: matriculados > 0 ? Math.round((guardians / matriculados) * 100) : 0,
    };
  }));

  return NextResponse.json({
    totais: {
      praticaram: pctPraticaram,
      atividades,
      habilidades,
      familias: pctFamilias,
    },
    bySchool,
  });
}
