/**
 * GET  /api/escola/plataforma/prerequisitos  — lista EduSkillPrerequisite (all statuses)
 * PATCH /api/escola/plataforma/prerequisitos — aprovar/reprovar item (id, action, reviewNote?)
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
  const status = searchParams.get("status") ?? "DRAFT";

  try {
    const db = await getContentReadDb();
    const raw = await db.eduSkillPrerequisite.findMany({
      where: { status, networkId: null },
      include: {
        skill: { select: { code: true, shortLabel: true } },
        prerequisite: { select: { code: true, shortLabel: true } },
      },
      orderBy: [{ skill: { code: "asc" } }, { weight: "desc" }],
      take: 200,
    });
    // Renomeia `prerequisite` → `prerequisiteSkill` para o componente
    const items = raw.map(r => ({ ...r, prerequisiteSkill: r.prerequisite }));
    return NextResponse.json({ items });
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
  const { id, action, reviewNote } = body;
  if (!id || !["APPROVE", "REJECT"].includes(action))
    return NextResponse.json({ error: "id e action (APPROVE|REJECT) obrigatórios" }, { status: 400 });

  const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";

  try {
    await forEachContentDb(async (db) => {
      const exists = await (db as any).eduSkillPrerequisite.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return;
      await (db as any).eduSkillPrerequisite.update({
        where: { id },
        data: { status: newStatus, reviewNote: reviewNote ?? null },
      });
    });
    const db = await getContentReadDb();
    const item = await (db as any).eduSkillPrerequisite.findUnique({ where: { id } });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
