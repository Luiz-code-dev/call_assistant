import { NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const assignments = await (prismaEdu as any).eduTrackAssignment.findMany({
    where: {
      networkId: student.networkId,
      OR: [
        { classId: student.classId },
        { studentId: student.studentId },
      ],
    },
    include: {
      track: { include: { items: { orderBy: { order: "asc" } } } },
      progress: { where: { studentId: student.studentId } },
    },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({
    assignments: assignments.map((a: any) => ({
      assignment: { id: a.id, track: a.track, dueAt: a.dueAt },
      progress: a.progress[0] ?? null,
    })),
  });
}
