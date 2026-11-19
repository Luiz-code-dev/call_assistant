import { recordMasteryEvent } from "@/lib/escola/mastery-event";
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

  if (!["NOT_YET", "ALMOST", "MASTERED"].includes(level)) return NextResponse.json({ error: "Nível inválido" }, { status: 400 });

  // Grava a observação do professor e recalcula o nível consolidado do aluno.
  // (O evento não tem coluna de comentário: o texto fica no registro de auditoria.)
  await recordMasteryEvent({ networkId: ctx.networkId, studentId: params.studentId, skillId, level, source: "TEACHER" });
  await P.eduAuditLog.create({
    data: {
      networkId: ctx.networkId, actorType: "user", actorId: ctx.userId,
      action: "mastery.teacher.set", entity: "EduSkillMastery", entityId: `${params.studentId}:${skillId}`,
      metadata: comment ? { level, comment: String(comment).slice(0, 500) } : { level },
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
