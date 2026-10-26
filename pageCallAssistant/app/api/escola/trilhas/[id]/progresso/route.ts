import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const assignment = await (prismaEdu as any).eduTrackAssignment.findFirst({
    where: {
      trackId: params.id,
      networkId: student.networkId,
      OR: [{ classId: student.classId }, { studentId: student.studentId }],
    },
    include: {
      track: { include: { items: { orderBy: { order: "asc" } } } },
      progress: { where: { studentId: student.studentId } },
    },
  });
  if (!assignment) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    assignment,
    progress: assignment.progress[0] ?? null,
  });
}

const patchSchema = z.object({
  assignmentId: z.string().min(1),
  completedItemId: z.string().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { assignmentId, completedItemId } = parsed.data;

  const existing = await (prismaEdu as any).eduTrackProgress.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: student.studentId } },
  });

  const completedItemIds: string[] = existing?.completedItemIds ?? [];
  if (!completedItemIds.includes(completedItemId)) completedItemIds.push(completedItemId);

  const progress = await (prismaEdu as any).eduTrackProgress.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.studentId } },
    create: {
      networkId: student.networkId,
      assignmentId,
      studentId: student.studentId,
      completedItemIds,
      lastActivityAt: new Date(),
    },
    update: { completedItemIds, lastActivityAt: new Date() },
  });
  return NextResponse.json({ progress });
}
