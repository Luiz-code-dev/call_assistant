/**
 * GET  /api/escola/plataforma/fichas  — lista EduSkillGuide por status
 * PATCH /api/escola/plataforma/fichas — aprovar/reprovar (id, action, reviewNote?)
 * PUT   /api/escola/plataforma/fichas — editar conteúdo de uma ficha DRAFT
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
  const subjectCode = searchParams.get("subjectCode");
  const gradeYear = searchParams.get("gradeYear");

  const where: Record<string, unknown> = { status, networkId: null };
  if (subjectCode || gradeYear) {
    where.skill = {
      ...(subjectCode ? { subjectCode } : {}),
      ...(gradeYear ? { gradeYears: { has: parseInt(gradeYear) } } : {}),
    };
  }

  const items = await P.eduSkillGuide.findMany({
    where,
    include: { skill: { select: { code: true, shortLabel: true, subjectCode: true, gradeYears: true } } },
    orderBy: { skill: { code: "asc" } },
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
    return NextResponse.json({ error: "id e action obrigatórios" }, { status: 400 });

  const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";
  const updated = await P.eduSkillGuide.update({
    where: { id, networkId: null },
    data: { status: newStatus, reviewNote: reviewNote ?? null },
  });
  return NextResponse.json({ item: updated });
}

export async function PUT(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { id, whatStudentDoes, commonErrors, recommendedTypes, ageNotes } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  // Só edita DRAFT
  const existing = await P.eduSkillGuide.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (existing.status === "APPROVED")
    return NextResponse.json({ error: "Ficha aprovada não pode ser editada. Reprove primeiro." }, { status: 409 });

  const updated = await P.eduSkillGuide.update({
    where: { id },
    data: {
      ...(whatStudentDoes !== undefined ? { whatStudentDoes } : {}),
      ...(commonErrors !== undefined ? { commonErrors } : {}),
      ...(recommendedTypes !== undefined ? { recommendedTypes } : {}),
      ...(ageNotes !== undefined ? { ageNotes } : {}),
    },
  });
  return NextResponse.json({ item: updated });
}
