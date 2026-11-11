/**
 * POST /api/escola/aluno/ajudante/avisar-familia  { activityId } -> { avisados, temFamilia }
 * O aluno travou e aceitou que o Flow avise a família. Usa o aviso "precisa de ajuda"
 * (no máximo um por dia por responsável). Nada passa pela IA.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { atividadeDoAluno } from "@/lib/escola/ajudante-atividade";
import { avisarFamilia, avisoPedidoDeAjuda } from "@/lib/escola/avisos-familia";
import { tituloParaAluno } from "@/lib/escola/texto-aluno";
import { dentroDoLimiteAvisar } from "@/lib/escola/ajudante";

export const runtime = "nodejs";

const schema = z.object({ activityId: z.string().min(1).max(64).optional() });

export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getStudentContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx.db) setTenantDb(ctx.db);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  if (!dentroDoLimiteAvisar(ctx.studentId)) return NextResponse.json({ avisados: 0, temFamilia: true, jaAvisada: true });

  // Sem activityId = foto do dever da escola
  const atividade = parsed.data.activityId ? await atividadeDoAluno(ctx, parsed.data.activityId) : null;
  if (parsed.data.activityId && !atividade) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Prisma do tenant sem tipagem estática
  const P = prismaEdu as any;
  const familia = await P.eduGuardianLink.count({ where: { networkId: ctx.networkId, studentId: ctx.studentId, isActive: true } }).catch(() => 0);
  if (!familia) return NextResponse.json({ avisados: 0, temFamilia: false });

  const aluno = await P.eduStudent.findUnique({ where: { id: ctx.studentId }, select: { fullName: true } });
  const avisados = await avisarFamilia(P, ctx.networkId, ctx.studentId, "ATENCAO",
    avisoPedidoDeAjuda(aluno?.fullName ?? "", atividade?.subjectCode ?? null, atividade ? tituloParaAluno(atividade.titulo) : "o dever de casa", ctx.studentId)).catch(() => 0);
  return NextResponse.json({ avisados, temFamilia: true, jaAvisada: avisados === 0 });
}
