/**
 * Recados da família para o aluno.
 * GET: recados dos últimos 14 dias (os não lidos primeiro).  POST {id}: marca como lido.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { primeiroNome } from "@/lib/escola/recados";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
const P = prismaEdu as any;
// Sempre do banco: o aluno precisa ver o recado que acabou de chegar
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const desde = new Date(Date.now() - 14 * 86_400_000);
  const recados = await P.eduFamilyMessage.findMany({
    where: { networkId: ctx.networkId, studentId: ctx.studentId, createdAt: { gte: desde } },
    orderBy: { createdAt: "desc" }, take: 10,
    select: { id: true, kind: true, text: true, createdAt: true, readAt: true, guardianId: true },
  });
  const ids = Array.from(new Set(recados.map((r: any) => r.guardianId)));
  const gs = ids.length ? await P.eduGuardian.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nome = new Map<string, string>(gs.map((g: any) => [g.id, primeiroNome(g.name)]));
  const lista = recados
    .map((r: any) => ({ id: r.id, kind: r.kind, text: r.text, createdAt: r.createdAt, lido: !!r.readAt, de: nome.get(r.guardianId) || "" }))
    .sort((a: any, b: any) => Number(a.lido) - Number(b.lido));
  return NextResponse.json({ recados: lista });
}

export async function POST(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "Recado não informado." }, { status: 400 });
  await P.eduFamilyMessage.updateMany({ where: { id, networkId: ctx.networkId, studentId: ctx.studentId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
