import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { hashFamilyCode, sameBirthDate } from "@/lib/escola/familia";

/* eslint-disable @typescript-eslint/no-explicit-any */

const schema = z.object({
  familyCode: z.string().min(6).max(16),
  birthDate: z.string().min(8),
  relation: z.enum(["MAE", "PAI", "AVO_AVO", "TIO_TIA", "TUTOR_LEGAL", "OUTRO"]).default("OUTRO"),
});

// Liga o responsavel JA LOGADO (cookie) a mais um aluno, provando posse do
// cartao (codigo) + data de nascimento. Usa o mesmo EduGuardian da sessao.
export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { familyCode, birthDate, relation } = parsed.data;

  try {
    const record = await (prismaEdu as any).eduFamilyCode.findFirst({ where: { codeHash: hashFamilyCode(familyCode) } });
    if (!record || record.activationsLeft <= 0 || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Código inválido ou expirado" }, { status: 400 });
    }
    const student = await (prismaEdu as any).eduStudent.findFirst({ where: { id: record.studentId, isActive: true } });
    if (!student || !sameBirthDate(birthDate, student.birthDate)) {
      return NextResponse.json({ error: "Código ou data de nascimento não conferem" }, { status: 400 });
    }
    // O aluno precisa ser da mesma rede do responsavel logado.
    if (student.networkId !== ctx.networkId) return NextResponse.json({ error: "Aluno de outra rede" }, { status: 400 });

    await (prismaEdu as any).eduFamilyCode.update({ where: { id: record.id }, data: { activationsLeft: record.activationsLeft - 1 } });
    await (prismaEdu as any).eduGuardianLink.upsert({
      where: { guardianId_studentId: { guardianId: ctx.guardianId, studentId: student.id } },
      create: { networkId: ctx.networkId, guardianId: ctx.guardianId, studentId: student.id, relation, isActive: true },
      update: { isActive: true, relation, revokedAt: null, revokedById: null, revokeReason: null },
    });
    return NextResponse.json({ ok: true, studentId: student.id });
  } catch (err) {
    console.error("[familia/adicionar-filho:POST]", err);
    return NextResponse.json({ error: "Não foi possível adicionar." }, { status: 500 });
  }
}
