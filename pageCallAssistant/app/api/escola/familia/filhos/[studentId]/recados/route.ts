/**
 * Recados da família para o filho.
 * GET: os últimos recados enviados (com "lido").  POST {kind, text}: envia um recado.
 * Só para os próprios filhos (outro aluno dá 404).
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent } from "@/lib/escola/family-guard";
import { validarRecado, MAX_RECADOS_POR_DIA } from "@/lib/escola/recados";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */

async function contexto(studentId: string) {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getFamilyContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (ctx.db) setTenantDb(ctx.db);
  if (!(await guardianOwnsStudent(ctx.guardianId, studentId))) {
    return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  }
  // O cliente da rede vai junto: setTenantDb dentro desta função não chega ao handler
  // (AsyncLocalStorage), e o prismaEdu falhava fora daqui
  return { ctx, db: ctx.db ?? prismaEdu };
}

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  const { ctx, db, erro } = await contexto(params.studentId);
  if (erro) return erro;
  const P = db as any;
  const recados = await P.eduFamilyMessage.findMany({
    where: { networkId: ctx!.networkId, studentId: params.studentId },
    orderBy: { createdAt: "desc" }, take: 20,
    select: { id: true, kind: true, text: true, createdAt: true, readAt: true, guardianId: true },
  });
  return NextResponse.json({
    recados: recados.map((r: any) => ({ id: r.id, kind: r.kind, text: r.text, createdAt: r.createdAt, lido: !!r.readAt, meu: r.guardianId === ctx!.guardianId })),
  });
}

export async function POST(req: Request, { params }: { params: { studentId: string } }) {
  const { ctx, db, erro } = await contexto(params.studentId);
  if (erro) return erro;
  const P = db as any;
  const v = validarRecado(await req.json().catch(() => null));
  if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
  const desde = new Date(Date.now() - 86_400_000);
  const hoje = await P.eduFamilyMessage.count({ where: { networkId: ctx!.networkId, guardianId: ctx!.guardianId, studentId: params.studentId, createdAt: { gte: desde } } });
  if (hoje >= MAX_RECADOS_POR_DIA) return NextResponse.json({ error: "Limite de recados de hoje atingido." }, { status: 429 });
  const r = await P.eduFamilyMessage.create({
    data: { networkId: ctx!.networkId, guardianId: ctx!.guardianId, studentId: params.studentId, kind: v.kind, text: v.text },
    select: { id: true, kind: true, text: true, createdAt: true },
  });
  return NextResponse.json({ recado: { ...r, lido: false, meu: true } }, { status: 201 });
}
