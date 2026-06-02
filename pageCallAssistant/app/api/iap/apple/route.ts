import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

// Plans: SET credits to plan allocation (same as Stripe webhook behavior)
const PLAN_MAP: Record<string, { plan: string; credits: number }> = {
  "br.com.speakflow.plan.basic":   { plan: "basic",   credits: 500  },
  "br.com.speakflow.plan.premium": { plan: "premium", credits: 1000 },
};

// Credit packs: INCREMENT credits (one-time consumable, credits never expire)
// Only for basic/premium users — one purchase per amount per month (same as web rule)
const PACK_MAP: Record<string, { credits: number }> = {
  "br.com.speakflow.credits_50":  { credits: 50  },
  "br.com.speakflow.credits_150": { credits: 150 },
  "br.com.speakflow.credits_400": { credits: 400 },
};

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const userId = payload.sub as string;
  const body = await req.json();
  const { transactionId, productId, type } = body as {
    transactionId: string;
    productId: string;
    type: "plan" | "pack";
  };

  if (!transactionId || !productId) {
    return NextResponse.json({ error: "transactionId e productId são obrigatórios" }, { status: 400 });
  }

  // ── Plan subscription ────────────────────────────────────────────────────────
  if (type === "plan") {
    const planMeta = PLAN_MAP[productId];
    if (!planMeta) return NextResponse.json({ error: "Produto inválido" }, { status: 400 });

    const txDescription = `IAP_APPLE_PLAN:${transactionId}:${productId}`;
    const existing = await (db as any).creditTransaction.findFirst({ where: { userId, description: txDescription } });
    if (existing) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true, plan: true } });
      return NextResponse.json({ message: "Já processado", credits: user?.credits, plan: user?.plan });
    }

    await (db as any).$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          plan: planMeta.plan,
          credits: planMeta.credits,           // SET (not increment) — same as Stripe webhook
          subscriptionStatus: "active",
          planRenewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        } as any,
      }),
      (db as any).creditTransaction.create({
        data: { userId, type: "credit", amount: planMeta.credits, source: "plan", description: `Plano ${planMeta.plan} ativado via IAP Apple` },
      }),
    ]);

    const updated = await db.user.findUnique({ where: { id: userId }, select: { credits: true, plan: true } });
    return NextResponse.json({ success: true, credits: updated?.credits, plan: updated?.plan });
  }

  // ── Credit pack (consumable) ──────────────────────────────────────────────────
  if (type === "pack") {
    const packMeta = PACK_MAP[productId];
    if (!packMeta) return NextResponse.json({ error: "Produto inválido" }, { status: 400 });

    const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true, credits: true } });
    if (!user || user.plan === "free") {
      return NextResponse.json({ error: "Recargas disponíveis apenas para assinantes Basic ou Premium." }, { status: 403 });
    }

    // One purchase per pack amount per month (same rule as web)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const alreadyThisMonth = await (db as any).creditTransaction.findFirst({
      where: { userId, type: "credit", source: "purchase", amount: packMeta.credits, createdAt: { gte: startOfMonth } },
    });
    if (alreadyThisMonth) {
      return NextResponse.json({ error: "Você já comprou este pacote este mês." }, { status: 409 });
    }

    const txDescription = `IAP_APPLE_PACK:${transactionId}:${productId}`;
    const existing = await (db as any).creditTransaction.findFirst({ where: { userId, description: txDescription } });
    if (existing) {
      return NextResponse.json({ message: "Já processado", credits: user.credits, plan: user.plan });
    }

    await (db as any).$transaction([
      db.user.update({
        where: { id: userId },
        data: { credits: { increment: packMeta.credits } } as any,
      }),
      (db as any).creditTransaction.create({
        data: { userId, type: "credit", amount: packMeta.credits, source: "purchase", description: txDescription },
      }),
    ]);

    const updated = await db.user.findUnique({ where: { id: userId }, select: { credits: true, plan: true } });
    return NextResponse.json({ success: true, credits: updated?.credits, plan: updated?.plan });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
