import { NextRequest, NextResponse } from "next/server";
import { getEduContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = prismaEdu as any;

export async function PATCH(req: NextRequest, { params }: { params: { studentId: string } }) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);
  if (!["TEACHER", "COORDINATOR", "SCHOOL_ADMIN", "NETWORK_ADMIN"].includes(ctx.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { skillId, level, comment } = await req.json().catch(() => ({}));
  if (!skillId || !level) return NextResponse.json({ error: "skillId e level são obrigatórios" }, { status: 400 });

  const enrollment = await P.eduEnrollment.findFirst({ where: { studentId: params.studentId, networkId: ctx.networkId, status: "ACTIVE" }, select: { id: true } });
  if (!enrollment) return NextResponse.json({ error: "Aluno não encontrado nesta rede" }, { status: 404 });

  await P.eduSkillMasteryEvent.create({
    data: { networkId: ctx.networkId, studentId: params.studentId, skillId, level, source: "TEACHER", comment: comment ?? null },
  });

  return NextResponse.json({ ok: true });
}
