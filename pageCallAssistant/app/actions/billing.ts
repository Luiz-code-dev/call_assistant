"use server";

import Stripe from "stripe";
import { getSession } from "@/lib/auth";

type ActionResult =
  | { ok: true; url: string }
  | { ok: false; redirect: string }
  | { ok: false; error: string };

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Pagamentos não configurados no servidor.");
  return new Stripe(secretKey, { apiVersion: "2024-06-20" });
}

function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function createSubscription(
  priceId: string,
  plan: "basic" | "premium"
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, redirect: "/login?redirect=/pricing" };
  }

  try {
    const stripe = getStripe();
    const appUrl = getAppUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.email,
      client_reference_id: session.sub,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      metadata: { userId: session.sub, type: "subscription", plan },
    });
    if (!checkoutSession.url) {
      return { ok: false, error: "Não foi possível iniciar o checkout." };
    }
    return { ok: true, url: checkoutSession.url };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createCreditsCheckout(
  priceId: string,
  credits: number
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, redirect: "/login?redirect=/pricing" };
  }

  if (!session.plan || session.plan === "free") {
    return { ok: false, error: "Recarga disponível apenas para assinantes Basic ou Premium." };
  }

  try {
    const stripe = getStripe();
    const appUrl = getAppUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.email,
      client_reference_id: session.sub,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/usage?credits=success&amount=${credits}`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      metadata: { userId: session.sub, type: "credits", amount: String(credits), source: "topup" },
    });
    if (!checkoutSession.url) {
      return { ok: false, error: "Não foi possível iniciar o checkout." };
    }
    return { ok: true, url: checkoutSession.url };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
