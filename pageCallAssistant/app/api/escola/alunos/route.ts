import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import bcrypt from "bcryptjs";

function flag() { return isEscolasEnabled(); }

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const search = new URL(req.url).searchParams.get("search") ?? "";
  const where: Record<string, unknown> = { networkId: ctx.networkId };
  if (search) where["OR"] = [{ fullName: { contains: search, mode: "insensitive" } }, { enrollmentCode: { contains: search } }];
  const students = await prismaEdu.eduStudent.findMany({
    where,
    include: { enrollments: { where: { status: "ACTIVE" }, include: { class: { select: { name: true } } }, take: 1, orderBy: { startedAt: "desc" } } },
    orderBy: { fullName: "asc" },
    take: 100,
  });
  return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { enrollmentCode, fullName, birthDate, classId, pin } = await req.json();
  if (!enrollmentCode || !fullName || !pin) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: "PIN deve ter 6 dígitos" }, { status: 400 });
  const pinHash = await bcrypt.hash(pin, 10);
  const existing = await prismaEdu.eduStudent.findUnique({ where: { networkId_enrollmentCode: { networkId: ctx.networkId, enrollmentCode } } });
  if (existing) return NextResponse.json({ error: "Matrícula já cadastrada" }, { status: 409 });
  const student = await prismaEdu.eduStudent.create({
    data: { networkId: ctx.networkId, enrollmentCode, fullName, birthDate: birthDate ? new Date(birthDate) : null, pinHash },
  });
  if (classId) {
    const cls = await prismaEdu.eduClass.findUnique({ where: { id: classId, networkId: ctx.networkId }, include: { schoolYear: true } });
    if (cls) {
      await prismaEdu.eduEnrollment.create({ data: { networkId: ctx.networkId, studentId: student.id, classId, schoolYearId: cls.schoolYearId, status: "ACTIVE" } });
    }
  }
  return NextResponse.json({ student }, { status: 201 });
}
