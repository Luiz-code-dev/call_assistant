/**
 * GET  /api/escola/diagnosticos/[id]  — detalhes + participação + resultado por habilidade
 * PATCH /api/escola/diagnosticos/[id] — abrir (OPEN) ou encerrar (CLOSED)
 *
 * Fonte de dados: EduAttemptSession (diagnóstico) → EduSkillMastery (nível de domínio).
 * A mesma fonte usada pelo painel da rede (/api/escola/rede/habilidades-prioritarias).
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { assignAfterDiagnostic } from "@/lib/escola/track-assignment";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["COORDINATOR","NETWORK_ADMIN","SCHOOL_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const diag = await prismaEdu.eduDiagnostic.findFirst({
    where: { id: params.id, networkId: ctx.networkId },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { skill: { select: { id: true, code: true, shortLabel: true, description: true } } },
      },
    },
  }).catch(() => null);

  if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });

  // Alunos que completaram ao menos uma sessão deste diagnóstico
  const sessions = await prismaEdu.eduAttemptSession.findMany({
    where: { diagnosticId: params.id, networkId: ctx.networkId, completedAt: { not: null } },
    select: { studentId: true, activityId: true },
    distinct: ["studentId", "activityId"],
  }).catch(() => [] as { studentId: string; activityId: string }[]);

  type SessionRow = { studentId: string; activityId: string };
  const responderam = new Set((sessions as SessionRow[]).map((s) => s.studentId));
  const total = await prismaEdu.eduEnrollment.count({
    where: { networkId: ctx.networkId, status: "ACTIVE" },
  }).catch(() => 0);

  // Domínio por habilidade — via EduSkillMastery (mesma fonte do painel da rede)
  type DiagItem = (typeof diag.items)[number];
  const skillIds = diag.items.map((i: DiagItem) => i.skill.id);
  const masteries = skillIds.length > 0
    ? await prismaEdu.eduSkillMastery.findMany({
        where: {
          networkId: ctx.networkId,
          skillId: { in: skillIds },
          studentId: { in: Array.from(responderam) },
        },
        select: { studentId: true, skillId: true, level: true },
      }).catch(() => [] as { studentId: string; skillId: string; level: string }[])
    : [] as { studentId: string; skillId: string; level: string }[];

  type MasteryRow = { studentId: string; skillId: string; level: string };
  const bySkill = diag.items.map((item: DiagItem) => {
    const itemMasteries = (masteries as MasteryRow[]).filter((m) => m.skillId === item.skill.id);
    const mastered = itemMasteries.filter((m: MasteryRow) => m.level === "MASTERED").length;
    const almost   = itemMasteries.filter((m: MasteryRow) => m.level === "ALMOST").length;
    const notYet   = itemMasteries.filter((m: MasteryRow) => m.level === "NOT_YET").length;
    const naoAval  = responderam.size - itemMasteries.length;
    return {
      skillCode: item.skill.code,
      skillLabel: item.skill.shortLabel ?? item.skill.description,
      mastered, almost, notYet, naoAval: Math.max(0, naoAval),
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
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { action } = await req.json();
  const status = action === "abrir" ? "OPEN" : action === "encerrar" ? "CLOSED" : null;
  if (!status) return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const diag = await prismaEdu.eduDiagnostic.update({
    where: { id: params.id, networkId: ctx.networkId },
    data: { status },
  }).catch(() => null);

  if (!diag) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });

  // Ao encerrar, dispara atribuição AUTO/SUGGEST para cada aluno com NOT_YET
  if (status === "CLOSED") {
    (async () => {
      try {
        const fullDiag = await prismaEdu.eduDiagnostic.findUnique({
          where: { id: params.id },
          include: { items: { select: { activityId: true, skillId: true } } },
        });
        if (!fullDiag) return;

        type FDItem = { activityId: string; skillId: string };
        const activityIds = fullDiag.items.map((i: FDItem) => i.activityId);
        if (!activityIds.length) return;

        // Alunos que concluíram sessões com NOT_YET via EduSkillMastery
        const skillIds = fullDiag.items.map((i: FDItem) => i.skillId);
        const notYetMasteries = await prismaEdu.eduSkillMastery.findMany({
          where: { networkId: ctx.networkId, skillId: { in: skillIds }, level: "NOT_YET" },
          select: { studentId: true, skillId: true },
        });

        const byStudent: Record<string, string[]> = {};
        for (const m of notYetMasteries) {
          if (!byStudent[m.studentId]) byStudent[m.studentId] = [];
          if (!byStudent[m.studentId].includes(m.skillId)) byStudent[m.studentId].push(m.skillId);
        }

        for (const [studentId, notYetSkillIds] of Object.entries(byStudent)) {
          await assignAfterDiagnostic({ networkId: ctx.networkId, diagnosticId: params.id, studentId, notYetSkillIds, assignedBy: "system" })
            .catch((e: Error) => console.error("[diagnostico/encerrar]", studentId, e?.message));
        }
      } catch (err) {
        console.error("[diagnostico/encerrar] assignAfterDiagnostic batch:", (err as Error)?.message);
      }
    })();
  }

  return NextResponse.json({ diag });
}
