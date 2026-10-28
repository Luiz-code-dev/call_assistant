import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

const patchSchema = z.object({
  dueAt:  z.string().datetime().nullable().optional(),
  action: z.enum(["encerrar"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; aid: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const assignment = await p.eduTrackAssignment.findUnique({
    where: { id: params.aid, networkId: ctx.networkId, trackId: params.id },
  });
  if (!assignment) return NextResponse.json({ error: "Atribuição não encontrada" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { action, dueAt } = parsed.data;
  const data: Record<string, unknown> = {};
  if (action === "encerrar") data.endedAt = new Date();
  if (dueAt !== undefined) data.dueAt = dueAt ? new Date(dueAt) : null;

  const updated = await p.eduTrackAssignment.update({ where: { id: params.aid }, data });
  return NextResponse.json({ assignment: updated });
}
