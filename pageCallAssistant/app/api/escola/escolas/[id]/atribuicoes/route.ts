import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { prismaEdu } from "@/lib/escola/db";

function flag() { return isEscolasEnabled(); }

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const school = await prismaEdu.eduSchool.findUnique({ where: { id: params.id, networkId: ctx.networkId } });
  if (!school) return NextResponse.json({ error: "Escola não encontrada" }, { status: 404 });

  if (ctx.role === "SCHOOL_ADMIN" && ctx.schoolId !== params.id) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const currentYear = await prismaEdu.eduSchoolYear.findFirst({ where: { networkId: ctx.networkId, isCurrent: true } });
  if (!currentYear) return NextResponse.json({ classes: [], subjects: [], teachers: [] });

  // EduClassSubject não tem relação declarada com EduSubject no schema — buscamos sem include de subject.
  const classesRaw = await prismaEdu.eduClass.findMany({
    where: { networkId: ctx.networkId, schoolId: params.id, schoolYearId: currentYear.id, isActive: true },
    select: {
      id: true,
      name: true,
      stage: true,
      gradeYear: true,
      shift: true,
      subjects: {
        select: { id: true, subjectId: true, teacherId: true },
      },
    },
    orderBy: [{ stage: "asc" }, { gradeYear: "asc" }, { name: "asc" }],
  });

  const teachers = await prismaEdu.eduMembership.findMany({
    where: { networkId: ctx.networkId, schoolId: params.id, role: "TEACHER", isActive: true },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const subjects = await prismaEdu.eduSubject.findMany({
    where: { networkId: ctx.networkId, isActive: true },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });

  // Mapeia subjectId → subject para enriquecer as ofertas da turma
  const subjectMap: Record<string, { id: string; name: string; color: string | null }> = Object.fromEntries(
    subjects.map((s: { id: string; name: string; color: string | null }) => [s.id, s])
  );

  const classes = classesRaw.map((cls: {
    id: string; name: string; stage: string; gradeYear: number; shift: string;
    subjects: { id: string; subjectId: string; teacherId: string | null }[];
  }) => ({
    ...cls,
    subjects: cls.subjects.map(o => ({
      ...o,
      subject: subjectMap[o.subjectId] ?? { id: o.subjectId, name: "Componente", color: null },
    })),
  }));

  return NextResponse.json({
    classes,
    subjects,
    teachers: teachers.map((t: { user: { id: string; name: string; email: string } }) => t.user),
    schoolYear: currentYear,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["NETWORK_ADMIN", "SCHOOL_ADMIN", "COORDINATOR"].includes(ctx.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (ctx.role === "SCHOOL_ADMIN" && ctx.schoolId !== params.id) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { assignments } = await req.json();
  // assignments: [{ classSubjectId: string, teacherId: string | null }]
  if (!Array.isArray(assignments)) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  let updated = 0;
  for (const a of assignments) {
    const { classSubjectId, teacherId } = a;
    if (!classSubjectId) continue;
    await prismaEdu.eduClassSubject.updateMany({
      where: { id: classSubjectId, networkId: ctx.networkId },
      data: { teacherId: teacherId ?? null },
    });
    updated++;
  }

  await prismaEdu.eduAuditLog.create({
    data: { networkId: ctx.networkId, actorType: "staff", actorId: ctx.userId, action: "assignments.updated", entity: "EduSchool", entityId: params.id, metadata: { count: updated } },
  });

  return NextResponse.json({ updated });
}
