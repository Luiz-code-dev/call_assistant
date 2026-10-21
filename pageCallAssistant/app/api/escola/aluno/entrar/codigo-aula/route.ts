import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

/** Public endpoint: student enters session code → returns list of first names for class selection */
export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { code } = await req.json();
  if (!code || typeof code !== "string" || code.length !== 6) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  try {
    const session = await prismaEdu.eduClassSession.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { class: { select: { id: true, name: true, gradeYear: true, defaultLoginMode: true } } },
    });

    if (!session || session.closedAt || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Código inválido ou aula encerrada" }, { status: 404 });
    }

    const enrollments = await prismaEdu.eduEnrollment.findMany({
      where: { classId: session.classId, status: "ACTIVE" },
      include: { student: { select: { id: true, fullName: true, loginMode: true } } },
      orderBy: { student: { fullName: "asc" } },
    });

    const students = enrollments.map((e: { student: { id: string; fullName: string; loginMode: string } }) => {
      const names = e.student.fullName.split(" ");
      const display = `${names[0]} ${names.length > 1 ? names[names.length - 1][0] + "." : ""}`.trim();
      return { id: e.student.id, display, loginMode: e.student.loginMode };
    });

    return NextResponse.json({
      sessionId: session.id,
      classId: session.classId,
      className: session.class.name,
      gradeYear: session.class.gradeYear,
      defaultLoginMode: session.class.defaultLoginMode,
      expiresAt: session.expiresAt,
      students,
    });
  } catch (err) {
    console.error("[codigo-aula]", err);
    return NextResponse.json({ error: "Código inválido ou aula encerrada" }, { status: 404 });
  }
}
