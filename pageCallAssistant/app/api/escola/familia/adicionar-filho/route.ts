import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaEdu, setTenantDb } from "@/lib/escola/db";
import { getFamilyContext } from "@/lib/escola/family-context";
import { isEscolasEnabled } from "@/lib/escola/feature-flag";
import { sameBirthDate, MAX_GUARDIANS_PER_STUDENT } from "@/lib/escola/familia";
import { acharCodigoFamilia, bloqueado, registrarErroData, usarCodigo } from "@/lib/escola/codigo-familia";
import { avisarFamilia, avisoNovoResponsavel } from "@/lib/escola/avisos-familia";

/* eslint-disable @typescript-eslint/no-explicit-any */

const schema = z.object({
  familyCode: z.string().min(6).max(16),
  birthDate: z.string().min(8),
  relation: z.enum(["MAE", "PAI", "AVO_AVO", "TIO_TIA", "TUTOR_LEGAL", "OUTRO"]).default("OUTRO"),
});

const RELACAO: Record<string, string> = { MAE: "mãe", PAI: "pai", AVO_AVO: "avó ou avô", TIO_TIA: "tia ou tio", TUTOR_LEGAL: "tutor legal", OUTRO: "responsável" };

// Liga o responsavel JA LOGADO (cookie) a mais um aluno, provando posse do
// cartao (codigo) + data de nascimento. Usa o mesmo EduGuardian da sessao.
export async function POST(req: NextRequest) {
  if (!isEscolasEnabled()) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (ctx?.db) setTenantDb(ctx.db);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { familyCode, birthDate, relation } = parsed.data;

  try {
    const achado = await acharCodigoFamilia(familyCode, ctx.networkId);
    if (!achado) return NextResponse.json({ error: "Código inválido ou expirado. Peça uma ficha nova à escola." }, { status: 400 });
    const { record, student } = achado;
    // O aluno precisa ser da mesma escola (rede) do responsável logado.
    if (student.networkId !== ctx.networkId) return NextResponse.json({ error: "Aluno de outra escola" }, { status: 400 });
    const minutos = bloqueado(record);
    if (minutos) return NextResponse.json({ error: `Este código está bloqueado por segurança. Tente de novo em ${minutos} minutos.` }, { status: 429 });
    if (!student.birthDate) return NextResponse.json({ error: "A escola ainda não informou a data de nascimento deste aluno. Fale com a secretaria." }, { status: 400 });
    if (!sameBirthDate(birthDate, student.birthDate)) {
      return NextResponse.json({ error: await registrarErroData(ctx.db, record) }, { status: 400 });
    }
    const vinculados = await (prismaEdu as any).eduGuardianLink.count({ where: { studentId: student.id, isActive: true, guardianId: { not: ctx.guardianId } } });
    if (vinculados >= MAX_GUARDIANS_PER_STUDENT) return NextResponse.json({ error: "Este aluno já tem o número máximo de responsáveis. Fale com a escola." }, { status: 409 });

    await usarCodigo(ctx.db, record);
    await (prismaEdu as any).eduGuardianLink.upsert({
      where: { guardianId_studentId: { guardianId: ctx.guardianId, studentId: student.id } },
      create: { networkId: ctx.networkId, guardianId: ctx.guardianId, studentId: student.id, relation, isActive: true },
      update: { isActive: true, relation, revokedAt: null, revokedById: null, revokeReason: null },
    });
    const eu = await (prismaEdu as any).eduGuardian.findUnique({ where: { id: ctx.guardianId }, select: { name: true } });
    await avisarFamilia(ctx.db, ctx.networkId, student.id, `NOVO_RESPONSAVEL:${ctx.guardianId}`,
      avisoNovoResponsavel(student.fullName, eu?.name ?? "", RELACAO[relation] ?? "responsável", student.id), new Date(), ctx.guardianId).catch(() => 0);
    return NextResponse.json({ ok: true, studentId: student.id });
  } catch (err) {
    console.error("[familia/adicionar-filho:POST]", err);
    return NextResponse.json({ error: "Não foi possível adicionar." }, { status: 500 });
  }
}
