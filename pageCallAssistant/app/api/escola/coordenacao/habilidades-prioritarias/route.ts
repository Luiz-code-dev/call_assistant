/**
 * GET /api/escola/coordenacao/habilidades-prioritarias
 * Retorna habilidades com alunos em NOT_YET, agrupadas por componente → unidade temática → objeto de conhecimento.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

const SUBJECT_NAMES: Record<string, string> = {
  MA: "Matemática", LP: "Língua Portuguesa", CI: "Ciências",
  HI: "História", GE: "Geografia", ES: "Espanhol", IN: "Inglês",
};

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["COORDINATOR", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const subjectCode = searchParams.get("subjectCode") || undefined;

  // Busca eventos de mastery com NOT_YET mais recentes por aluno × habilidade
  const events: { skillId: string; count: number }[] = await P.eduSkillMasteryEvent.groupBy({
    by: ["skillId"],
    where: {
      networkId: ctx.networkId,
      level: "NOT_YET",
      source: { in: ["DIAGNOSTIC", "TRACK"] },
    },
    _count: { id: true },
  });

  if (events.length === 0) return NextResponse.json({ groups: [] });

  const skillIds = events.map((e: { skillId: string }) => e.skillId);
  const skills: Array<{
    id: string; code: string; description: string; gradeYear: number;
    thematicUnit: string | null; knowledgeObject: string | null; subjectCode: string;
  }> = await P.eduSkill.findMany({
    where: { id: { in: skillIds }, ...(subjectCode ? { subjectCode } : {}) },
    select: { id: true, code: true, description: true, gradeYear: true, thematicUnit: true, knowledgeObject: true, subjectCode: true },
  });

  const skillMap = new Map(skills.map(s => [s.id, s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countMap = new Map(events.map((e: any) => [e.skillId, e._count?.id ?? 0]));

  // Busca masteredCount e almostCount
  const masteredEvents = await P.eduSkillMasteryEvent.groupBy({
    by: ["skillId"],
    where: { networkId: ctx.networkId, level: "MASTERED", skillId: { in: skillIds } },
    _count: { id: true },
  });
  const almostEvents = await P.eduSkillMasteryEvent.groupBy({
    by: ["skillId"],
    where: { networkId: ctx.networkId, level: "ALMOST", skillId: { in: skillIds } },
    _count: { id: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const masteredMap = new Map(masteredEvents.map((e: any) => [e.skillId, e._count?.id ?? 0]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const almostMap = new Map(almostEvents.map((e: any) => [e.skillId, e._count?.id ?? 0]));

  // Total de alunos da rede
  const totalStudents: number = await P.eduEnrollment.count({ where: { networkId: ctx.networkId, status: "ACTIVE" } });

  // Agrupar
  const bySubject = new Map<string, Map<string, Map<string, Array<object>>>>();
  for (const s of skills) {
    const sub = s.subjectCode;
    const unit = s.thematicUnit ?? "Sem unidade temática";
    const obj = s.knowledgeObject ?? "Sem objeto de conhecimento";
    if (!bySubject.has(sub)) bySubject.set(sub, new Map());
    const unitMap = bySubject.get(sub)!;
    if (!unitMap.has(unit)) unitMap.set(unit, new Map());
    const objMap = unitMap.get(unit)!;
    if (!objMap.has(obj)) objMap.set(obj, []);
    objMap.get(obj)!.push({
      skillCode: s.code, skillName: s.description,
      gradeYear: s.gradeYear, knowledgeObject: obj, thematicUnit: unit, subjectCode: sub,
      notYetCount: countMap.get(s.id) ?? 0,
      almostCount: almostMap.get(s.id) ?? 0,
      masteredCount: masteredMap.get(s.id) ?? 0,
      totalStudents,
    });
  }

  const groups = Array.from(bySubject.entries()).map(([sub, unitMap]) => ({
    subjectCode: sub,
    subjectName: SUBJECT_NAMES[sub] ?? sub,
    units: Array.from(unitMap.entries()).map(([unitName, objMap]) => ({
      unitName,
      objects: Array.from(objMap.entries()).map(([objectName, skillList]) => ({
        objectName,
        skills: (skillList as Array<{ notYetCount: number }>).sort((a, b) => b.notYetCount - a.notYetCount),
      })),
    })),
  }));

  return NextResponse.json({ groups });
}
