import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const offer = await prismaEdu.eduClassSubject.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
    include: { class: { select: { id: true } } },
  });
  if (!offer) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 });
  if (ctx.role === "TEACHER" && offer.teacherId !== ctx.userId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const enrollments = await prismaEdu.eduEnrollment.findMany({
    where: { classId: offer.class?.id, status: "ACTIVE" },
    include: { student: { select: { id: true, fullName: true, enrollmentCode: true } } },
    orderBy: { student: { fullName: "asc" } },
  });
  const students = enrollments.map((e: { student: { id: string; fullName: string; enrollmentCode: string } }) => ({
    id: e.student.id, studentId: e.student.id, fullName: e.student.fullName, enrollmentCode: e.student.enrollmentCode,
  }));
  return NextResponse.json({ students });
}
