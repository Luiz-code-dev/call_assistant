/**
 * POST /api/escola/professor/sugestoes/aceitar
 * L5: Professor aceita sugestões de trilha em lote ("Atribuir a todos")
 * ou cancela uma sugestão individual.
 *
 * Body: { action: "aceitar_todos" | "cancelar", alertId?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";

const P = prismaEdu as any;

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["TEACHER", "COORDINATOR", "NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { action, alertId } = body;

  if (action === "aceitar_todos") {
    const where: Record<string, unknown> = {
      networkId: ctx.networkId,
      type: "TRACK_SUGGESTION",
      status: "PENDING",
    };
    if (ctx.role === "TEACHER") where.teacherId = ctx.userId;

    const alerts = await P.eduTeacherAlert.findMany({ where, take: 100 }).catch(() => []);
    let atribuidos = 0;

    for (const alert of alerts) {
      const payload = alert.payload as Record<string, string> | null;
      if (!payload?.trackId || !payload?.studentId) continue;
      try {
        const existing = await P.eduTrackAssignment.findFirst({
          where: { trackId: payload.trackId, studentId: payload.studentId, endedAt: null },
          select: { id: true },
        });
        if (!existing) {
          await P.eduTrackAssignment.create({
            data: {
              networkId: ctx.networkId,
              trackId: payload.trackId,
              studentId: payload.studentId,
              assignedBy: ctx.userId,
            },
          });
          atribuidos++;
        }
        await P.eduTeacherAlert.update({ where: { id: alert.id }, data: { status: "ACCEPTED" } });
      } catch { /* continua para o próximo */ }
    }
    return NextResponse.json({ atribuidos, total: alerts.length });
  }

  if (action === "cancelar" && alertId) {
    await P.eduTeacherAlert.updateMany({
      where: { id: alertId, networkId: ctx.networkId },
      data: { status: "DISMISSED" },
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action inválida (aceitar_todos|cancelar)" }, { status: 400 });
}
