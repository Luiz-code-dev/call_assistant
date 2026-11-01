/**
 * POST /api/escola/professor/trilhas/[id]/duplicar
 * Cria uma cópia da trilha com source=PROFESSOR (ou REDE) e derivedFromId.
 * O conteúdo SpeakFlow (networkId=null) nunca é alterado.
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

const P = prismaEdu as any;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["TEACHER", "COORDINATOR", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Busca a trilha original (pode ser da rede ou SpeakFlow)
  const original = await P.eduTrack.findFirst({
    where: {
      id: params.id,
      OR: [{ networkId: ctx.networkId }, { networkId: null }],
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!original) return NextResponse.json({ error: "Trilha não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const source = body.source === "REDE" ? "REDE" : "PROFESSOR";
  const title = body.title ?? `${original.title} (cópia)`;

  // Cria a cópia como DRAFT para revisão
  const copy = await P.eduTrack.create({
    data: {
      networkId: ctx.networkId,
      subjectId: original.subjectId,
      gradeYear: original.gradeYear,
      title,
      description: original.description,
      skillIds: original.skillIds,
      status: "DRAFT",
      source,
      version: 1,
      derivedFromId: original.id,
      createdById: ctx.userId,
      items: {
        create: original.items.map((item: any, i: number) => ({
          activityId: item.activityId,
          order: i + 1,
          isRequired: item.isRequired,
        })),
      },
    },
  });

  return NextResponse.json({ track: copy }, { status: 201 });
}
