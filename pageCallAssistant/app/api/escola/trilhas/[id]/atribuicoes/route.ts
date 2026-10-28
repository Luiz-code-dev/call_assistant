/**
 * GET  /api/escola/trilhas/[id]/atribuicoes  — progresso por aluno
 * PATCH /api/escola/trilhas/[id]/atribuicoes/[aid] está em [aid]/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const track = await p.eduTrack.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
    select: { id: true, items: { select: { id: true } } },
  });
  if (!track) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const totalItems = track.items.length;

  const assignments = await p.eduTrackAssignment.findMany({
    where: { trackId: params.id, networkId: ctx.networkId, endedAt: null },
    select: {
      id: true, classId: true, studentId: true, dueAt: true, forced: true, startsAt: true,
      progress: { select: { studentId: true, completedItemIds: true, lastActivityAt: true, completedAt: true } },
    },
    orderBy: { startsAt: "desc" as const },
  });

  const result = assignments.map((a: {
    id: string; classId: string | null; studentId: string | null; dueAt: Date | null;
    forced: boolean; startsAt: Date;
    progress: { studentId: string; completedItemIds: string[]; lastActivityAt: Date | null; completedAt: Date | null }[];
  }) => ({
    id: a.id,
    classId: a.classId,
    studentId: a.studentId,
    dueAt: a.dueAt,
    forced: a.forced,
    startsAt: a.startsAt,
    totalItems,
    alunos: a.progress.map(pr => ({
      studentId: pr.studentId,
      concluidos: pr.completedItemIds.length,
      totalItems,
      lastActivityAt: pr.lastActivityAt,
      completedAt: pr.completedAt,
    })),
  }));

  return NextResponse.json({ assignments: result });
}
