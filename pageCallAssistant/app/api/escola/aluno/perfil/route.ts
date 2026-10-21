import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";

export const runtime = "nodejs";

export async function GET() {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "disabled" }, { status: 403 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [student, enrollment] = await Promise.all([
    prismaEdu.eduStudent.findUnique({
      where: { id: ctx.studentId },
      select: { fullName: true },
    }),
    prismaEdu.eduEnrollment.findUnique({
      where: { id: ctx.enrollmentId },
      select: {
        status: true,
        class: {
          select: {
            name: true,
            gradeYear: true,
            school: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    fullName: student?.fullName ?? "",
    className: enrollment?.class.name ?? "",
    schoolName: enrollment?.class.school.name ?? "",
    gradeYear: enrollment?.class.gradeYear ?? null,
    enrollmentStatus: enrollment?.status ?? null,
  });
}
