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

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await fetch(`${backendUrl}/api/billing/webhook/checkout-completed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, metadata: session.metadata }),
      });
      try {
        const email = session.customer_email ?? "";
        const userId = session.metadata?.userId ?? "";
        const credits = Number(session.metadata?.credits ?? 0);
        const plan = session.metadata?.plan ?? "credits";
        if (email && userId) {
          const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
          await sendThankYouEmail(email, user?.name ?? "", plan, credits);
        }
      } catch (emailErr) {
        console.error("Thank-you email error:", emailErr);
      }
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await fetch(`${backendUrl}/api/billing/webhook/payment-succeeded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id, subscriptionId: invoice.subscription }),
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await fetch(`${backendUrl}/api/billing/webhook/subscription-canceled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: sub.id }),
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
