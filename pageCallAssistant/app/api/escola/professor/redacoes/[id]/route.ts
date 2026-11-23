/**
 * GET   /api/escola/professor/redacoes/[id] -> proposta + alunos da turma com o último texto
 * PATCH /api/escola/professor/redacoes/[id] { aberta } -> abre ou encerra a proposta
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { PAPEIS_REDACAO, propostaPermitida } from "@/lib/escola/redacao-acesso";
import { nomeDoGenero } from "@/lib/escola/redacao";

export const runtime = "nodejs";

async function contexto() {
  if (!isEscolasEnabled()) return { erro: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  const ctx = await getEduContext();
  if (!ctx) return { erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (!PAPEIS_REDACAO.has(ctx.role)) return { erro: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  if (ctx.db) setTenantDb(ctx.db);
  return { ctx, db: ctx.db ?? prismaEdu };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const c = await contexto();
  if (c.erro) return c.erro;
  const { ctx, db } = c;
  const achada = await propostaPermitida(db, ctx, params.id);
  if (!achada) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  const { proposta: p, turma } = achada;

  const matriculas = await db.eduEnrollment.findMany({
    where: { networkId: ctx.networkId, classId: p.classId, status: "ACTIVE", ...(p.ownerStudentId ? { studentId: p.ownerStudentId } : {}) },
    select: { studentId: true, student: { select: { fullName: true } } },
  });
  const textos = await db.eduEssay.findMany({
    where: { networkId: ctx.networkId, promptId: p.id },
    select: { id: true, studentId: true, version: true, status: true, wordCount: true, submittedAt: true, aiStatus: true, aiFeedback: true },
    orderBy: { version: "desc" },
  });
  const ultimo = new Map<string, (typeof textos)[number]>();
  const enviado = new Map<string, string>();
  for (const t of textos) {
    if (!ultimo.has(t.studentId)) ultimo.set(t.studentId, t);
    if (t.status !== "DRAFT" && !enviado.has(t.studentId)) enviado.set(t.studentId, t.id);
  }

  const alunos = matriculas
    .map((m: { studentId: string; student?: { fullName?: string } }) => {
      const t = ultimo.get(m.studentId);
      return {
        studentId: m.studentId,
        nome: m.student?.fullName ?? "Aluno",
        /** Último texto enviado (abre mesmo quando o aluno está reescrevendo) */
        enviadoId: enviado.get(m.studentId) ?? null,
        texto: t ? {
          id: t.id, versao: t.version, status: t.status, palavras: t.wordCount, enviadoEm: t.submittedAt,
          atencao: t.aiStatus === "FLAGGED" || (t.aiFeedback as { atencao?: boolean } | null)?.atencao === true,
        } : null,
      };
    })
    .sort((a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR"));

  return NextResponse.json({
    proposta: {
      id: p.id, titulo: p.title, enunciado: p.instructions, genero: p.genre,
      generoNome: nomeDoGenero(p.genre) || p.genre,
      minPalavras: p.minWords, maxPalavras: p.maxWords, maxVersoes: p.maxVersions, prazo: p.dueAt, aberta: p.isOpen,
      doAluno: !!p.ownerStudentId,
    },
    turma,
    alunos,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const c = await contexto();
  if (c.erro) return c.erro;
  const { ctx, db } = c;
  const achada = await propostaPermitida(db, ctx, params.id);
  if (!achada) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { aberta?: unknown } | null;
  if (typeof b?.aberta !== "boolean") return NextResponse.json({ error: "Informe se a proposta fica aberta." }, { status: 400 });
  await db.eduEssayPrompt.update({ where: { id: achada.proposta.id }, data: { isOpen: b.aberta } });
  return NextResponse.json({ ok: true, aberta: b.aberta });
}
