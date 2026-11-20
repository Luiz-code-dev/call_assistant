/**
 * POST /api/escola/integracao/v1/alunos
 * Recebe alunos com matrícula e turma. Cria a turma se não existir e registra transferência de turma.
 *
 * Corpo: JSON { "itens": [ ... ] } ou CSV (Content-Type: text/csv), até 500 por chamada.
 * Reenviar o mesmo lote não duplica: o registro existente é atualizado.
 */
import { NextRequest, NextResponse } from "next/server";
import { autenticarIntegracao, erroIntegracao } from "@/lib/escola/integracao/auth";
import { lerItens, receberLote } from "@/lib/escola/integracao/entrada";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await autenticarIntegracao(req, "cadastros:escrever");
  if (ctx instanceof NextResponse) return ctx;

  const lido = await lerItens(req);
  if ("erro" in lido) return erroIntegracao(lido.status, "corpo_invalido", lido.erro);

  try {
    const r = await receberLote(ctx, "STUDENTS", lido.itens, "alunos");
    return NextResponse.json(r, { status: r.recusados > 0 && r.recusados === r.recebidos ? 422 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[integracao/alunos]", (err as Error).message);
    return erroIntegracao(500, "erro_interno", "Não foi possível processar o lote agora. Tente novamente.");
  }
}
