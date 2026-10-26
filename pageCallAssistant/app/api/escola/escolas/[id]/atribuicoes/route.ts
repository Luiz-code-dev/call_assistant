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

  const classes = await prismaEdu.eduClass.findMany({
    where: { networkId: ctx.networkId, schoolId: params.id, schoolYearId: currentYear.id, isActive: true },
    include: {
      subjects: {
        include: {
          subject: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: [{ stage: "asc" }, { gradeYear: "asc" }, { name: "asc" }],
  });

  const teachers = await prismaEdu.eduMembership.findMany({
    where: { networkId: ctx.networkId, schoolId: params.id, role: "TEACHER", isActive: true },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const subjects = await prismaEdu.eduSubject.findMany({
    where: { networkId: ctx.networkId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ classes, subjects, teachers: teachers.map((t: { user: { id: string; name: string; email: string } }) => t.user), schoolYear: currentYear });
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
