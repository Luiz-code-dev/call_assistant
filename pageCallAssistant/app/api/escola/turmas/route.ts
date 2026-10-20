import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";
import { randomBytes } from "crypto";

function flag() { return process.env.FEATURE_ESCOLAS === "true"; }

function genCode() {
  return randomBytes(3).toString("hex").toUpperCase().replace(/[0O1I]/g, "X");
}

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

  const matrixItems = await prismaEdu.eduCurriculumItem.findMany({ where: { networkId: ctx.networkId, stage, gradeYear: +gradeYear, OR: [{ shift: null }, { shift }] } });

  let accessCode = genCode();
  let tries = 0;
  while (tries < 10) {
    const exists = await prismaEdu.eduClass.findUnique({ where: { accessCode } });
    if (!exists) break;
    accessCode = genCode();
    tries++;
  }

  const cls = await prismaEdu.eduClass.create({
    data: {
      networkId: ctx.networkId, schoolId, schoolYearId, name, stage, gradeYear: +gradeYear, shift, accessCode,
      subjects: { create: matrixItems.map((item: { subjectId: string }) => ({ networkId: ctx.networkId, subjectId: item.subjectId })) },
    },
    include: { school: { select: { name: true } }, schoolYear: { select: { year: true } } },
  });
  return NextResponse.json({ class: cls }, { status: 201 });
}
