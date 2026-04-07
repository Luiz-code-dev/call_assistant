"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { getSession } from "@/lib/auth";

export async function createSubscription(priceId: string) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/pricing");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Pagamentos não configurados no servidor.");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=canceled`,
    metadata: { userId: session.sub, plan: session.plan },
  });

  redirect(stripeSession.url!);
}

export async function createCreditsCheckout(priceId: string, credits: number) {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/pricing");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Pagamentos não configurados no servidor.");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/usage?credits=success&amount=${credits}`,
    cancel_url: `${appUrl}/pricing?checkout=canceled`,
    metadata: { userId: session.sub, credits: String(credits) },
  });

  redirect(stripeSession.url!);
}
