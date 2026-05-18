import { db } from "@/lib/db";

export type ToolName = "improve" | "generate" | "interview" | "meeting" | "practice" | "network" | "live";

/** Custo em créditos por uso de qualquer ferramenta de IA */
export const CREDITS_PER_USE = 2;

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  userPlan?: string;
}

/**
 * Verifica se o usuário pode usar a ferramenta.
 * Todos os usuários têm acesso a todas as ferramentas.
 * A única restrição é ter créditos suficientes.
 * Membros de organizações (B2B) usam sem consumir créditos.
 */
export async function checkToolAccess(
  userId: string,
  _tool: ToolName
): Promise<AccessResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, credits: true },
  });

  if (!user) return { allowed: false, reason: "Usuário não encontrado." };

  if (user.credits < CREDITS_PER_USE) {
    return {
      allowed: false,
      reason: `Créditos insuficientes. Você precisa de pelo menos ${CREDITS_PER_USE} créditos para usar esta ferramenta.`,
      userPlan: user.plan,
    };
  }

  return { allowed: true, userPlan: user.plan };
}

/**
 * Verifica se o usuário é membro de alguma organização.
 * Membros corporativos usam o Live sem consumir créditos.
 */
export async function isOrgMember(userId: string): Promise<boolean> {
  const count = await (db as any).orgMember.count({ where: { userId } });
  return count > 0;
}

/**
 * Debita créditos e registra o uso atomicamente.
 * Chamar SOMENTE após resposta bem-sucedida da IA.
 */
export async function consumeToolCredits(
  userId: string,
  tool: ToolName
): Promise<void> {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: { decrement: CREDITS_PER_USE } },
    }),
    (db as any).creditTransaction.create({
      data: {
        userId,
        type: "debit",
        amount: CREDITS_PER_USE,
        source: "tool_use",
        description: `Ferramenta IA: ${tool}`,
      },
    }),
    (db as any).toolUsage.create({
      data: { userId, tool },
    }),
  ]);
}
