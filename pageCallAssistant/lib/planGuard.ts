import { db } from "@/lib/db";

export type ToolName = "improve" | "generate" | "interview" | "meeting" | "practice" | "network" | "live";

/** Custo em créditos por uso de qualquer ferramenta de IA */
export const CREDITS_PER_USE = 2;

/** Hierarquia de planos */
const PLAN_RANK: Record<string, number> = { free: 0, basic: 1, premium: 2 };

/**
 * Configuração de cada ferramenta:
 *  - minPlan: plano mínimo para acessar
 *  - dailyLimit: limite diário por plano (Infinity = ilimitado)
 */
const TOOL_CONFIG: Record<
  ToolName,
  { minPlan: "basic" | "premium"; dailyLimit: Partial<Record<string, number>> }
> = {
  improve:   { minPlan: "basic",   dailyLimit: { basic: 5,  premium: Infinity } },
  generate:  { minPlan: "basic",   dailyLimit: { basic: 5,  premium: Infinity } },
  interview: { minPlan: "basic",   dailyLimit: { basic: 3,  premium: Infinity } },
  meeting:   { minPlan: "premium", dailyLimit: { premium: Infinity } },
  practice:  { minPlan: "basic",   dailyLimit: { basic: 1,  premium: Infinity } },
  network:   { minPlan: "basic",   dailyLimit: { basic: 3,  premium: Infinity } },
  live:      { minPlan: "basic",   dailyLimit: { basic: 10, premium: Infinity } },
};

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  userPlan?: string;
  dailyUsed?: number;
  dailyLimit?: number;
}

/**
 * Verifica se o usuário pode usar a ferramenta.
 * SEMPRE lê o plano do banco — nunca confia no JWT.
 */
export async function checkToolAccess(
  userId: string,
  tool: ToolName
): Promise<AccessResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, credits: true },
  });

  if (!user) return { allowed: false, reason: "Usuário não encontrado." };

  const config = TOOL_CONFIG[tool];
  const userRank = PLAN_RANK[user.plan] ?? 0;
  const minRank  = PLAN_RANK[config.minPlan] ?? 1;

  // 1. Verifica plano mínimo
  if (userRank < minRank) {
    const planLabel = config.minPlan === "premium" ? "Premium" : "Básico";
    return {
      allowed: false,
      reason: `Esta ferramenta requer o plano ${planLabel} ou superior.`,
      userPlan: user.plan,
    };
  }

  // 2. Verifica saldo de créditos
  if (user.credits < CREDITS_PER_USE) {
    return {
      allowed: false,
      reason: `Créditos insuficientes. Você precisa de pelo menos ${CREDITS_PER_USE} créditos.`,
      userPlan: user.plan,
    };
  }

  // 3. Verifica limite diário
  const limit = config.dailyLimit[user.plan] ?? 0;
  if (limit !== Infinity) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const usedToday: number = await (db as any).toolUsage.count({
      where: { userId, tool, createdAt: { gte: startOfDay } },
    });
    if (usedToday >= limit) {
      return {
        allowed: false,
        reason: `Limite diário de ${limit} uso(s) para o plano Básico atingido. Faça upgrade para Premium para uso ilimitado.`,
        userPlan: user.plan,
        dailyUsed: usedToday,
        dailyLimit: limit,
      };
    }
    return { allowed: true, userPlan: user.plan, dailyUsed: usedToday, dailyLimit: limit };
  }

  return { allowed: true, userPlan: user.plan };
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
