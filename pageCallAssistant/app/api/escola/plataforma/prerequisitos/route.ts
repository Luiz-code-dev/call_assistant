/**
 * GET  /api/escola/plataforma/prerequisitos  — lista EduSkillPrerequisite (all statuses)
 * PATCH /api/escola/plataforma/prerequisitos — aprovar/reprovar item (id, action, reviewNote?)
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

const P = prismaEdu as any;

export async function GET(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "DRAFT";

  const items = await P.eduSkillPrerequisite.findMany({
    where: { status, networkId: null },
    include: {
      skill: { select: { code: true, shortLabel: true } },
      prerequisiteSkill: { select: { code: true, shortLabel: true } },
    },
    orderBy: [{ skill: { code: "asc" } }, { weight: "desc" }],
    take: 200,
  });
  return NextResponse.json({ items });
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
  const updated = await P.eduSkillPrerequisite.update({
    where: { id, networkId: null },
    data: { status: newStatus, reviewNote: reviewNote ?? null },
  });
  return NextResponse.json({ item: updated });
}
