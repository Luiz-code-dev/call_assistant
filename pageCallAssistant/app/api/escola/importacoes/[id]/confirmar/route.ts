import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { processImportBatch } from "@/lib/escola/import/processor";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const batch = await prismaEdu.eduImportBatch.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!batch) return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 });
  if (batch.status !== "PREVIEW") return NextResponse.json({ error: "Importação não está em estado de pré-visualização" }, { status: 400 });

  // Start processing asynchronously (non-blocking for large batches)
  // The client polls /api/escola/importacoes/[id] for progress
  processImportBatch(params.id).catch(err => console.error("Import batch failed:", err));

  return NextResponse.json({ ok: true, batchId: params.id, message: "Processamento iniciado. Acompanhe o progresso." });
}
