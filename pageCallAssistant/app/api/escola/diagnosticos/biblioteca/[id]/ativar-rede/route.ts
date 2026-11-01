/**
 * POST /api/escola/diagnosticos/biblioteca/[id]/ativar-rede
 *
 * Cria uma cópia com escopo de rede a partir de um diagnóstico da biblioteca
 * SpeakFlow (networkId = null, source = "SPEAKFLOW").
 *
 * Se já existe uma cópia derivada deste item para a rede, devolve a cópia
 * existente sem criar duplicata (idempotente).
 *
 * Retorna: { id: string } com o ID do diagnóstico agora pertencente à rede.
 */
import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (ctx.role !== "NETWORK_ADMIN" && ctx.role !== "COORDINATOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const P = prismaEdu as any;

  // Busca o item da biblioteca (networkId: null)
  const lib = await P.eduDiagnostic.findFirst({
    where: { id: params.id, networkId: null, source: "SPEAKFLOW" },
    include: { items: true },
  });
  if (!lib) return NextResponse.json({ error: "Diagnóstico da biblioteca não encontrado" }, { status: 404 });

  // Verifica se já existe cópia para esta rede (idempotente)
  const existente = await P.eduDiagnostic.findFirst({
    where: { derivedFromId: params.id, networkId: ctx.networkId },
    select: { id: true },
  });
  if (existente) return NextResponse.json({ id: existente.id });

  // Cria cópia com escopo da rede
  const copia = await P.eduDiagnostic.create({
    data: {
      networkId: ctx.networkId,
      subjectId: lib.subjectId,
      subjectCode: lib.subjectCode,
      gradeYear: lib.gradeYear,
      title: lib.title,
      cycle: lib.cycle,
      status: "DRAFT",
      createdById: ctx.userId,
      source: "SPEAKFLOW",
      adaptive: lib.adaptive,
      derivedFromId: lib.id,
    },
  });

  // Copia os itens
  if (lib.items.length > 0) {
    await P.eduDiagnosticItem.createMany({
      data: lib.items.map((item: { skillId: string; order: number; activityId: string }) => ({
        diagnosticId: copia.id,
        skillId: item.skillId,
        order: item.order,
        activityId: item.activityId,
      })),
    });
  }

  return NextResponse.json({ id: copia.id });
}
