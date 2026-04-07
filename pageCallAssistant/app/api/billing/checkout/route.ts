import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken } from "@/lib/auth";

function appRedirect(path: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.speakf.com.br";
  return NextResponse.redirect(`${base}${path}`);
}

export async function GET(req: NextRequest) {
  const rawToken = req.cookies.get("token")?.value;
  const session = rawToken ? await verifyToken(rawToken) : null;

  if (!session) {
    return appRedirect("/pricing?error=not_authenticated");
  }

  const { searchParams } = req.nextUrl;
  const priceId = searchParams.get("priceId");
  const type = searchParams.get("type") || "subscription";
  const plan = searchParams.get("plan") as "basic" | "premium" | null;
  const credits = searchParams.get("credits");

  if (!priceId) {
    return appRedirect("/pricing?error=missing_price");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return appRedirect("/pricing?error=payments_not_configured");
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
        return appRedirect("/pricing?error=checkout_failed");
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
        return appRedirect("/pricing?error=checkout_failed");
      }
      return NextResponse.redirect(checkoutSession.url);
    }

    return appRedirect("/pricing?error=invalid_type");
  } catch (err: unknown) {
    console.error("[billing/checkout] Stripe error:", err);
    return appRedirect("/pricing?error=stripe_error");
  }
}
