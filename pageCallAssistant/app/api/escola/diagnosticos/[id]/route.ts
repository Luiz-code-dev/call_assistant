/**
 * GET  /api/escola/diagnosticos/[id]  — detalhes + participação + resultado por habilidade
 * PATCH /api/escola/diagnosticos/[id] — abrir (OPEN) ou encerrar (CLOSED)
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["COORDINATOR","NETWORK_ADMIN","SCHOOL_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const diag = await P.eduDiagnostic.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { skill: { select: { id: true, code: true, shortLabel: true, description: true } } },
      },
    },
  }).catch(() => null);

  if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });

  // Participação: alunos que responderam ao diagnóstico (via EduSubmission com activityId dos itens)
  const activityIds: string[] = diag.items.map((i: { activityId: string }) => i.activityId);
  const submissions = activityIds.length
    ? await P.eduSubmission.findMany({
        where: { activityId: { in: activityIds }, networkId: ctx.networkId, status: { not: "IN_PROGRESS" } },
        select: { studentId: true, activityId: true, masteryLevel: true },
      }).catch(() => [])
    : [];

  // Deduplicar: um registro por (studentId, activityId) — mantém a tentativa de maior nível
  const levelOrder: Record<string, number> = { MASTERED: 3, ALMOST: 2, NOT_YET: 1 };
  const bestByStudentActivity = new Map<string, { masteryLevel: string | null }>();
  for (const s of submissions as { studentId: string; activityId: string; masteryLevel: string | null }[]) {
    const key = `${s.studentId}|${s.activityId}`;
    const prev = bestByStudentActivity.get(key);
    if (!prev || (levelOrder[s.masteryLevel ?? ""] ?? 0) > (levelOrder[prev.masteryLevel ?? ""] ?? 0)) {
      bestByStudentActivity.set(key, s);
    }
  }
  const dedupedSubs = Array.from(bestByStudentActivity.values()) as { studentId: string; activityId: string; masteryLevel: string | null }[];

  const responderam = new Set(dedupedSubs.map((s) => s.studentId));
  const total = await P.eduEnrollment.count({ where: { networkId: ctx.networkId, status: "ACTIVE" } }).catch(() => 0);

  // Resultado por habilidade
  const bySkill = diag.items.map((item: { activityId: string; skill: { id: string; code: string; shortLabel: string | null; description: string } }) => {
    const subs = dedupedSubs.filter((s) => s.activityId === item.activityId);
    const mastered = subs.filter(s => s.masteryLevel === "MASTERED").length;
    const almost   = subs.filter(s => s.masteryLevel === "ALMOST").length;
    const notYet   = subs.filter(s => s.masteryLevel === "NOT_YET").length;
    const naoAval  = responderam.size - subs.length;
    return {
      skillCode: item.skill.code,
      skillLabel: item.skill.shortLabel ?? item.skill.description,
      mastered, almost, notYet, naoAval,
      total: responderam.size,
    };
  });

  return NextResponse.json({
    diag: {
      id: diag.id,
      title: diag.title,
      status: diag.status,
      gradeYear: diag.gradeYear,
      cycle: diag.cycle,
      createdAt: diag.createdAt,
    },
    participacao: { responderam: responderam.size, total },
    bySkill,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { action } = await req.json();
  const status = action === "abrir" ? "OPEN" : action === "encerrar" ? "CLOSED" : null;
  if (!status) return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const diag = await P.eduDiagnostic.update({
    where: { id: params.id, networkId: ctx.networkId },
    data: { status },
  }).catch(() => null);

  if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });
  return NextResponse.json({ diag });
}
