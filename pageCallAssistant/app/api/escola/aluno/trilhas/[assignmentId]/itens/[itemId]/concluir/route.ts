/**
 * POST /api/escola/aluno/trilhas/[assignmentId]/itens/[itemId]/concluir
 * Marca o item como concluído em EduTrackProgress.completedItemIds.
 * Se todas as atividades foram feitas (ou Domina em todas as habilidades),
 * seta completedAt e cria aviso ao professor.
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

export async function POST(
  _req: NextRequest,
  { params }: { params: { assignmentId: string; itemId: string } }
) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { assignmentId, itemId } = params;

  const assignment = await p.eduTrackAssignment.findUnique({
    where: { id: assignmentId, networkId: student.networkId, endedAt: null },
    include: {
      track: {
        select: {
          id: true,
          skillIds: true,
          createdById: true,
          items: { select: { id: true } },
        },
      },
    },
  });
  if (!assignment) return NextResponse.json({ error: "Atribuição não encontrada" }, { status: 404 });

  const itemBelongs = assignment.track.items.some((it: { id: string }) => it.id === itemId);
  if (!itemBelongs) return NextResponse.json({ error: "Item não pertence a esta trilha" }, { status: 404 });

  const existing = await p.eduTrackProgress.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: student.studentId } },
  });

  const prevCompleted: string[] = existing?.completedItemIds ?? [];
  if (prevCompleted.includes(itemId)) {
    return NextResponse.json({ ok: true, jaConcluidoAntes: true });
  }

  const newCompleted  = [...prevCompleted, itemId];
  const totalItems    = assignment.track.items.length;
  const allItemsDone  = newCompleted.length >= totalItems;

  let allMastered = false;
  if (!allItemsDone && assignment.track.skillIds.length > 0) {
    const masteries = await p.eduSkillMastery.findMany({
      where: {
        networkId: student.networkId,
        studentId: student.studentId,
        skillId: { in: assignment.track.skillIds },
        level: "MASTERED",
      },
      select: { skillId: true },
    });
    allMastered = masteries.length >= assignment.track.skillIds.length;
  }

  const trilhaConcluida = allItemsDone || allMastered;
  const now = new Date();

  await p.eduTrackProgress.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.studentId } },
    create: {
      networkId: student.networkId,
      assignmentId,
      studentId: student.studentId,
      completedItemIds: newCompleted,
      lastActivityAt: now,
      completedAt: trilhaConcluida ? now : null,
    },
    update: {
      completedItemIds: newCompleted,
      lastActivityAt: now,
      ...(trilhaConcluida && !existing?.completedAt ? { completedAt: now } : {}),
    },
  });

  if (trilhaConcluida && !existing?.completedAt) {
    await p.eduTeacherAlert.create({
      data: {
        networkId: student.networkId,
        teacherUserId: assignment.track.createdById,
        type: "TRACK_COMPLETED",
        studentId: student.studentId,
        trackId: assignment.track.id,
        createdAt: now,
      },
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, trilhaConcluida });
}
