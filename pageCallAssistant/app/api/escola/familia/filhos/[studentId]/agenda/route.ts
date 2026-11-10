/**
 * Agenda de estudos do filho, montada pela família.
 * GET: itens ativos.  POST {weekdays[], time "HH:MM", subjectCode?, minutes?}: cria um item por dia.
 * DELETE ?id=: remove (desativa) um item.  Só para os próprios filhos.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { guardianOwnsStudent } from "@/lib/escola/family-guard";
import { validarAgenda } from "@/lib/escola/recados";

/* eslint-disable @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática */
const MAX_ITENS = 21;

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

async function listar(P: any, networkId: string, studentId: string) {
  return P.eduStudyPlanItem.findMany({
    where: { networkId, studentId, isActive: true },
    orderBy: [{ weekday: "asc" }, { time: "asc" }],
    select: { id: true, weekday: true, time: true, subjectCode: true, minutes: true },
  });
}

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  const { ctx, db, erro } = await contexto(params.studentId);
  if (erro) return erro;
  const P = db as any;
  return NextResponse.json({ itens: await listar(P, ctx!.networkId, params.studentId) });
}

export async function POST(req: Request, { params }: { params: { studentId: string } }) {
  const { ctx, db, erro } = await contexto(params.studentId);
  if (erro) return erro;
  const P = db as any;
  const v = validarAgenda(await req.json().catch(() => null));
  if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
  const atuais = await P.eduStudyPlanItem.count({ where: { networkId: ctx!.networkId, studentId: params.studentId, isActive: true } });
  if (atuais + v.weekdays.length > MAX_ITENS) return NextResponse.json({ error: "A agenda já está cheia." }, { status: 400 });
  for (const weekday of v.weekdays) {
    await P.eduStudyPlanItem.create({
      data: { networkId: ctx!.networkId, guardianId: ctx!.guardianId, studentId: params.studentId, weekday, time: v.time, subjectCode: v.subjectCode, minutes: v.minutes },
    });
  }
  return NextResponse.json({ itens: await listar(P, ctx!.networkId, params.studentId) }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { studentId: string } }) {
  const { ctx, db, erro } = await contexto(params.studentId);
  if (erro) return erro;
  const P = db as any;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Item não informado." }, { status: 400 });
  await P.eduStudyPlanItem.updateMany({ where: { id, networkId: ctx!.networkId, studentId: params.studentId }, data: { isActive: false } });
  return NextResponse.json({ itens: await listar(P, ctx!.networkId, params.studentId) });
}
