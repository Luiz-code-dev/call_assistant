import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

function flag() { return isEscolasEnabled(); }

// Gera código de família de 8 caracteres sem letras/números ambíguos.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genFamilyCode(): string {
  let c = "";
  for (let i = 0; i < 8; i++) c += ALPHABET[randomInt(ALPHABET.length)];
  return c;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const student = await prismaEdu.eduStudent.findFirst({ where: { id: params.id, networkId: ctx.networkId } });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const code = genFamilyCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000); // 120 dias

  await prismaEdu.eduFamilyCode.upsert({
    where: { studentId: student.id },
    create: { networkId: ctx.networkId, studentId: student.id, codeHash, activationsLeft: 3, expiresAt },
    update: { codeHash, activationsLeft: 3, expiresAt },
  });

  // Retorna o código em texto só uma vez (para imprimir no cartão).
  return NextResponse.json({ code, expiresAt, activationsLeft: 3 });
}
