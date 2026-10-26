import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const offer = await prismaEdu.eduClassSubject.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!offer) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 });
  if (ctx.role === "TEACHER" && offer.teacherId !== ctx.userId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const assessments = await prismaEdu.eduAssessment.findMany({
    where: { classSubjectId: params.id, networkId: ctx.networkId },
    include: { term: { select: { name: true } }, _count: { select: { entries: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assessments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const offer = await prismaEdu.eduClassSubject.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!offer) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 });
  if (ctx.role === "TEACHER" && offer.teacherId !== ctx.userId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { title, type, termId, weight, maxScore } = await req.json();
  if (!title || !type) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  const assessment = await prismaEdu.eduAssessment.create({
    data: { networkId: ctx.networkId, classSubjectId: params.id, termId: termId || null, title, type, weight: +weight || 1, maxScore: +maxScore || 10, status: "DRAFT" },
  });
  return NextResponse.json({ assessment }, { status: 201 });
}
