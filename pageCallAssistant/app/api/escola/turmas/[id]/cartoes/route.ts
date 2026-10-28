/**
 * GET /api/escola/turmas/[id]/cartoes
 * Gera dados para os cartoes de acesso dos alunos (8 por folha A4).
 * Acesso: TEACHER, SCHOOL_ADMIN, NETWORK_ADMIN da mesma rede.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { studentSecret } from "@/lib/escola/secrets";
import { publicOrigin } from "@/lib/escola/public-url";
import { SignJWT } from "jose";

function flag() { return isEscolasEnabled(); }

const SHIFT_LABEL: Record<string, string> = {
  MORNING: "Manhã", AFTERNOON: "Tarde", EVENING: "Noturno", FULL_TIME: "Integral",
};

async function signCardToken(studentId: string, cardVersion: number): Promise<string> {
  return new SignJWT({ studentId, cardVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("student-card")
    .setIssuedAt()
    .sign(studentSecret());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaEduAny = any;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["TEACHER","SCHOOL_ADMIN","NETWORK_ADMIN"].includes(ctx.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const cls = await prismaEdu.eduClass.findFirst({
      where: { id: params.id, networkId: ctx.networkId },
      include: { school: { select: { name: true } } },
    });
    if (!cls) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });

    const enrollments = await prismaEdu.eduEnrollment.findMany({
      where: { classId: params.id, status: "ACTIVE" },
      include: { student: { select: { id: true, fullName: true, cardVersion: true, loginMode: true } } },
      orderBy: { student: { fullName: "asc" } },
    });

    const origin = publicOrigin(req);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

    const cards = await Promise.all(enrollments.map(async (e: PrismaEduAny, i: number) => {
      const s = e.student;
      const token = await signCardToken(s.id, s.cardVersion);
      const qrUrl = `${baseUrl}/escola/aluno/entrar?card=${encodeURIComponent(token)}`;
      return { num: i + 1, name: s.fullName, loginMode: s.loginMode, cardVersion: s.cardVersion, qrUrl, studentId: s.id };
    }));

    return NextResponse.json({
      className: cls.name, gradeYear: cls.gradeYear,
      shift: SHIFT_LABEL[cls.shift] ?? cls.shift,
      schoolName: cls.school.name, cards,
    });
  } catch (err) {
    console.error("[api/turmas/cartoes]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
