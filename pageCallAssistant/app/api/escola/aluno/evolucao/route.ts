/**
 * GET /api/escola/aluno/evolucao
 * Retorna evolução do aluno autenticado por habilidade e componente.
 */
import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = prismaEdu as any;

  // Pega submissões do aluno com nível de habilidade
  const submissions: {
    activityId: string;
    masteryLevel: string | null;
    activity: {
      activitySkills: { skill: { id: string; code: string; description: string; subject: { name: string; color: string | null } | null } }[];
    } | null;
  }[] = await P.eduSubmission.findMany({
    where: { studentId: student.studentId, networkId: student.networkId, status: { not: "IN_PROGRESS" } },
    orderBy: { submittedAt: "desc" },
    select: {
      activityId: true,
      masteryLevel: true,
      activity: {
        select: {
          activitySkills: {
            select: {
              skill: {
                select: {
                  id: true, code: true, description: true,
                  subject: { select: { name: true, color: true } },
                },
              },
            },
          },
        },
      },
    },
  }).catch(() => []);

  // Deduplicar por activityId: manter melhor nível
  const levelOrder: Record<string, number> = { MASTERED: 3, ALMOST: 2, NOT_YET: 1 };
  const bestByActivity = new Map<string, typeof submissions[number]>();
  for (const s of submissions) {
    const prev = bestByActivity.get(s.activityId);
    if (!prev || (levelOrder[s.masteryLevel ?? ""] ?? 0) > (levelOrder[prev.masteryLevel ?? ""] ?? 0)) {
      bestByActivity.set(s.activityId, s);
    }
  }

  // Deduplicar por habilidade: manter melhor nível
  const bestBySkill = new Map<string, { level: string; code: string; description: string; subjectName: string; subjectColor: string }>();
  for (const sub of Array.from(bestByActivity.values())) {
    if (!sub.activity) continue;
    for (const as_ of sub.activity.activitySkills) {
      const sk = as_.skill;
      const prev = bestBySkill.get(sk.id);
      if (!prev || (levelOrder[sub.masteryLevel ?? ""] ?? 0) > (levelOrder[prev.level] ?? 0)) {
        bestBySkill.set(sk.id, {
          level: sub.masteryLevel ?? "NOT_YET",
          code: sk.code,
          description: sk.description,
          subjectName: sk.subject?.name ?? "Geral",
          subjectColor: sk.subject?.color ?? "#6D28D9",
        });
      }
    }
  }

  // Agrupa por componente
  const bySubject = new Map<string, { subjectName: string; subjectColor: string; skills: { code: string; description: string; level: string }[] }>();
  for (const [, sk] of Array.from(bestBySkill.entries())) {
    const entry = bySubject.get(sk.subjectName);
    if (entry) {
      entry.skills.push({ code: sk.code, description: sk.description, level: sk.level });
    } else {
      bySubject.set(sk.subjectName, { subjectName: sk.subjectName, subjectColor: sk.subjectColor, skills: [{ code: sk.code, description: sk.description, level: sk.level }] });
    }
  }

  return NextResponse.json({ subjects: Array.from(bySubject.values()) });
}
