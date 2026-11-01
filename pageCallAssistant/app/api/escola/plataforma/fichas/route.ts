/**
 * GET  /api/escola/plataforma/fichas  — lista EduSkillGuide por status
 * PATCH /api/escola/plataforma/fichas — aprovar/reprovar (id, action, reviewNote?)
 * PUT   /api/escola/plataforma/fichas — editar conteúdo de uma ficha DRAFT
 *
 * Usa conteudo-plataforma.ts (superusuário) pois PLATFORM_ADMIN não tem networkId.
 * Aprovar/reprovar replica em todas as bases.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { getContentReadDb, forEachContentDb } from "@/lib/escola/conteudo-plataforma";

function guard() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return null;
}

export async function GET(req: NextRequest) {
  const g = guard(); if (g) return g;
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

  try {
    const db = await getContentReadDb();
    const items = await (db as any).eduSkillGuide.findMany({
      where,
      include: { skill: { select: { code: true, shortLabel: true, subjectCode: true, gradeYears: true } } },
      orderBy: { skill: { code: "asc" } },
      take: 200,
    });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const g = guard(); if (g) return g;
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { id, action, reviewNote } = body;
  if (!id || !["APPROVE", "REJECT"].includes(action))
    return NextResponse.json({ error: "id e action obrigatórios" }, { status: 400 });

  const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";

  try {
    // Replica em todas as bases
    await forEachContentDb(async (db) => {
      const exists = await (db as any).eduSkillGuide.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!exists) return;
      if (exists.status === "APPROVED" && action === "APPROVE") return; // idempotente
      await (db as any).eduSkillGuide.update({
        where: { id },
        data: { status: newStatus, reviewNote: reviewNote ?? null },
      });
    });
    // Lê o resultado da primeira base
    const db = await getContentReadDb();
    const item = await (db as any).eduSkillGuide.findUnique({ where: { id } });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const g = guard(); if (g) return g;
  const ctx = await getEduContext();
  if (!ctx || ctx.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const { id, whatStudentDoes, commonErrors, recommendedTypes, ageNotes } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  try {
    // Verifica status na base de leitura
    const readDb = await getContentReadDb();
    const existing = await (readDb as any).eduSkillGuide.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (existing.status === "APPROVED")
      return NextResponse.json({ error: "Ficha aprovada não pode ser editada. Reprove primeiro." }, { status: 409 });

    // Replica edição em todas as bases
    await forEachContentDb(async (db) => {
      await (db as any).eduSkillGuide.updateMany({
        where: { id, networkId: null, status: { not: "APPROVED" } },
        data: {
          ...(whatStudentDoes !== undefined ? { whatStudentDoes } : {}),
          ...(commonErrors !== undefined ? { commonErrors } : {}),
          ...(recommendedTypes !== undefined ? { recommendedTypes } : {}),
          ...(ageNotes !== undefined ? { ageNotes } : {}),
        },
      });
    });
    const item = await (readDb as any).eduSkillGuide.findUnique({ where: { id } });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
