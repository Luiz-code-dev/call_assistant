import { NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const batch = await prismaEdu.eduImportBatch.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
  });
  if (!batch) return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 });

  // Strip preview rows from response (they can be large)
  const errors = batch.errors as { preview?: unknown; validation?: unknown } | null;
  return NextResponse.json({
    ...batch,
    errors: errors?.validation ?? null,
  });
}
