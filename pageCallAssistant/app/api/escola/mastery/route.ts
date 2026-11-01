import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getEduContext, getStudentContext } from "@/lib/escola/context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { withTenantTx } from "@/lib/escola/tenant-db";

function flag() { return isEscolasEnabled(); }

export async function GET(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  if (studentId) {
    const ctx = await getEduContext();
    if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const masteries = await (prismaEdu as any).eduSkillMastery.findMany({
      where: { studentId, networkId: ctx.networkId },
      include: { skill: { select: { code: true, description: true, shortLabel: true, subjectCode: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ masteries });
  }

  const student = await getStudentContext();
  if (!student) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const masteries = await (prismaEdu as any).eduSkillMastery.findMany({
    where: { studentId: student.studentId, networkId: student.networkId },
    include: { skill: { select: { code: true, description: true, shortLabel: true, subjectCode: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ masteries });
}

const upsertSchema = z.object({
  studentId: z.string().min(1),
  skillId: z.string().min(1),
  level: z.enum(["NOT_YET", "ALMOST", "MASTERED"]),
  source: z.string().default("diagnostic"),
  submissionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!flag()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getEduContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { studentId, skillId, level, source, submissionId } = parsed.data;

  // R4: usa withTenantTx (callback) em vez de $transaction em lote
  // Garante que SET LOCAL app.network_id é aplicado na mesma conexão/tx que as escritas
  try {
    const mastery = await withTenantTx(ctx.networkId, async (tx) => {
      const m = await (tx as any).eduSkillMastery.upsert({
        where: { studentId_skillId: { studentId, skillId } },
        create: { networkId: ctx.networkId, studentId, skillId, level, source, updatedAt: new Date() },
        update: { level, source, updatedAt: new Date() },
      });
      await (tx as any).eduSkillMasteryEvent.create({
        data: {
          networkId: ctx.networkId,
          studentId,
          skillId,
          level,
          source,
          ...(submissionId ? { submissionId } : {}),
        },
      });
      return m;
    });
    return NextResponse.json({ mastery });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
