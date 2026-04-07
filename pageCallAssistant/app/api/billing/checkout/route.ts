import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login?redirect=/pricing", req.url));
  }

  const { searchParams } = req.nextUrl;
  const priceId = searchParams.get("priceId");
  const type = searchParams.get("type") || "subscription";
  const plan = searchParams.get("plan") as "basic" | "premium" | null;
  const credits = searchParams.get("credits");

  if (!priceId) {
    return NextResponse.redirect(new URL("/pricing?error=missing_price", req.url));
  }

  if (type === "credits" && (!session.plan || session.plan === "free")) {
    return NextResponse.redirect(new URL("/pricing?error=subscription_required", req.url));
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL("/pricing?error=payments_not_configured", req.url));
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    if (type === "subscription") {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: session.email,
        client_reference_id: session.sub,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?checkout=success`,
        cancel_url: `${appUrl}/pricing?checkout=canceled`,
        metadata: { userId: session.sub, type: "subscription", plan: plan ?? "" },
      });
      if (!checkoutSession.url) {
        return NextResponse.redirect(new URL("/pricing?error=checkout_failed", req.url));
      }
      return NextResponse.redirect(checkoutSession.url);
    }

    if (type === "credits") {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: session.email,
        client_reference_id: session.sub,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/usage?credits=success&amount=${credits ?? "0"}`,
        cancel_url: `${appUrl}/pricing?checkout=canceled`,
        metadata: { userId: session.sub, type: "credits", amount: credits ?? "0", source: "topup" },
      });
      if (!checkoutSession.url) {
        return NextResponse.redirect(new URL("/pricing?error=checkout_failed", req.url));
      }
      return NextResponse.redirect(checkoutSession.url);
    }

    return NextResponse.redirect(new URL("/pricing?error=invalid_type", req.url));
  } catch (err: unknown) {
    console.error("[billing/checkout] Stripe error:", err);
    return NextResponse.redirect(new URL("/pricing?error=stripe_error", req.url));
  }
}
