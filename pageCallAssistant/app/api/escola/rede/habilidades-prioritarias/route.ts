import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const masteries = await (prismaEdu as any).eduSkillMastery.findMany({
    where: { networkId: ctx.networkId },
    select: { skillId: true, level: true },
  });

  const map = new Map<string, { NOT_YET: number; ALMOST: number; MASTERED: number }>();
  for (const m of masteries) {
    if (!map.has(m.skillId)) map.set(m.skillId, { NOT_YET: 0, ALMOST: 0, MASTERED: 0 });
    map.get(m.skillId)![m.level as "NOT_YET" | "ALMOST" | "MASTERED"]++;
  }

  const skillIds = Array.from(map.keys());
  const skills = skillIds.length > 0 ? await (prismaEdu as any).eduSkill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true, code: true, shortLabel: true, subjectCode: true },
  }) : [];

  const skillMap = new Map(skills.map((s: any) => [s.id, s]));

  const stats = skillIds
    .map(skillId => {
      const counts = map.get(skillId)!;
      const total = counts.NOT_YET + counts.ALMOST + counts.MASTERED;
      const pctMastered = total > 0 ? Math.round((counts.MASTERED / total) * 100) : 0;
      const skill = skillMap.get(skillId) as any;
      return { skillId, ...skill, ...counts, total, pctMastered };
    })
    .sort((a, b) => a.pctMastered - b.pctMastered);

  return NextResponse.json({ stats });
}
