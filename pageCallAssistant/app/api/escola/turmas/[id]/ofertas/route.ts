import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const subjects = await prismaEdu.eduClassSubject.findMany({
    where: { classId: params.id, networkId: ctx.networkId },
    include: { subject: { select: { name: true, color: true } } },
  });
  return NextResponse.json({ subjects });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { subjectId, teacherId } = await req.json();
  const offer = await prismaEdu.eduClassSubject.update({
    where: { classId_subjectId: { classId: params.id, subjectId } },
    data: { teacherId },
  });
  return NextResponse.json({ offer });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN", "COORDINATOR"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { subjectId, teacherId } = await req.json();
  const cls = await prismaEdu.eduClass.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!cls) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  const offer = await prismaEdu.eduClassSubject.create({
    data: { networkId: ctx.networkId, classId: params.id, subjectId, teacherId: teacherId || null, isExtra: true },
  });
  return NextResponse.json({ offer }, { status: 201 });
}
