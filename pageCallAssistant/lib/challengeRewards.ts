import { db } from "@/lib/db";

/** Créditos concedidos na primeira submissão de cada desafio (incentivo de participação) */
export const PARTICIPATION_PRIZE = 5;

/**
 * Concede créditos de participação se esta for a PRIMEIRA submissão do usuário
 * para o desafio. Deve ser chamada APÓS criar a submissão, passando a contagem
 * de submissões que existiam ANTES (priorCount).
 * Retorna a quantidade de créditos concedidos (0 se não for a primeira).
 */
export async function awardParticipation(
  userId: string,
  priorCount: number,
  challengeTitle: string
): Promise<number> {
  if (priorCount > 0) return 0;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: { increment: PARTICIPATION_PRIZE } },
    }),
    db.creditTransaction.create({
      data: {
        userId,
        type: "earn",
        amount: PARTICIPATION_PRIZE,
        source: "challenge_participation",
        description: `🎯 Participou do desafio "${challengeTitle}"`,
      },
    }),
  ]);

  return PARTICIPATION_PRIZE;
}
