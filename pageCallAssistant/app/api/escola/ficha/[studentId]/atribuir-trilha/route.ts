import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu } from "@/lib/escola/db";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function POST(req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["TEACHER", "COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { trackId, replace } = await req.json().catch(() => ({}));
  if (!trackId) return NextResponse.json({ error: "trackId é obrigatório" }, { status: 400 });

  const enrollment = await P.eduEnrollment.findFirst({ where: { studentId: params.studentId, networkId: ctx.networkId, status: "ACTIVE" }, select: { id: true } });
  if (!enrollment) return NextResponse.json({ error: "Aluno não encontrado nesta rede" }, { status: 404 });

  if (replace) {
    await P.eduStudentTrack.updateMany({ where: { enrollmentId: enrollment.id, status: "IN_PROGRESS" }, data: { status: "REPLACED" } });
  }

  const studentTrack = await P.eduStudentTrack.create({
    data: { networkId: ctx.networkId, enrollmentId: enrollment.id, trackId, status: "IN_PROGRESS", assignedBy: ctx.userId ?? "system" },
  });

  return NextResponse.json({ ok: true, studentTrackId: studentTrack.id });
}
