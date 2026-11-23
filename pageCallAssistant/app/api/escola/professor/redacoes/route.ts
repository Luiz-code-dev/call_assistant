/**
 * GET  /api/escola/professor/redacoes -> { propostas, turmas, generos }
 * POST /api/escola/professor/redacoes -> cria uma proposta de redação para uma turma
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { PAPEIS_REDACAO, turmasDaRedacao, turmaPermitida } from "@/lib/escola/redacao-acesso";
import { GENEROS, generoValido, MAX_PALAVRAS } from "@/lib/escola/redacao";

export const runtime = "nodejs";

function inteiro(v: unknown, padrao: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : padrao;
}

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!PAPEIS_REDACAO.has(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (ctx.db) setTenantDb(ctx.db);
  const db = ctx.db ?? prismaEdu;

  const turmas = await turmasDaRedacao(db, ctx);
  const ids = turmas.map((t) => t.id);
  const propostas = ids.length
    ? await db.eduEssayPrompt.findMany({ where: { networkId: ctx.networkId, classId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 200 })
    : [];

  // Contagens: alunos ativos por turma; textos enviados e revisados (última versão de cada aluno)
  const matriculas = ids.length
    ? await db.eduEnrollment.groupBy({ by: ["classId"], where: { networkId: ctx.networkId, classId: { in: ids }, status: "ACTIVE" }, _count: { _all: true } })
    : [];
  const alunosPorTurma = new Map<string, number>(matriculas.map((m: { classId: string; _count: { _all: number } }) => [m.classId, m._count._all]));
  const textos = propostas.length
    ? await db.eduEssay.findMany({
        where: { networkId: ctx.networkId, promptId: { in: propostas.map((p: { id: string }) => p.id) }, status: { not: "DRAFT" } },
        select: { promptId: true, studentId: true, status: true, version: true },
        orderBy: { version: "desc" },
      })
    : [];
  const ultima = new Map<string, { promptId: string; status: string }>();
  for (const t of textos) if (!ultima.has(`${t.promptId}:${t.studentId}`)) ultima.set(`${t.promptId}:${t.studentId}`, t);

  const nomeDaTurma = new Map(turmas.map((t) => [t.id, t] as const));
  return NextResponse.json({
    turmas,
    generos: Object.entries(GENEROS).map(([id, nome]) => ({ id, nome })),
    propostas: propostas.map((p: { id: string; classId: string; title: string; genre: string; isOpen: boolean; dueAt: Date | null; createdAt: Date; ownerStudentId: string | null }) => {
      const desta = Array.from(ultima.values()).filter((u) => u.promptId === p.id);
      return {
        id: p.id, titulo: p.title, genero: p.genre, aberta: p.isOpen, prazo: p.dueAt, criadaEm: p.createdAt,
        turma: nomeDaTurma.get(p.classId)?.name ?? "", escola: nomeDaTurma.get(p.classId)?.schoolName ?? "",
        alunos: p.ownerStudentId ? 1 : alunosPorTurma.get(p.classId) ?? 0,
        /** Redação da escola que o próprio aluno trouxe para o Flow ler */
        doAluno: !!p.ownerStudentId,
        enviadas: desta.length,
        paraRevisar: desta.filter((u) => u.status === "FEEDBACK" || u.status === "SUBMITTED").length,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!PAPEIS_REDACAO.has(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (ctx.db) setTenantDb(ctx.db);
  const db = ctx.db ?? prismaEdu;

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const titulo = String(b.titulo ?? "").trim().slice(0, 160);
  const enunciado = String(b.enunciado ?? "").trim().slice(0, 3000);
  if (titulo.length < 3) return NextResponse.json({ error: "Dê um título para a proposta." }, { status: 400 });
  if (enunciado.length < 10) return NextResponse.json({ error: "Escreva o enunciado da proposta." }, { status: 400 });
  if (!generoValido(b.genero)) return NextResponse.json({ error: "Escolha o gênero do texto." }, { status: 400 });

  const turma = await turmaPermitida(db, ctx, String(b.classId ?? ""));
  if (!turma) return NextResponse.json({ error: "Turma não encontrada ou fora do seu acesso." }, { status: 403 });

  const minWords = inteiro(b.minPalavras, 60, 10, 1000);
  const maxWords = inteiro(b.maxPalavras, 600, minWords + 10, MAX_PALAVRAS);
  let dueAt: Date | null = null;
  if (b.prazo) {
    const d = new Date(String(b.prazo));
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Prazo inválido." }, { status: 400 });
    dueAt = d;
  }

  const p = await db.eduEssayPrompt.create({
    data: {
      networkId: ctx.networkId, schoolId: turma.schoolId, classId: turma.id, createdById: ctx.userId,
      title: titulo, instructions: enunciado, genre: b.genero, minWords, maxWords,
      maxVersions: inteiro(b.maxVersoes, 3, 1, 5), dueAt,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: p.id }, { status: 201 });
}
