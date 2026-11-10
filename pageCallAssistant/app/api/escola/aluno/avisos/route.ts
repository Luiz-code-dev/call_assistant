/**
 * Avisos do aluno (web push).
 * GET: { ativo, chave } — se este aparelho já está inscrito precisa vir do navegador; aqui só a chave pública.
 * POST {endpoint, keys:{p256dh, auth}}: inscreve o aparelho.  DELETE {endpoint}: desinscreve.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { avisosConfigurados } from "@/lib/escola/avisos";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
const P = prismaEdu as any;

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json({ disponivel: avisosConfigurados(), chave: process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_KEY ?? "" });
}

export async function POST(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!b.endpoint || !/^https:\/\//.test(b.endpoint) || !b.keys?.p256dh || !b.keys?.auth) {
    return NextResponse.json({ error: "Inscrição inválida." }, { status: 400 });
  }
  // O mesmo aparelho pode ter sido de outro aluno (aparelho de casa): passa a ser deste
  await P.eduPushSubscription.deleteMany({ where: { endpoint: b.endpoint } });
  await P.eduPushSubscription.create({
    data: { networkId: ctx.networkId, studentId: ctx.studentId, endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (b.endpoint) await P.eduPushSubscription.deleteMany({ where: { endpoint: b.endpoint, studentId: ctx.studentId } });
  return NextResponse.json({ ok: true });
}
