import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

const TRACK_INCLUDE = {
  items:  { orderBy: { order: "asc" } as const },
  skills: { select: { id: true, code: true, shortLabel: true, description: true } },
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const track = await p.eduTrack.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
    include: TRACK_INCLUDE,
  });
  if (!track) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  return NextResponse.json({ track });
}

const editSchema = z.object({
  title:     z.string().min(1).max(200).optional(),
  subjectId: z.string().min(1).optional(),
  gradeYear: z.number().int().min(1).max(9).optional(),
  skillIds:  z.array(z.string()).min(1).max(3).optional(),
  items:     z.array(z.object({
    activityId: z.string().min(1),
    order:      z.number().int().min(0),
    estMinutes: z.number().int().min(1).max(15).default(10),
  })).min(3).max(8).optional(),
  action: z.enum(["enviar","aprovar","devolver","arquivar"]).optional(),
  reviewNote: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const track = await p.eduTrack.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!track) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const parsed = editSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { action, items, reviewNote, ...fields } = parsed.data;

  // Ações de fluxo
  if (action === "enviar") {
    // Professor envia para aprovação (DRAFT → SUBMITTED)
    if (track.createdById !== ctx.userId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    if (track.status !== "DRAFT") return NextResponse.json({ error: "Só rascunhos podem ser enviados" }, { status: 400 });

    // Se a rede não exige aprovação, aprovar direto
    const network = await p.eduNetwork.findUnique({ where: { id: ctx.networkId }, select: { requireTrackApproval: true } });
    const newStatus = network?.requireTrackApproval === false ? "APPROVED" : "SUBMITTED";
    const updated = await p.eduTrack.update({
      where: { id: params.id },
      data: { status: newStatus, submittedAt: new Date(), approvedById: newStatus === "APPROVED" ? ctx.userId : null },
      include: TRACK_INCLUDE,
    });
    return NextResponse.json({ track: updated });
  }

  if (action === "aprovar") {
    if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    if (track.status !== "SUBMITTED") return NextResponse.json({ error: "Trilha não está aguardando aprovação" }, { status: 400 });
    const updated = await p.eduTrack.update({
      where: { id: params.id },
      data: { status: "APPROVED", approvedById: ctx.userId, reviewNote: null },
      include: TRACK_INCLUDE,
    });
    return NextResponse.json({ track: updated });
  }

  if (action === "devolver") {
    if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    if (track.status !== "SUBMITTED") return NextResponse.json({ error: "Trilha não está aguardando aprovação" }, { status: 400 });
    const updated = await p.eduTrack.update({
      where: { id: params.id },
      data: { status: "DRAFT", reviewNote: reviewNote ?? null, submittedAt: null },
      include: TRACK_INCLUDE,
    });
    return NextResponse.json({ track: updated });
  }

  if (action === "arquivar") {
    if (!["COORDINATOR","NETWORK_ADMIN"].includes(ctx.role) && track.createdById !== ctx.userId) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const updated = await p.eduTrack.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
      include: TRACK_INCLUDE,
    });
    return NextResponse.json({ track: updated });
  }

  // Edição de campos — só o autor, apenas DRAFT
  if (track.createdById !== ctx.userId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (track.status !== "DRAFT") return NextResponse.json({ error: "Só rascunhos podem ser editados" }, { status: 400 });

  const updateData: Record<string, unknown> = { ...fields };
  if (items) {
    await p.eduTrackItem.deleteMany({ where: { trackId: params.id } });
    updateData.items = { create: items };
  }

  const updated = await p.eduTrack.update({ where: { id: params.id }, data: updateData, include: TRACK_INCLUDE });
  return NextResponse.json({ track: updated });
}
