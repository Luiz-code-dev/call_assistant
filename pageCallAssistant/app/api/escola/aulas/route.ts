import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import crypto from "crypto";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

// Characters that avoid visual ambiguity (no 0/O, 1/I/l)
const SESSION_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateSessionCode(): string {
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) code += SESSION_CHARS[bytes[i] % SESSION_CHARS.length];
  return code;
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Somente professores podem abrir aulas" }, { status: 403 });

  const { classId, durationMinutes = 120 } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId obrigatório" }, { status: 400 });

  // Verify teacher is assigned to a subject in this class
  const offer = await prismaEdu.eduClassSubject.findFirst({ where: { classId, teacherId: ctx.userId } });
  if (!offer) return NextResponse.json({ error: "Você não é professor desta turma" }, { status: 403 });

  // Close any open sessions for this class
  await prismaEdu.eduClassSession.updateMany({
    where: { classId, closedAt: null },
    data: { closedAt: new Date() },
  });

  // Generate unique code
  let code = generateSessionCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prismaEdu.eduClassSession.findUnique({ where: { code } });
    if (!existing) break;
    code = generateSessionCode();
    attempts++;
  }

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const session = await prismaEdu.eduClassSession.create({
    data: { networkId: ctx.networkId, classId, openedById: ctx.userId, code, expiresAt },
  });

  return NextResponse.json({ sessionId: session.id, code, expiresAt }, { status: 201 });
}

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const sessions = await prismaEdu.eduClassSession.findMany({
    where: { networkId: ctx.networkId, openedById: ctx.userId, closedAt: null, expiresAt: { gt: new Date() } },
    include: { class: { select: { name: true, gradeYear: true, shift: true } } },
    orderBy: { expiresAt: "asc" },
  });
  return NextResponse.json({ sessions });
}
