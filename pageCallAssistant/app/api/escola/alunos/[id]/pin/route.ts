import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import bcrypt from "bcryptjs";

function flag() { return isEscolasEnabled(); }

function gerarPinNumerico(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN","SCHOOL_ADMIN","TEACHER"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const student = await prismaEdu.eduStudent.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  // Suporta body vazio (geração no servidor) ou body com pin explícito
  let pin: string;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.pin && /^\d{6}$/.test(body.pin)) {
      pin = body.pin;
    } else {
      pin = gerarPinNumerico();
    }
  } catch {
    pin = gerarPinNumerico();
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await prismaEdu.eduStudent.update({ where: { id: params.id }, data: { pinHash, pinFailedCount: 0, pinLockedUntil: null } });
  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "user", actorId: ctx.userId, action: "student.pin.reset", entity: "EduStudent", entityId: params.id },
  });
  // Retorna o PIN gerado (visível UMA VEZ para impressão do comprovante)
  return NextResponse.json({ ok: true, pin });
}
