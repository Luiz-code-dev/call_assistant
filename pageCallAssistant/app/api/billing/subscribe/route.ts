import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ message: "Pagamentos não configurados" }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const rawToken = req.cookies.get("token")?.value;
    if (!rawToken) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(rawToken);
    if (!payload) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ message: "priceId é obrigatório" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: payload.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      metadata: { userId: payload.sub, plan: payload.plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe subscribe error:", msg);
    return NextResponse.json({ message: `Stripe: ${msg}` }, { status: 500 });
  }
}
