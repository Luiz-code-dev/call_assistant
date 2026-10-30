import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Somente professores" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classSubjectId = searchParams.get("classSubjectId") ?? undefined;

  const lessons = await prismaEdu.eduLesson.findMany({
    where: {
      networkId: ctx.networkId,
      teacherId: ctx.userId,
      ...(classSubjectId ? { classSubjectId } : {}),
    },
    include: { objectives: { orderBy: { order: "asc" } } },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json({ lessons });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Somente professores" }, { status: 403 });

  const body = await req.json();
  const { classSubjectId, date, title, skillIds = [], materials = [], objectives = [], dueAt } = body;

  if (!classSubjectId || !date || !title) {
    return NextResponse.json({ error: "classSubjectId, date e title são obrigatórios" }, { status: 400 });
  }

  // Verifica que o professor está atribuído à oferta
  const offer = await prismaEdu.eduClassSubject.findFirst({
    where: { id: classSubjectId, teacherId: ctx.userId, networkId: ctx.networkId },
  });
  if (!offer) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 });

  const lesson = await prismaEdu.eduLesson.create({
    data: {
      networkId: ctx.networkId,
      classSubjectId,
      teacherId: ctx.userId,
      date: new Date(date),
      title,
      skillIds,
      materials,
      dueAt: dueAt ? new Date(dueAt) : null,
      objectives: {
        create: objectives.map((o: { text: string; skillId?: string }, i: number) => ({
          order: i + 1,
          text: o.text,
          skillId: o.skillId ?? null,
        })),
      },
    },
    include: { objectives: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
