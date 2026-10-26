import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { yearAllowedForStage, buildAccessCode } from "@/lib/escola/stage";
import { SHIFT_LABEL } from "@/lib/escola/types";
import type { EduShift } from "@/lib/escola/types";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

export async function GET() {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const where = ctx.schoolId ? { networkId: ctx.networkId, schoolId: ctx.schoolId } : { networkId: ctx.networkId };
  const classes = await prismaEdu.eduClass.findMany({
    where,
    include: {
      school: { select: { name: true } },
      schoolYear: { select: { year: true } },
      _count: { select: { enrollments: true, subjects: true } },
    },
    orderBy: [{ schoolYear: { year: "desc" } }, { name: "asc" }],
  });
  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { schoolId, schoolYearId, name, stage, gradeYear, shift } = await req.json();
  if (!schoolId || !schoolYearId || !name || !stage || !gradeYear || !shift) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  if (ctx.role === "SCHOOL_ADMIN" && ctx.schoolId !== schoolId) return NextResponse.json({ error: "Sem permissão para essa escola" }, { status: 403 });

  const year = +gradeYear;
  // Ano/série coerente com a etapa
  if (!yearAllowedForStage(stage, year)) {
    return NextResponse.json({ error: "Ano/série incompatível com a etapa selecionada." }, { status: 400 });
  }

  const trimmedName = String(name).trim();

  // Nome único por escola + ano letivo + turno
  const dup = await prismaEdu.eduClass.findFirst({
    where: { networkId: ctx.networkId, schoolId, schoolYearId, shift, name: trimmedName },
  });
  if (dup) {
    const turno = SHIFT_LABEL[shift as EduShift] ?? shift;
    return NextResponse.json({ error: `Já existe ${trimmedName} no turno da ${turno} nesta escola.` }, { status: 409 });
  }

  const schoolYear = await prismaEdu.eduSchoolYear.findUnique({ where: { id: schoolYearId }, select: { year: true } });
  if (!schoolYear) return NextResponse.json({ error: "Ano letivo inválido." }, { status: 400 });

  const matrixItems = await prismaEdu.eduCurriculumItem.findMany({ where: { networkId: ctx.networkId, stage, gradeYear: year, OR: [{ shift: null }, { shift }] } });

  // Código de acesso gerado pelo sistema: SF{ano}-{nome}; garante unicidade global
  const baseCode = buildAccessCode(schoolYear.year, trimmedName);
  let accessCode = baseCode;
  let suffix = 1;
  while (await prismaEdu.eduClass.findUnique({ where: { accessCode } })) {
    suffix += 1;
    accessCode = `${baseCode}-${suffix}`;
  }

  const cls = await prismaEdu.eduClass.create({
    data: {
      networkId: ctx.networkId, schoolId, schoolYearId, name: trimmedName, stage, gradeYear: year, shift, accessCode,
      subjects: { create: matrixItems.map((item: { subjectId: string }) => ({ networkId: ctx.networkId, subjectId: item.subjectId })) },
    },
    include: { school: { select: { name: true } }, schoolYear: { select: { year: true } } },
  });
  return NextResponse.json({ class: cls }, { status: 201 });
}
