/**
 * GET /api/escola/professor/alertas
 * Retorna alertas do professor logado (trilhas concluídas, alunos travados, não começaram).
 * PATCH /api/escola/professor/alertas — marca todos como lidos.
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

export async function GET(_: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // O aviso guarda só os ids do aluno e da trilha (não há relação no banco): busca os nomes à parte.
  const brutos: Array<{ id: string; studentId: string | null; trackId: string | null; readAt: Date | null }> =
    await p.eduTeacherAlert.findMany({
      where: { networkId: ctx.networkId, teacherUserId: ctx.userId },
      orderBy: { createdAt: "desc" as const },
      take: 20,
    });
  const alunoIds = brutos.map((a) => a.studentId).filter((v): v is string => Boolean(v));
  const trilhaIds = brutos.map((a) => a.trackId).filter((v): v is string => Boolean(v));
  const [alunos, trilhas]: [Array<{ id: string; fullName: string }>, Array<{ id: string; title: string }>] = await Promise.all([
    alunoIds.length ? p.eduStudent.findMany({ where: { id: { in: alunoIds }, networkId: ctx.networkId }, select: { id: true, fullName: true } }) : [],
    trilhaIds.length ? p.eduTrack.findMany({ where: { id: { in: trilhaIds } }, select: { id: true, title: true } }) : [],
  ]);
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));
  const tituloTrilha = new Map(trilhas.map((t) => [t.id, t.title]));
  const alertas = brutos.map((a) => ({
    ...a,
    student: a.studentId && nomeAluno.has(a.studentId) ? { fullName: nomeAluno.get(a.studentId) } : null,
    track: a.trackId && tituloTrilha.has(a.trackId) ? { title: tituloTrilha.get(a.trackId) } : null,
  }));

  const naoLidos = alertas.filter((a: { readAt: Date | null }) => !a.readAt).length;

  return NextResponse.json({ alertas, naoLidos });
}

export async function PATCH(_: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await p.eduTeacherAlert.updateMany({
    where: { networkId: ctx.networkId, teacherUserId: ctx.userId, readAt: null },
    data:  { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
