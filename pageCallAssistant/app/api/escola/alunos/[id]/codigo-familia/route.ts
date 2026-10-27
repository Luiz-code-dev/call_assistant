import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { genFamilyCode, hashFamilyCode, FAMILY_CODE_TTL_DAYS, FAMILY_CODE_ACTIVATIONS } from "@/lib/escola/familia";

function flag() { return isEscolasEnabled(); }

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const student = await prismaEdu.eduStudent.findFirst({ where: { id: params.id, networkId: ctx.networkId } });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const code = genFamilyCode();
  const codeHash = hashFamilyCode(code);
  const expiresAt = new Date(Date.now() + FAMILY_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prismaEdu.eduFamilyCode.upsert({
    where: { studentId: student.id },
    create: { networkId: ctx.networkId, studentId: student.id, codeHash, activationsLeft: FAMILY_CODE_ACTIVATIONS, expiresAt },
    update: { codeHash, activationsLeft: FAMILY_CODE_ACTIVATIONS, expiresAt },
  });

  // Retorna o código em texto só uma vez (para imprimir no cartão).
  return NextResponse.json({ code, expiresAt, activationsLeft: FAMILY_CODE_ACTIVATIONS });
}
