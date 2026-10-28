import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

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

    // Total de alunos matriculados
    const total = await prismaEdu.eduEnrollment.count({
      where: { classId: session.classId, status: "ACTIVE" },
    });

    // Alunos que entraram: rastreados via EduSessionPresence (se existir) ou contagem de tokens ativos
    // Como EduSessionPresence ainda não existe no schema, usamos EduEnrollment como referência
    // e marcamos quem tem pinFailedCount >= 5 como bloqueado
    const enrollments = await prismaEdu.eduEnrollment.findMany({
      where: { classId: session.classId, status: "ACTIVE" },
      include: { student: { select: { id: true, fullName: true, pinFailedCount: true, pinLockedUntil: true } } },
      orderBy: { student: { fullName: "asc" } },
    });

    const now = new Date();
    const bloqueados = enrollments
      .filter((e: { student: { pinLockedUntil: Date | null; pinFailedCount: number } }) =>
        e.student.pinLockedUntil && e.student.pinLockedUntil > now)
      .map((e: { student: { id: string; fullName: string; pinFailedCount: number } }) => {
        const names = e.student.fullName.split(" ");
        const display = `${names[0]} ${names.length > 1 ? names[names.length - 1][0] + "." : ""}`.trim();
        return { id: e.student.id, display, failedCount: e.student.pinFailedCount };
      });

    // Presença registrada via EduStudentPresence (se existir no schema futuro)
    // Por ora: retorna dados básicos da sessão + bloqueados
    let presentes: { id: string; display: string }[] = [];
    try {
      const presence = await p.eduSessionPresence.findMany({
        where: { sessionId: params.id },
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
      });
      presentes = presence.map((pr: { student: { id: string; fullName: string } }) => {
        const names = pr.student.fullName.split(" ");
        return { id: pr.student.id, display: `${names[0]} ${names.length > 1 ? names[names.length - 1][0] + "." : ""}`.trim() };
      });
    } catch {
      // EduSessionPresence ainda não existe — presentes fica vazio
    }

    return NextResponse.json({ total, presentes, bloqueados, sessionClosed: !!session.closedAt });
  } catch (err) {
    console.error("[api/aulas/presentes]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
