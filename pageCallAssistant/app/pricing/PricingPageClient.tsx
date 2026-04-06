"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { CheckCircle2, Zap, ArrowRight, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userPlan: string | null;
  stripePriceBasic: string | null;
  stripePricePremium: string | null;
  stripePriceCredits5: string | null;
  stripePriceCredits10: string | null;
  stripePriceCredits25: string | null;
  stripePriceCredits50: string | null;
}

export default function PricingPageClient({
  userPlan,
  stripePriceBasic,
  stripePricePremium,
  stripePriceCredits5,
  stripePriceCredits10,
  stripePriceCredits25,
  stripePriceCredits50,
}: Props) {
  const canTopUp = userPlan === "basic" || userPlan === "premium";
  const plans = [
    {
      id: "free",
      name: "Free",
      priceLabel: "$0",
      period: "",
      credits: 50,
      description: "Try before you commit",
      features: [
        "50 credits on sign-up",
        "Real-time transcription",
        "Automatic translation",
        "Copilot suggestions",
        "Windows desktop app",
      ],
      cta: "Get started free",
      href: "/register",
      stripePrice: null,
      highlighted: false,
    },
    {
      id: "basic",
      name: "Basic",
      priceLabel: "$15",
      period: "/mo",
      credits: 500,
      description: "For regular professional use",
      features: [
        "500 credits / month",
        "Auto monthly renewal",
        "Real-time transcription",
        "Automatic translation",
        "Copilot suggestions",
        "Top-up credits anytime",
        "Email support",
      ],
      cta: "Subscribe — $15/mo",
      href: null,
      stripePrice: stripePriceBasic,
      highlighted: false,
      badge: "Most popular",
    },
    {
      id: "premium",
      name: "Premium",
      priceLabel: "$30",
      period: "/mo",
      credits: 1000,
      description: "For heavy use and power users",
      features: [
        "1,000 credits / month",
        "Auto monthly renewal",
        "Real-time transcription",
        "Automatic translation",
        "Copilot suggestions",
        "Top-up credits anytime",
        "Priority support",
        "Full session history",
      ],
      cta: "Subscribe — $30/mo",
      href: null,
      stripePrice: stripePricePremium,
      highlighted: true,
    },
  ];

  const creditPacks = [
    { credits: 50,  price: "$5",  priceId: stripePriceCredits5  ?? null },
    { credits: 150, price: "$10", priceId: stripePriceCredits10 ?? null },
    { credits: 400, price: "$25", priceId: stripePriceCredits25 ?? null },
    { credits: 900, price: "$50", priceId: stripePriceCredits50 ?? null },
  ];

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSubscribe(plan: typeof plans[0]) {
    if (!plan.stripePrice) {
      if (plan.href) { window.location.href = plan.href; return; }
      toast.error("Sistema de pagamento não configurado. Tente novamente em instantes.");
      return;
    }
    setLoadingPlan(plan.id);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.stripePrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { window.location.href = `/login?redirect=/pricing`; return; }
        throw new Error(data.message);
      }
      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar pagamento");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleBuyCredits(pack: typeof creditPacks[0]) {
    if (!pack.priceId) {
      toast.error("Pagamento não configurado. Configure as variáveis Stripe no servidor.");
      return;
    }
    setLoadingPlan(`credits_${pack.credits}`);
    try {
      const res = await fetch("/api/billing/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: pack.priceId, credits: pack.credits }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { window.location.href = `/login?redirect=/pricing`; return; }
        throw new Error(data.message);
      }
      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar pagamento");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-6 pt-32 pb-24">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <Badge variant="purple" className="mb-4">Pricing</Badge>
            <h1 className="mb-4 text-5xl font-bold">
              Simple, transparent,{" "}
              <span className="gradient-text">no surprises</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              Start free. Upgrade when ready. Pay only for what you use. Prices in USD.
            </p>
          </div>

          {/* Plans */}
          <div className="mb-20 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative border-border/50 transition-all ${
                  plan.highlighted
                    ? "border-violet-500/50 bg-violet-500/5 shadow-lg shadow-violet-500/10"
                    : "bg-card hover:border-violet-500/20"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="purple">{plan.badge}</Badge>
                  </div>
                )}
                <CardHeader>
                  <p className="text-sm text-muted-foreground">{plan.name}</p>
                  <CardTitle className="flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.priceLabel}</span>
                    {plan.period && (
                      <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-3 py-2">
                    <Zap className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-sm font-medium">{plan.credits.toLocaleString()} credits{plan.period ? "/mo" : " one-time"}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.highlighted ? "gradient" : "outline"}
                    className="w-full"
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {loadingPlan === plan.id ? "Aguarde..." : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Credit Packs */}
          <div id="credits">
            <div className="mb-8 text-center">
              <Badge variant="purple" className="mb-3">Top-up credits</Badge>
              <h2 className="text-3xl font-bold">Need more? Add credits</h2>
              <p className="mt-2 text-muted-foreground">
                One-time purchases, starting at $5. Créditos adicionais nunca expiram.
              </p>
            </div>

            {canTopUp ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {creditPacks.map((pack) => (
                  <Card key={pack.priceId} className="border-border/50 bg-card hover:border-violet-500/20 transition-all">
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div>
                        <p className="text-2xl font-bold">{pack.price}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Zap className="h-3.5 w-3.5 text-violet-400" />
                          <span className="text-sm text-muted-foreground">{pack.credits} credits</span>
                        </div>
                      </div>
                      <Button
                        variant="gradient"
                        size="sm"
                        className="w-full"
                        onClick={() => handleBuyCredits(pack)}
                        disabled={loadingPlan === `credits_${pack.credits}`}
                      >
                        {loadingPlan === `credits_${pack.credits}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `Buy ${pack.price}`
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-8 text-center">
                <Lock className="mx-auto mb-3 h-8 w-8 text-violet-400/60" />
                <h3 className="mb-2 font-semibold">
                  {userPlan === null ? "Faça login para adicionar créditos" : "Disponível apenas para assinantes"}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {userPlan === null
                    ? "Entre na sua conta ou crie uma gratuitamente."
                    : "Recargas avulsas estão disponíveis para assinantes dos planos Basic ou Premium."}
                </p>
                <Button variant="gradient" size="sm" asChild>
                  <Link href={userPlan === null ? "/login?redirect=/pricing" : "/pricing"}>
                    {userPlan === null ? "Entrar" : "Assinar Basic — $15/mo"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-3xl font-bold">Frequently asked questions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  q: "What is a credit?",
                  a: "Each credit represents one unit of AI usage. Transcription, translation, and Copilot suggestions each consume credits based on the length of the audio processed.",
                },
                {
                  q: "Do credits expire?",
                  a: "Monthly plan credits reset each billing cycle. Top-up credits never expire and roll over month to month.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes, cancel anytime with no penalty. Your plan stays active until the end of the current billing period.",
                },
                {
                  q: "How does the free trial work?",
                  a: "Create an account and receive 50 credits instantly, no credit card required. Upgrade whenever you're ready.",
                },
              ].map((item) => (
                <div key={item.q} className="rounded-xl border border-border/50 bg-card p-5">
                  <h3 className="mb-2 font-semibold">{item.q}</h3>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
