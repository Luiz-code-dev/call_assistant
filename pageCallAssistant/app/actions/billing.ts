"use server";

import Stripe from "stripe";
import { getSession } from "@/lib/auth";

type ActionResult =
  | { ok: true; url: string }
  | { ok: false; redirect: string }
  | { ok: false; error: string };

export async function createSubscription(priceId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, redirect: "/login?redirect=/pricing" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, error: "Pagamentos não configurados no servidor." };
  }

  try {
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
    return { ok: true, url: stripeSession.url! };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createCreditsCheckout(priceId: string, credits: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, redirect: "/login?redirect=/pricing" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, error: "Pagamentos não configurados no servidor." };
  }

  try {
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
    return { ok: true, url: stripeSession.url! };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
