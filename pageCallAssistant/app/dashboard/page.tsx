"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Mic2, Zap, CreditCard, ArrowUpRight, Download,
  LogOut, Settings, TrendingUp, Loader2, CheckCircle2, Crown, Sparkles,
} from "lucide-react";
import { SupportChat } from "@/components/SupportChat";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface WalletBalance {
  balance: number;
  bonusBalance: number;
  trialBalance: number;
}

const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  basic: 500,
  premium: 1000,
};

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico",
  premium: "Premium",
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["50 créditos de boas-vindas", "Transcrição em tempo real", "Suporte básico"],
  basic: ["500 créditos por ciclo", "Transcrição + Tradução simultânea", "Copilot de respostas com IA", "Suporte prioritário"],
  premium: ["1.000 créditos por ciclo", "Todos os recursos do Básico", "IA avançada e personalizada", "Suporte VIP 24h"],
};

export default function DashboardPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [plan, setPlan] = useState("free");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const credits = searchParams.get("credits");
    if (checkout === "success") toast.success("Assinatura ativada com sucesso!");
    if (credits === "success") {
      const amount = searchParams.get("amount");
      toast.success(`${amount ?? ""} créditos adicionados à sua conta!`);
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const sfToken = typeof window !== "undefined" ? sessionStorage.getItem("sf_token") : null;
      const authHeaders: HeadersInit = sfToken ? { Authorization: `Bearer ${sfToken}` } : {};

      try {
        const meData = await fetch("/api/auth/me", { headers: authHeaders }).then((r) => r.json());
        if (meData?.name) setUserName(meData.name);
        if (meData?.plan) setPlan(meData.plan);
      } catch { /* ignore */ }

      try {
        const walletRes = await fetch("/api/wallet/balance", { headers: authHeaders });
        const walletData: WalletBalance = await walletRes.json();
        if (walletRes.ok) setWallet(walletData);
        else setWallet({ balance: 0, bonusBalance: 0, trialBalance: 0 });
      } catch {
        setWallet({ balance: 0, bonusBalance: 0, trialBalance: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const balance = wallet?.balance ?? 0;
  const totalCredits = PLAN_CREDITS[plan] ?? 50;
  const used = Math.max(0, totalCredits - balance);
  const percentUsed = totalCredits > 0 ? Math.min((used / totalCredits) * 100, 100) : 0;
  const firstName = userName ? userName.split(" ")[0] : "";

  const planColor = plan === "premium" ? "text-amber-400" : plan === "basic" ? "text-violet-400" : "text-zinc-400";
  const planBg = plan === "premium" ? "from-amber-500/10 to-card border-amber-500/20" : plan === "basic" ? "from-violet-500/10 to-card border-violet-500/20" : "from-zinc-500/5 to-card border-border/50";
  const PlanIcon = plan === "premium" ? Crown : plan === "basic" ? Zap : Sparkles;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="font-semibold">SpeakFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("sf_token");
                window.location.href = "/api/auth/logout";
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Olá{firstName ? `, ${firstName}` : ""} 👋</h1>
            <p className="mt-1 text-muted-foreground">Aqui está o resumo da sua conta</p>
          </div>
          <div className={`hidden items-center gap-2 rounded-full border px-4 py-2 md:flex ${plan === "premium" ? "border-amber-500/30 bg-amber-500/10" : plan === "basic" ? "border-violet-500/30 bg-violet-500/10" : "border-border/50 bg-card"}`}>
            <PlanIcon className={`h-4 w-4 ${planColor}`} />
            <span className={`text-sm font-semibold ${planColor}`}>Plano {PLAN_LABELS[plan]}</span>
          </div>
        </div>

        {/* Credits + Plan */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2 border-border/50 bg-gradient-to-br from-card to-background">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-violet-400" />
                Saldo de créditos
              </CardDescription>
              <div className="flex items-end gap-3">
                <CardTitle className="text-6xl font-black tabular-nums">{balance.toLocaleString("pt-BR")}</CardTitle>
                <span className="mb-2 text-sm text-muted-foreground">/ {totalCredits.toLocaleString("pt-BR")}</span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={percentUsed} className="mb-2 h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{used.toLocaleString("pt-BR")} utilizados</span>
                <span className={percentUsed > 80 ? "text-red-400 font-medium" : "text-emerald-400 font-medium"}>
                  {balance.toLocaleString("pt-BR")} disponíveis
                </span>
              </div>
              <div className="mt-5 flex gap-2">
                <Button variant="gradient" size="sm" asChild>
                  <Link href="/usage">
                    <TrendingUp className="mr-2 h-3.5 w-3.5" />
                    Ver histórico
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/pricing#credits">
                    <CreditCard className="mr-2 h-3.5 w-3.5" />
                    Adicionar créditos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br border ${planBg}`}>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-1.5">
                <PlanIcon className={`h-3.5 w-3.5 ${planColor}`} />
                Seu plano atual
              </CardDescription>
              <CardTitle className={`text-xl ${planColor}`}>{PLAN_LABELS[plan]}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="mb-5 space-y-2">
                {(PLAN_FEATURES[plan] ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan !== "premium" && (
                <Button variant="gradient" size="sm" className="w-full" asChild>
                  <Link href="/pricing">
                    {plan === "free" ? "Fazer upgrade" : "Ver planos"}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Link href="/usage">
            <Card className="h-full cursor-pointer border-border/50 bg-card/80 transition-all hover:border-violet-500/40 hover:bg-violet-500/5 hover:shadow-lg">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="rounded-xl bg-violet-500/15 p-3">
                  <TrendingUp className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Histórico</p>
                  <p className="text-xs text-muted-foreground">Uso detalhado</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/pricing#credits">
            <Card className="h-full cursor-pointer border-border/50 bg-card/80 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:shadow-lg">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="rounded-xl bg-cyan-500/15 p-3">
                  <CreditCard className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Recarregar</p>
                  <p className="text-xs text-muted-foreground">Adicionar créditos</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <a href="https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.0/SpeakFlow-Setup-0.1.0.exe" target="_blank" rel="noopener noreferrer">
            <Card className="h-full cursor-pointer border-border/50 bg-card/80 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:shadow-lg">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="rounded-xl bg-emerald-500/15 p-3">
                  <Download className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Baixar app</p>
                  <p className="text-xs text-muted-foreground">Windows .exe</p>
                </div>
              </CardContent>
            </Card>
          </a>

          <Link href="/settings">
            <Card className="h-full cursor-pointer border-border/50 bg-card/80 transition-all hover:border-violet-500/40 hover:bg-violet-500/5 hover:shadow-lg">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className="rounded-xl bg-violet-500/15 p-3">
                  <Settings className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Configurações</p>
                  <p className="text-xs text-muted-foreground">Minha conta</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* CTA banner */}
        <Card className="border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-violet-500/20 p-3">
              <Mic2 className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Pronto para sua próxima sessão?</p>
              <p className="text-sm text-muted-foreground">
                Abra o app desktop, inicie a reunião e deixe o SpeakFlow trabalhar para você.
              </p>
            </div>
            <Button variant="gradient" size="sm" asChild>
              <a href="https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.0/SpeakFlow-Setup-0.1.0.exe" target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-3.5 w-3.5" />
                Baixar app
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>
      <SupportChat />
    </div>
  );
}
