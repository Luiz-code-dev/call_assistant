import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

const schema = z.object({
  classId: z.string().optional(),
  studentId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER" && ctx.role !== "COORDINATOR" && ctx.role !== "NETWORK_ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  if (!parsed.data.classId && !parsed.data.studentId) {
    return NextResponse.json({ error: "Informe classId ou studentId" }, { status: 400 });
  }

  const track = await (prismaEdu as any).eduTrack.findUnique({
    where: { id: params.id, networkId: ctx.networkId },
  });
  if (!track) return NextResponse.json({ error: "Trilha não encontrada" }, { status: 404 });

  const assignment = await (prismaEdu as any).eduTrackAssignment.create({
    data: {
      networkId: ctx.networkId,
      trackId: params.id,
      classId: parsed.data.classId ?? null,
      studentId: parsed.data.studentId ?? null,
      assignedBy: ctx.userId,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  });
  return NextResponse.json({ assignment }, { status: 201 });
}
