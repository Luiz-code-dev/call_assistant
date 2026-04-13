import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sendThankYouEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ message: "Sem assinatura Stripe" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ message: "Assinatura inválida" }, { status: 400 });
  }

  const PLAN_CREDITS: Record<string, number> = { basic: 500, premium: 1000 };

  async function findUserIdByCustomer(customerId: string): Promise<string | null> {
    const byStripeId = await db.user.findFirst({ where: { stripeCustomerId: customerId } as any, select: { id: true } });
    if (byStripeId) return byStripeId.id;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      const email = !customer.deleted ? (customer as Stripe.Customer).email : null;
      if (email) {
        const byEmail = await db.user.findFirst({ where: { email }, select: { id: true } });
        return byEmail?.id ?? null;
      }
    } catch {}
    return null;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? "";
      const type = session.metadata?.type ?? "";
      const plan = session.metadata?.plan ?? "";
      const topupCredits = Number(session.metadata?.amount ?? session.metadata?.credits ?? 0);
      const email = session.customer_email ?? "";
      const stripeCustomerId = session.customer as string | null;
      const stripeSubscriptionId = session.subscription as string | null;

      if (!userId) {
        console.error("[webhook] checkout.session.completed — missing userId in metadata", session.id);
        break;
      }

      try {
        if (type === "subscription" && plan && PLAN_CREDITS[plan] !== undefined) {
          const planCredits = PLAN_CREDITS[plan];
          let planRenewsAt: Date | null = null;
          if (stripeSubscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
              planRenewsAt = new Date(sub.current_period_end * 1000);
            } catch {}
          }
          await db.$transaction([
            db.user.update({
              where: { id: userId },
              data: {
                plan,
                credits: planCredits,
                ...(stripeCustomerId ? { stripeCustomerId } : {}),
                ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
                subscriptionStatus: "active",
                ...(planRenewsAt ? { planRenewsAt } : {}),
              } as any,
            }),
            (db as any).creditTransaction.create({
              data: {
                userId,
                type: "credit",
                amount: planCredits,
                source: "plan",
                description: `Plano ${plan} ativado`,
              },
            }),
          ]);
          console.log(`[webhook] Plano ${plan} ativado para userId=${userId}`);
        } else if (type === "credits" && topupCredits > 0) {
          await db.$transaction([
            db.user.update({
              where: { id: userId },
              data: {
                credits: { increment: topupCredits },
                ...(stripeCustomerId ? { stripeCustomerId } : {}),
              } as any,
            }),
            (db as any).creditTransaction.create({
              data: {
                userId,
                type: "credit",
                amount: topupCredits,
                source: "purchase",
                description: `Recarga de ${topupCredits} créditos`,
              },
            }),
          ]);
          console.log(`[webhook] +${topupCredits} créditos creditados para userId=${userId}`);
        }
      } catch (dbErr) {
        console.error("[webhook] Erro ao atualizar banco:", dbErr);
        return NextResponse.json({ error: "db_error" }, { status: 500 });
      }

      try {
        if (email && userId) {
          const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
          await sendThankYouEmail(email, user?.name ?? "", plan || "credits", topupCredits);
        }
      } catch (emailErr) {
        console.error("[webhook] Erro ao enviar e-mail:", emailErr);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await findUserIdByCustomer(customerId);
      if (!userId) { console.warn("[webhook] subscription.updated — usuário não encontrado"); break; }
      try {
        await db.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: sub.status,
            planRenewsAt: new Date(sub.current_period_end * 1000),
            stripeSubscriptionId: sub.id,
            stripeCustomerId: customerId,
          } as any,
        });
        console.log(`[webhook] Assinatura atualizada — status=${sub.status} userId=${userId}`);
      } catch (dbErr) {
        console.error("[webhook] Erro ao atualizar assinatura:", dbErr);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = invoice.subscription as string | null;
      if (!subscriptionId) break;
      const billingReason = (invoice as any).billing_reason as string | null;
      if (billingReason !== "subscription_cycle" && billingReason !== "subscription_update") break;
      const userId = await findUserIdByCustomer(customerId);
      if (!userId) { console.warn("[webhook] invoice.payment_succeeded — usuário não encontrado"); break; }
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const planRenewsAt = new Date(sub.current_period_end * 1000);
        const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true } });
        const planCredits = user?.plan ? PLAN_CREDITS[user.plan] : null;
        if (planCredits !== undefined && planCredits !== null) {
          await db.$transaction([
            db.user.update({
              where: { id: userId },
              data: {
                credits: planCredits,
                subscriptionStatus: "active",
                planRenewsAt,
              } as any,
            }),
            (db as any).creditTransaction.create({
              data: {
                userId,
                type: "credit",
                amount: planCredits,
                source: "plan",
                description: `Renovação mensal — ${planCredits} créditos`,
              },
            }),
          ]);
          console.log(`[webhook] Renovação: +${planCredits} créditos para userId=${userId}, próxima em ${planRenewsAt.toISOString()}`);
        }
      } catch (dbErr) {
        console.error("[webhook] Erro ao processar renovação:", dbErr);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const userId = await findUserIdByCustomer(customerId);
      if (!userId) { console.warn("[webhook] invoice.payment_failed — usuário não encontrado"); break; }
      try {
        await db.user.update({
          where: { id: userId },
          data: { subscriptionStatus: "past_due" } as any,
        });
        console.log(`[webhook] Pagamento falhou — userId=${userId}`);
      } catch (dbErr) {
        console.error("[webhook] Erro ao marcar past_due:", dbErr);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await findUserIdByCustomer(customerId);
      if (!userId) { console.warn("[webhook] subscription.deleted — usuário não encontrado"); break; }
      try {
        await db.user.update({
          where: { id: userId },
          data: {
            plan: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            planRenewsAt: null,
          } as any,
        });
        console.log(`[webhook] Plano resetado para free — userId=${userId}`);
      } catch (dbErr) {
        console.error("[webhook] Erro ao resetar plano:", dbErr);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
