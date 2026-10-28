/**
 * GET /api/escola/professor/alertas
 * Retorna alertas do professor logado (trilhas concluídas, alunos travados, não começaram).
 * PATCH /api/escola/professor/alertas — marca todos como lidos.
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prismaEdu as any;

export async function GET(_: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const alertas = await p.eduTeacherAlert.findMany({
    where: { networkId: ctx.networkId, teacherUserId: ctx.userId },
    orderBy: { createdAt: "desc" as const },
    take: 20,
    include: {
      student: { select: { fullName: true } },
      track:   { select: { title: true } },
    },
  });

  const naoLidos = alertas.filter((a: { readAt: Date | null }) => !a.readAt).length;

  return NextResponse.json({ alertas, naoLidos });
}

export async function PATCH(_: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.role !== "TEACHER") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await p.eduTeacherAlert.updateMany({
    where: { networkId: ctx.networkId, teacherUserId: ctx.userId, readAt: null },
    data:  { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
