import { prismaEdu } from "@/lib/escola/db";

// Confirma que o responsavel da sessao tem vinculo ATIVO com o aluno.
export async function guardianOwnsStudent(guardianId: string, studentId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = await (prismaEdu as any).eduGuardianLink.findFirst({
    where: { guardianId, studentId, isActive: true },
    select: { id: true },
  });
  return !!link;
}

// Inicio da semana (segunda) no fuso America/Sao_Paulo, retornado como Date UTC.
export function weekStartSaoPaulo(now = new Date()): Date {
  // America/Sao_Paulo = UTC-3 (sem horario de verao desde 2019).
  const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const day = sp.getUTCDay(); // 0=dom ... 1=seg
  const diff = (day + 6) % 7; // dias desde segunda
  const monday = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate() - diff));
  // volta para UTC real (00:00 de SP = 03:00 UTC)
  return new Date(monday.getTime() + 3 * 60 * 60 * 1000);
}

// Indice do dia (0=seg ... 6=dom) no fuso America/Sao_Paulo para uma data.
export function dayIndexSaoPaulo(d: Date): number {
  const sp = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return (sp.getUTCDay() + 6) % 7;
}

export const LEVEL_LABEL = { MASTERED: "Domina", ALMOST: "Quase lá", NOT_YET: "Ainda não" } as const;
