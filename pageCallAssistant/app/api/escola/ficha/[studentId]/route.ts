import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

const ALLOWED_ROLES = ["TEACHER", "COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"];

export async function GET(_req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!flag()) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!ALLOWED_ROLES.includes(ctx.role))
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const P = prismaEdu as any;

  const student = await P.eduStudent.findFirst({
    where: { id: params.studentId, networkId: ctx.networkId },
    select: { id: true, fullName: true, enrollmentCode: true },
  });
  if (!student) return NextResponse.json({ error: "Aluno nao encontrado" }, { status: 404 });

  const masteries = await P.eduSkillMastery.findMany({
    where: { networkId: ctx.networkId, studentId: params.studentId },
    include: {
      skill: {
        select: { id: true, code: true, subjectCode: true, description: true, shortLabel: true, thematicUnit: true, knowledgeObject: true },
      },
    },
    orderBy: { skill: { subjectCode: "asc" } },
  });

  const events = await P.eduSkillMasteryEvent.findMany({
    where: { networkId: ctx.networkId, studentId: params.studentId },
    include: { skill: { select: { code: true, subjectCode: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Erros comuns genericos por habilidade (ficha pedagogica)
  const guides = await P.eduSkillGuide.findMany({
    where: {
      networkId: null,
      skillId: { in: masteries.map((m: { skillId: string }) => m.skillId) },
      status: "APPROVED",
    },
    select: { skillId: true, commonErrors: true },
  });
  const guideMap = Object.fromEntries(guides.map((g: { skillId: string; commonErrors: unknown }) => [g.skillId, g.commonErrors]));

  // Erros REAIS do aluno: extrair misconceptionCode das sessoes de diagnostico
  const sessions = await P.eduAttemptSession.findMany({
    where: {
      networkId: ctx.networkId,
      studentId: params.studentId,
      completedAt: { not: null },
    },
    select: { answers: true },
  });

  // Contar ocorrencias de cada misconceptionCode por skillCode
  const miscBySkill: Record<string, Record<string, number>> = {};
  for (const s of sessions) {
    const answers = (s.answers ?? []) as { skillCode?: string; misconceptionCode?: string; isCorrect?: boolean }[];
    for (const a of answers) {
      if (a.isCorrect || !a.misconceptionCode || !a.skillCode) continue;
      if (!miscBySkill[a.skillCode]) miscBySkill[a.skillCode] = {};
      miscBySkill[a.skillCode][a.misconceptionCode] = (miscBySkill[a.skillCode][a.misconceptionCode] ?? 0) + 1;
    }
  }

  // Para cada habilidade, mapear misconceptionCode para descricao (via guideMap.commonErrors)
  const studentErrorMap: Record<string, { code: string; count: number; description: string }[]> = {};
  for (const m of masteries) {
    const skillCode = m.skill.code;
    const skillId = m.skillId;
    const miscCounts = miscBySkill[skillCode] ?? {};
    const errors = Object.entries(miscCounts)
      .map(([code, count]) => {
        // Tenta encontrar descricao na ficha pedagogica generica
        const genericErrors = (guideMap[skillId] ?? []) as { code: string; description: string }[];
        const desc = genericErrors.find((e) => e.code === code)?.description ?? code;
        return { code, count: count as number, description: desc };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    if (errors.length > 0) studentErrorMap[skillId] = errors;
  }

  // Trilha sugerida para o aluno: busca EduTeacherAlert com type=TRACK_SUGGESTION
  // (gerado por assignAfterDiagnostic no modo SUGGEST)
  const suggestAlert = await P.eduTeacherAlert.findFirst({
    where: {
      networkId: ctx.networkId,
      studentId: params.studentId,
      type: "TRACK_SUGGESTION",
      readAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, metadata: true },
  });

  let suggestedAssignment: { id: string; trackId: string; trackTitle: string } | null = null;
  if (suggestAlert?.metadata) {
    const meta = suggestAlert.metadata as { trackId?: string };
    if (meta.trackId) {
      const track = await P.eduTrack.findFirst({
        where: { id: meta.trackId },
        select: { id: true, title: true },
      });
      if (track) {
        suggestedAssignment = { id: suggestAlert.id, trackId: track.id, trackTitle: track.title };
      }
    }
  }

  return NextResponse.json({
    student,
    masteries,
    events: events.slice(0, 20),
    guideMap,
    studentErrorMap,
    suggestedAssignment,
  });
}
