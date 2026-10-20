import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import bcrypt from "bcryptjs";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","SCHOOL_ADMIN","TEACHER"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { pin } = await req.json();
  if (!pin || !/^\d{6}$/.test(pin)) return NextResponse.json({ error: "PIN deve ter 6 dígitos" }, { status: 400 });
  const student = await prismaEdu.eduStudent.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  const pinHash = await bcrypt.hash(pin, 10);
  await prismaEdu.eduStudent.update({ where: { id: params.id }, data: { pinHash, pinFailedCount: 0, pinLockedUntil: null } });
  await prismaEdu.eduAuditLog.create({ data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "student.pin.reset", entity: "EduStudent", entityId: params.id } });
  return NextResponse.json({ ok: true });
}
