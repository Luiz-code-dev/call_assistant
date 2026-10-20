import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import bcrypt from "bcryptjs";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

function genPin() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { rows } = await req.json();
  if (!Array.isArray(rows)) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  let success = 0;
  const errors: { line: number; msg: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.error) { errors.push({ line: row.line ?? i + 1, msg: row.error }); continue; }
    try {
      const { enrollmentCode, fullName, birthDate, classId } = row;
      if (!enrollmentCode || !fullName) { errors.push({ line: i + 1, msg: "Matrícula e nome são obrigatórios" }); continue; }
      const pin = genPin();
      const pinHash = await bcrypt.hash(pin, 10);
      const existing = await prismaEdu.eduStudent.findUnique({ where: { networkId_enrollmentCode: { networkId: ctx.networkId, enrollmentCode } } });
      let student;
      if (existing) {
        student = existing;
      } else {
        student = await prismaEdu.eduStudent.create({
          data: { networkId: ctx.networkId, enrollmentCode, fullName, birthDate: birthDate ? new Date(birthDate) : null, pinHash },
        });
      }
      if (classId && !existing) {
        const cls = await prismaEdu.eduClass.findUnique({ where: { id: classId, networkId: ctx.networkId } });
        if (cls) await prismaEdu.eduEnrollment.create({ data: { networkId: ctx.networkId, studentId: student.id, classId, schoolYearId: cls.schoolYearId } });
      }
      success++;
    } catch (e: unknown) {
      errors.push({ line: i + 1, msg: (e as Error).message ?? "Erro desconhecido" });
    }
  }

  return NextResponse.json({ success, errors });
}
