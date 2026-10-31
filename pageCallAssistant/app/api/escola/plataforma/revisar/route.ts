/**
 * GET  /api/escola/plataforma/revisar — fila DRAFT aguardando revisão (todas as entidades)
 * PATCH /api/escola/plataforma/revisar — aprovar ou reprovar com motivo
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
  const type = searchParams.get("type") ?? "all"; // activity|guide|prereq|all

  const [activities, guides, prereqs] = await Promise.all([
    (type === "all" || type === "activity")
      ? P.eduActivity.findMany({
          where: { reviewStatus: "IN_REVIEW", networkId: null },
          include: { classSubject: { select: { id: true } } },
          orderBy: { updatedAt: "asc" },
          take: 50,
          select: { id: true, title: true, type: true, skillIds: true, reviewStatus: true, updatedAt: true },
        })
      : [],
    (type === "all" || type === "guide")
      ? P.eduSkillGuide.findMany({
          where: { status: "DRAFT", networkId: null },
          include: { skill: { select: { code: true, shortLabel: true } } },
          orderBy: { updatedAt: "asc" },
          take: 50,
        })
      : [],
    (type === "all" || type === "prereq")
      ? P.eduSkillPrerequisite.findMany({
          where: { status: "DRAFT", networkId: null },
          include: {
            skill: { select: { code: true, shortLabel: true } },
            prerequisiteSkill: { select: { code: true, shortLabel: true } },
          },
          orderBy: { updatedAt: "asc" },
          take: 50,
        })
      : [],
  ]);

  return NextResponse.json({ activities, guides, prereqs });
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

  if (entityType === "activity") {
    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    await P.eduActivity.update({ where: { id }, data: { reviewStatus: newStatus, reviewNote: reviewNote ?? null } });
  } else if (entityType === "guide") {
    const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";
    await P.eduSkillGuide.update({ where: { id, networkId: null }, data: { status: newStatus, reviewNote: reviewNote ?? null } });
  } else if (entityType === "prereq") {
    const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";
    await P.eduSkillPrerequisite.update({ where: { id, networkId: null }, data: { status: newStatus, reviewNote: reviewNote ?? null } });
  } else {
    return NextResponse.json({ error: "entityType inválido (activity|guide|prereq)" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
