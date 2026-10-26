import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const batch = await prismaEdu.eduImportBatch.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!batch) return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 });

  const errors = (batch.errors as { validation?: { row: number; field: string; message: string }[] } | null)?.validation ?? [];
  const lines = ["linha;campo;mensagem", ...errors.map((e: { row: number; field: string; message: string }) => `${e.row};${e.field};${e.message}`)];
  const csv = lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-importacao-${params.id}.csv"`,
    },
  });
}
