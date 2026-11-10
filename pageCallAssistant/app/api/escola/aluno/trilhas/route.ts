/**
 * GET /api/escola/aluno/trilhas
 * Retorna:
 * - proximoPasso: próxima atividade da trilha com prazo mais próximo
 * - ativas: trilhas ativas com progresso
 * - concluidas: concluídas recentes (últimas 3)
 * Só APPROVED, só atribuições ativas (endedAt null), sem trilhas arquivadas.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { weekStartSaoPaulo, dayIndexSaoPaulo } from "@/lib/escola/family-guard";
import { tituloParaAluno } from "@/lib/escola/texto-aluno";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (student?.db) setTenantDb(student.db);

  const assignments = await p.eduTrackAssignment.findMany({
    where: {
      networkId: student.networkId,
      endedAt: null,
      OR: [{ classId: student.classId }, { studentId: student.studentId }],
      track: { status: "APPROVED" },
    },
    include: {
      track: {
        include: {
          items:  { orderBy: { order: "asc" } as const },
          skills: { select: { id: true, code: true, shortLabel: true } },
        },
      },
      progress: { where: { studentId: student.studentId } },
    },
    orderBy: { dueAt: "asc" as const },
  });

  // Separa concluídas de ativas
  const ativas: unknown[]     = [];
  const concluidas: unknown[] = [];

  for (const a of assignments) {
    const prog = a.progress[0] ?? null;
    const completedIds: string[] = prog?.completedItemIds ?? [];
    const totalItems = a.track.items.length;
    const allDone = totalItems > 0 && completedIds.length >= totalItems;

    const entry = {
      assignmentId: a.id,
      trackId: a.track.id,
      title: tituloParaAluno(a.track.title),
      subjectId: a.track.subjectId,
      gradeYear: a.track.gradeYear,
      skills: a.track.skills,
      totalItems,
      dueAt: a.dueAt,
      concluidos: completedIds.length,
      completedAt: prog?.completedAt ?? null,
      lastActivityAt: prog?.lastActivityAt ?? null,
      items: a.track.items.map((it: { id: string; order: number; activityId: string; estMinutes: number }) => ({
        id: it.id,
        order: it.order,
        activityId: it.activityId,
        estMinutes: it.estMinutes,
        done: completedIds.includes(it.id),
      })),
    };

    if (allDone || prog?.completedAt) {
      concluidas.push(entry);
    } else {
      ativas.push(entry);
    }
  }

  // Próximo passo: primeira atividade não feita da trilha ativa com prazo mais próximo
  let proximoPasso = null;
  for (const a of ativas as Array<{
    assignmentId: string; trackId: string; title: string; subjectId: string;
    skills: { code: string; shortLabel: string | null }[];
    items: { id: string; order: number; activityId: string; estMinutes: number; done: boolean }[];
    totalItems: number; dueAt: Date | null;
  }>) {
    const nextItem = a.items.find(it => !it.done);
    if (nextItem) {
      proximoPasso = {
        assignmentId: a.assignmentId,
        trackId: a.trackId,
        title: tituloParaAluno(a.title),
        subjectId: a.subjectId,
        skills: a.skills,
        itemId: nextItem.id,
        activityId: nextItem.activityId,
        ordem: nextItem.order + 1,
        total: a.totalItems,
        estMinutes: nextItem.estMinutes,
        dueAt: a.dueAt,
      };
      break;
    }
  }

  // Dados da semana (segunda..domingo, America/Sao_Paulo)
  const weekStart = weekStartSaoPaulo();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const subsWeek = await p.eduSubmission.findMany({
    where: {
      networkId: student.networkId,
      studentId: student.studentId,
      submittedAt: { gte: weekStart, lt: weekEnd },
      status: { not: "IN_PROGRESS" },
    },
    select: { submittedAt: true },
  });
  const dias = [false, false, false, false, false, false, false];
  for (const s of subsWeek) {
    if (s.submittedAt) dias[dayIndexSaoPaulo(new Date(s.submittedAt))] = true;
  }
  const diasPraticados = dias.filter(Boolean).length;
  // Dias seguidos até hoje (recuando a partir de hoje)
  const hojeIndex = dayIndexSaoPaulo(new Date());
  let diasSeguidos = 0;
  for (let i = hojeIndex; i >= 0; i--) {
    if (dias[i]) diasSeguidos++;
    else break;
  }

  return NextResponse.json({
    proximoPasso,
    ativas,
    concluidas: concluidas.slice(0, 3),
    semana: {
      dias,
      diasPraticados,
      diasSeguidos,
      hojeIndex,
    },
  });
}
