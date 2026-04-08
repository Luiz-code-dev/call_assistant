import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken } from "@/lib/auth";

function appRedirect(path: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.speakf.com.br";
  return NextResponse.redirect(`${base}${path}`);
}

export async function POST(req: NextRequest) {
  const rawToken = req.cookies.get("token")?.value;

  console.log("CHECKOUT_DEBUG", {
    host: req.headers.get("host"),
    cookieHeaderPresent: !!req.headers.get("cookie"),
    hasRawToken: !!rawToken,
    tokenPreview: rawToken ? rawToken.slice(0, 20) : null,
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length,
  });

  const session = rawToken ? await verifyToken(rawToken) : null;

  console.log("CHECKOUT_SESSION_RESULT", {
    hasSession: !!session,
    sub: session?.sub ?? null,
    email: session?.email ?? null,
  });

  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const priceId: string | null = body.priceId ?? null;
  const type: string = body.type ?? "subscription";
  const plan: "basic" | "premium" | null = body.plan ?? null;
  const credits: string | null = body.credits ? String(body.credits) : null;

  if (!priceId) {
    return NextResponse.json({ error: "missing_price" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "payments_not_configured" }, { status: 500 });
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
        return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
      }
      return NextResponse.json({ url: checkoutSession.url });
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
        return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
      }
      return NextResponse.json({ url: checkoutSession.url });
    }

    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[billing/checkout] Stripe error:", err);
    return NextResponse.json({ error: "stripe_error", detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
