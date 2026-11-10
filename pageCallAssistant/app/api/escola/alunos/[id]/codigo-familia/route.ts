import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { FAMILY_CODE_ACTIVATIONS } from "@/lib/escola/familia";
import { gerarCodigoFamilia } from "@/lib/escola/codigo-familia";

function flag() { return isEscolasEnabled(); }

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const student = await prismaEdu.eduStudent.findFirst({ where: { id: params.id, networkId: ctx.networkId } });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  // Gera e registra no catálogo (o primeiro acesso da família acha a escola por ele)
  const { codigo: code, expiresAt } = await gerarCodigoFamilia(ctx.db ?? prismaEdu, ctx.networkId, student.id);

  // Retorna o código em texto só uma vez (para imprimir no cartão).
  return NextResponse.json({ code, expiresAt, activationsLeft: FAMILY_CODE_ACTIVATIONS });
}
