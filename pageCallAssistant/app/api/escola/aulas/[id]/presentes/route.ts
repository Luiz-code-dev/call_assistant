import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const session = await prismaEdu.eduClassSession.findUnique({
      where: { id: params.id, networkId: ctx.networkId },
      include: { class: { select: { id: true, name: true } } },
    });
    if (!session) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    if (session.openedById !== ctx.userId && ctx.role !== "SCHOOL_ADMIN" && ctx.role !== "NETWORK_ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const total = await prismaEdu.eduEnrollment.count({
      where: { classId: session.classId, status: "ACTIVE" },
    });

    // Fix 5: EduSessionPresence agora existe no schema
    const presenceRows = await (prismaEdu as unknown as {
      eduSessionPresence: { findMany: (a: unknown) => Promise<{ studentId: string; enteredAt: Date }[]> }
    }).eduSessionPresence.findMany({
      where: { sessionId: params.id },
      select: { studentId: true, enteredAt: true },
      orderBy: { enteredAt: "asc" },
    });

    // Busca nomes dos alunos presentes
    const studentIds = presenceRows.map(p => p.studentId);
    const students = studentIds.length > 0
      ? await prismaEdu.eduStudent.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const nameMap = new Map<string, string>(students.map((s: { id: string; fullName: string }) => [s.id, s.fullName]));
    const displayName = (id: string): string => {
      const f: string = nameMap.get(id) ?? ""; const parts = f.split(" ");
      return `${parts[0]} ${parts.length > 1 ? (parts[parts.length-1][0] ?? "") + "." : ""}`.trim();
    };
    const presentes = presenceRows.map(pr => ({ id: pr.studentId, display: displayName(pr.studentId) }));

    // Bloqueados
    const enrollments = await prismaEdu.eduEnrollment.findMany({
      where: { classId: session.classId, status: "ACTIVE" },
      include: { student: { select: { id: true, fullName: true, pinFailedCount: true, pinLockedUntil: true } } },
    });
    const now = new Date();
    const bloqueados = enrollments
      .filter((e: { student: { pinLockedUntil: Date | null; pinFailedCount: number } }) => e.student.pinLockedUntil && e.student.pinLockedUntil > now)
      .map((e: { student: { id: string; fullName: string; pinFailedCount: number } }) => ({ id: e.student.id, display: displayName(e.student.id), failedCount: e.student.pinFailedCount }));

    return NextResponse.json({ total, presentes, bloqueados, sessionClosed: !!session.closedAt });
  } catch (err) {
    console.error("[api/aulas/presentes]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
