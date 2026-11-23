/**
 * GET /api/escola/aluno/redacoes -> propostas de redação da turma do aluno, com a situação de cada uma
 */
import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { setTenantDb } from "@/lib/escola/db";
import { situacaoDaVersao, nomeDoGenero } from "@/lib/escola/redacao";

export const runtime = "nodejs";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  setTenantDb(ctx.db);
  const db = ctx.db;

  const propostas = await db.eduEssayPrompt.findMany({
    where: { networkId: ctx.networkId, classId: ctx.classId },
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
      .map((p: { id: string; title: string; genre: string; dueAt: Date | null; isOpen: boolean }) => ({
        id: p.id,
        titulo: p.title,
        genero: nomeDoGenero(p.genre),
        prazo: p.dueAt,
        aberta: p.isOpen,
        situacao: situacaoDaVersao(ultima.get(p.id)?.status),
        versao: ultima.get(p.id)?.version ?? 0,
      })),
  });
}
