/**
 * GET  /api/escola/plataforma/revisar — fila DRAFT aguardando revisão
 * PATCH /api/escola/plataforma/revisar — aprovar ou reprovar com motivo (replica em todas as bases)
 *
 * Usa conteudo-plataforma.ts (superusuário) pois PLATFORM_ADMIN não tem networkId.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getContentReadDb, forEachContentDb } from "@/lib/escola/conteudo-plataforma";

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "all";

  try {
    const db = await getContentReadDb();
    const [activities, guides, prereqs] = await Promise.all([
      (type === "all" || type === "activity")
        ? (db as any).eduActivity.findMany({
            where: { reviewStatus: "IN_REVIEW", networkId: null },
            orderBy: { updatedAt: "asc" },
            take: 50,
            select: { id: true, title: true, type: true, skillIds: true, reviewStatus: true, updatedAt: true },
          })
        : [],
      (type === "all" || type === "guide")
        ? (db as any).eduSkillGuide.findMany({
            where: { status: "DRAFT", networkId: null },
            include: { skill: { select: { code: true, shortLabel: true } } },
            orderBy: { updatedAt: "asc" },
            take: 50,
          })
        : [],
      (type === "all" || type === "prereq")
        ? (db as any).eduSkillPrerequisite.findMany({
            where: { status: "DRAFT", networkId: null },
            include: {
              skill: { select: { code: true, shortLabel: true } },
              prerequisite: { select: { code: true, shortLabel: true } },
            },
            orderBy: { updatedAt: "asc" },
            take: 50,
          })
        : [],
    ]);
    return NextResponse.json({ activities, guides, prereqs });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { entityType, id, action, reviewNote } = body;
  if (!entityType || !id || !["APPROVE", "REJECT"].includes(action))
    return NextResponse.json({ error: "entityType, id e action obrigatórios" }, { status: 400 });

  try {
    await forEachContentDb(async (db) => {
      if (entityType === "activity") {
        const exists = await (db as any).eduActivity.findUnique({ where: { id }, select: { id: true } });
        if (!exists) return;
        const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
        await (db as any).eduActivity.update({ where: { id }, data: { reviewStatus: newStatus, reviewNote: reviewNote ?? null } });
      } else if (entityType === "guide") {
        const exists = await (db as any).eduSkillGuide.findUnique({ where: { id }, select: { id: true } });
        if (!exists) return;
        const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";
        await (db as any).eduSkillGuide.update({ where: { id }, data: { status: newStatus, reviewNote: reviewNote ?? null } });
      } else if (entityType === "prereq") {
        const exists = await (db as any).eduSkillPrerequisite.findUnique({ where: { id }, select: { id: true } });
        if (!exists) return;
        const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";
        await (db as any).eduSkillPrerequisite.update({ where: { id }, data: { status: newStatus, reviewNote: reviewNote ?? null } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
