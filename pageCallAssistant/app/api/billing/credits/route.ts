import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const rawToken = req.cookies.get("token")?.value;
    if (!rawToken) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(rawToken);
    if (!payload) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ message: "Pagamentos não configurados" }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const { priceId, credits } = await req.json();

    if (!priceId) {
      return NextResponse.json({ message: "priceId é obrigatório" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: payload.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/usage?credits=success&amount=${credits ?? 0}`,
      cancel_url: `${appUrl}/pricing#credits`,
      metadata: { userId: payload.sub, credits: String(credits ?? 0) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe credits error:", err);
    return NextResponse.json({ message: "Erro ao criar sessão de pagamento" }, { status: 500 });
  }
}
