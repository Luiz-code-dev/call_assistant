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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? "";
      const type = session.metadata?.type ?? "";
      const plan = session.metadata?.plan ?? "";
      const topupCredits = Number(session.metadata?.credits ?? 0);
      const email = session.customer_email ?? "";

      if (!userId) {
        console.error("[webhook] checkout.session.completed — missing userId in metadata", session.id);
        break;
      }

      try {
        if (type === "subscription" && plan && PLAN_CREDITS[plan] !== undefined) {
          const planCredits = PLAN_CREDITS[plan];
          await db.$transaction([
            db.user.update({
              where: { id: userId },
              data: { plan, credits: planCredits },
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
              data: { credits: { increment: topupCredits } },
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
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      try {
        await db.user.updateMany({
          where: { stripeCustomerId: customerId } as any,
          data: { plan: "free" },
        });
        console.log(`[webhook] Assinatura cancelada para customerId=${customerId}`);
      } catch (dbErr) {
        console.error("[webhook] Erro ao cancelar assinatura:", dbErr);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
