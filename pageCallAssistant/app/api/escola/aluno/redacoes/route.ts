/**
 * GET  /api/escola/aluno/redacoes -> propostas de redação da turma do aluno (e as que ele trouxe), com a situação
 * POST /api/escola/aluno/redacoes { titulo, genero, enunciado? } -> o aluno traz uma redação da escola para o Flow ler
 */
import { NextRequest, NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { situacaoDaVersao, nomeDoGenero, generoValido, MAX_PALAVRAS } from "@/lib/escola/redacao";
import { criarLimite } from "@/lib/escola/ajudante";

export const runtime = "nodejs";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  setTenantDb(ctx.db);
  const db = ctx.db;

  const propostas = await db.eduEssayPrompt.findMany({
    where: { networkId: ctx.networkId, classId: ctx.classId, OR: [{ ownerStudentId: null }, { ownerStudentId: ctx.studentId }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const textos = propostas.length
    ? await db.eduEssay.findMany({
        where: { networkId: ctx.networkId, studentId: ctx.studentId, promptId: { in: propostas.map((p: { id: string }) => p.id) } },
        select: { promptId: true, version: true, status: true },
        orderBy: { version: "desc" },
      })
    : [];
  const ultima = new Map<string, { version: number; status: string }>();
  for (const t of textos) if (!ultima.has(t.promptId)) ultima.set(t.promptId, t);

  return NextResponse.json({
    propostas: propostas
      // Encerrada e sem texto do aluno: não aparece
      .filter((p: { id: string; isOpen: boolean }) => p.isOpen || ultima.has(p.id))
      .map((p: { id: string; title: string; genre: string; dueAt: Date | null; isOpen: boolean; ownerStudentId: string | null }) => ({
        id: p.id,
        titulo: p.title,
        genero: nomeDoGenero(p.genre),
        prazo: p.dueAt,
        aberta: p.isOpen,
        situacao: situacaoDaVersao(ultima.get(p.id)?.status),
        versao: ultima.get(p.id)?.version ?? 0,
        propria: !!p.ownerStudentId,
      })),
  });
}

/** 10 redações novas por hora por aluno */
const dentroDoLimite = criarLimite(10, 60 * 60 * 1000);

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  setTenantDb(ctx.db);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const titulo = String(b?.titulo ?? "").trim().slice(0, 160);
  const enunciado = String(b?.enunciado ?? "").trim().slice(0, 3000);
  if (titulo.length < 3) return NextResponse.json({ error: "Escreva o tema da redação." }, { status: 400 });
  if (!generoValido(b?.genero)) return NextResponse.json({ error: "Escolha o tipo de texto." }, { status: 400 });
  if (!dentroDoLimite(ctx.studentId)) return NextResponse.json({ error: "Você já abriu muitas redações nesta hora. Tente mais tarde." }, { status: 429 });
  const turma = await ctx.db.eduClass.findFirst({ where: { id: ctx.classId, networkId: ctx.networkId }, select: { schoolId: true } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  const p = await ctx.db.eduEssayPrompt.create({
    data: {
      networkId: ctx.networkId, schoolId: turma.schoolId, classId: ctx.classId, createdById: ctx.studentId, ownerStudentId: ctx.studentId,
      title: titulo, instructions: enunciado, genre: b?.genero, minWords: 20, maxWords: MAX_PALAVRAS, maxVersions: 3,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: p.id }, { status: 201 });
}
