"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { CheckCircle2, Zap, ArrowRight, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  sessionUser: { id: string; name: string; email: string; plan: string } | null;
  userPlan: string | null;
  stripePriceBasic: string | null;
  stripePricePremium: string | null;
  stripePriceCredits5: string | null;
  stripePriceCredits10: string | null;
  stripePriceCredits25: string | null;
  stripePriceCredits50: string | null;
}

export default function PricingPageClient({
  sessionUser,
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
      name: "Gratuito",
      priceLabel: "Grátis",
      period: "",
      credits: 50,
      description: "Comece sem compromisso",
      features: [
        "50 créditos ao criar conta",
        "Transcrição em tempo real",
        "Tradução automática",
        "Sugestões do Copilot",
        "App desktop Windows",
      ],
      cta: "Começar grátis",
      href: "/register",
      stripePrice: null,
      highlighted: false,
    },
    {
      id: "basic",
      name: "Básico",
      priceLabel: "R$ 74,90",
      period: "/mês",
      credits: 500,
      description: "Para uso profissional regular",
      features: [
        "500 créditos / mês",
        "Renovação mensal automática",
        "Transcrição em tempo real",
        "Tradução automática",
        "Sugestões do Copilot",
        "Recarga de créditos avulsa",
        "Suporte por e-mail",
      ],
      cta: "Assinar — R$ 74,90/mês",
      href: null,
      stripePrice: stripePriceBasic,
      highlighted: false,
      badge: "Mais popular",
    },
    {
      id: "premium",
      name: "Premium",
      priceLabel: "R$ 149,90",
      period: "/mês",
      credits: 1000,
      description: "Para uso intenso e power users",
      features: [
        "1.000 créditos / mês",
        "Renovação mensal automática",
        "Transcrição em tempo real",
        "Tradução automática",
        "Sugestões do Copilot",
        "Recarga de créditos avulsa",
        "Suporte prioritário",
        "Histórico completo de sessões",
      ],
      cta: "Assinar — R$ 149,90/mês",
      href: null,
      stripePrice: stripePricePremium,
      highlighted: true,
    },
  ];

  const creditPacks = [
    { credits: 50, price: "R$ 24,90", priceId: stripePriceCredits5 ?? null },
  ];

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const checkout = searchParams.get("checkout");
    if (checkout === "canceled") toast.info("Checkout cancelado.");
    if (!error) return;
    const msgs: Record<string, string> = {
      missing_price: "Preço Stripe não configurado. Verifique NEXT_PUBLIC_STRIPE_PRICE_* no Railway.",
      subscription_required: "Recargas disponíveis para assinantes Basic ou Premium.",
      payments_not_configured: "STRIPE_SECRET_KEY não configurado no Railway.",
      checkout_failed: "Stripe não retornou URL de checkout. Verifique os Price IDs.",
      stripe_error: "Erro no Stripe — Price ID inválido ou chave incorreta.",
      invalid_type: "Tipo de checkout inválido.",
      not_authenticated: "Sessão expirada. Faça login novamente.",
    };
    toast.error(msgs[error] ?? `Erro de checkout: ${error}`);
  }, [searchParams]);

  async function handleSubscribe(plan: typeof plans[0]) {
    if (!plan.stripePrice) {
      if (plan.href) { window.location.href = plan.href; return; }
      toast.error("Sistema de pagamento não configurado. Verifique NEXT_PUBLIC_STRIPE_PRICE_* no Railway.");
      return;
    }
    setLoadingPlan(plan.id);
    try {
      const sfToken = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}) },
        body: JSON.stringify({ priceId: plan.stripePrice, type: "subscription", plan: plan.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(errorMsg(data.error) + (data.detail ? ` (${data.detail})` : ""));
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Erro de rede ao iniciar checkout. Tente novamente.");
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
      const sfToken = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(sfToken ? { Authorization: `Bearer ${sfToken}` } : {}) },
        body: JSON.stringify({ priceId: pack.priceId, type: "credits", credits: String(pack.credits) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(errorMsg(data.error) + (data.detail ? ` (${data.detail})` : ""));
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Erro de rede ao iniciar checkout. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  }

  function errorMsg(code: string): string {
    const msgs: Record<string, string> = {
      not_authenticated: "Sessão expirada. Faça login novamente.",
      missing_price: "Price ID não configurado no Railway.",
      payments_not_configured: "STRIPE_SECRET_KEY não configurado no Railway.",
      checkout_failed: "Stripe não retornou URL. Verifique os Price IDs.",
      stripe_error: "Erro no Stripe:",
      invalid_type: "Tipo inválido.",
    };
    return msgs[code] ?? `Erro: ${code}`;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar initialUser={sessionUser} />
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
              Comece grátis. Faça upgrade quando quiser. Pague só pelo que usar. Preços em BRL.
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
                    <span className="text-sm font-medium">{plan.credits.toLocaleString()} créditos{plan.period ? "/mês" : " inicial"}</span>
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
              <Badge variant="purple" className="mb-3">Recarga de créditos</Badge>
              <h2 className="text-3xl font-bold">Precisa de mais? Adicione créditos</h2>
              <p className="mt-2 text-muted-foreground">
                Compra única, sem assinatura. Créditos adicionais nunca expiram.
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
                          `Comprar ${pack.price}`
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
                    {userPlan === null ? "Entrar" : "Assinar Básico — R$ 74,90/mês"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-3xl font-bold">Perguntas frequentes</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  q: "O que é um crédito?",
                  a: "Cada crédito representa uma unidade de uso de IA. Transcrição, tradução e sugestões do Copilot consomem créditos conforme a duração do áudio processado.",
                },
                {
                  q: "Os créditos expiram?",
                  a: "Créditos do plano mensal renovam a cada ciclo. Créditos de recarga avulsa nunca expiram e acumulam mês a mês.",
                },
                {
                  q: "Posso cancelar a qualquer momento?",
                  a: "Sim, cancele sem multa. Seu plano permanece ativo até o fim do período de faturamento atual.",
                },
                {
                  q: "Como funciona o período gratuito?",
                  a: "Crie uma conta e receba 50 créditos na hora, sem cartão de crédito. Faça upgrade quando estiver pronto.",
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
