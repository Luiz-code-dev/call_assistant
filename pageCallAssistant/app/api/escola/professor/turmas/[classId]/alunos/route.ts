import { NextResponse } from "next/server";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";

export async function GET(_: Request, { params }: { params: { classId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  const enrollments = await (prismaEdu as any).eduEnrollment.findMany({
    where: { classId: params.classId, status: "ACTIVE", networkId: ctx.networkId },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { student: { fullName: "asc" } },
  });

  const students = enrollments.map((e: any) => e.student);
  return NextResponse.json({ students });
}
