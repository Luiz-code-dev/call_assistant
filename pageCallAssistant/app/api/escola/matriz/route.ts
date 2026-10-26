import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const items = await prismaEdu.eduCurriculumItem.findMany({ where: { networkId: ctx.networkId }, orderBy: [{ stage: "asc" }, { gradeYear: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "COORDINATOR"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { subjectId, stage, gradeYear, shift, weeklyHours } = await req.json();
  const item = await prismaEdu.eduCurriculumItem.upsert({
    where: { networkId_subjectId_stage_gradeYear_shift: { networkId: ctx.networkId, subjectId, stage, gradeYear: +gradeYear, shift: shift ?? null } },
    create: { networkId: ctx.networkId, subjectId, stage, gradeYear: +gradeYear, shift: shift ?? null, weeklyHours: +weeklyHours },
    update: { weeklyHours: +weeklyHours },
  });
  return NextResponse.json({ item }, { status: 201 });
}
