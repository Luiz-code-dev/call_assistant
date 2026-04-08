"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Mic2, Zap, CreditCard, ArrowUpRight, Download,
  LogOut, Settings, TrendingUp, Clock, Star, Loader2,
} from "lucide-react";
import { SupportChat } from "@/components/SupportChat";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CreditTransaction } from "@/types";

interface WalletBalance {
  balance: number;
  bonusBalance: number;
  trialBalance: number;
}

interface TransactionsResponse {
  content: CreditTransaction[];
  totalElements: number;
}

const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  basic: 500,
  premium: 1000,
};

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico — R$ 74,90/mês",
  premium: "Premium — R$ 149,90/mês",
};

export default function DashboardPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
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
      // 1) Always load user data from Next.js API (never depends on Spring Boot)
      try {
        const meData = await fetch("/api/auth/me").then((r) => r.json());
        if (meData?.name) setUserName(meData.name);
        if (meData?.plan) setPlan(meData.plan);
      } catch { /* ignore */ }

      // 2) Load wallet data from Spring Boot backend (may be unavailable)
      try {
        const [walletData, txData] = await Promise.all([
          api.wallet.balance() as Promise<WalletBalance>,
          api.wallet.transactions() as Promise<TransactionsResponse>,
        ]);
        setWallet(walletData);
        setTransactions(txData.content ?? []);
      } catch {
        setWallet({ balance: 0, bonusBalance: 0, trialBalance: 0 });
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const balance = wallet?.balance ?? 0;
  const totalCredits = PLAN_CREDITS[plan] ?? 50;
  const percentUsed = totalCredits > 0 ? ((totalCredits - balance) / totalCredits) * 100 : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar / Header */}
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
            <Button variant="ghost" size="sm" asChild>
              <Link href="/api/auth/logout"><LogOut className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Olá{userName ? `, ${userName.split(" ")[0]}` : ""} 👋</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {/* Credits */}
          <Card className="border-border/50 bg-card col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Saldo de créditos</CardDescription>
                <Badge variant="purple">
                  <Zap className="mr-1 h-3 w-3" />
                  {PLAN_LABELS[plan] ?? "Free"}
                </Badge>
              </div>
              <CardTitle className="text-5xl font-bold">{balance}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={percentUsed} className="mb-2 h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalCredits - balance} credits used</span>
                <span>{balance} of {totalCredits} remaining</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="gradient" size="sm" asChild>
                  <Link href="/usage">
                    <TrendingUp className="mr-2 h-3.5 w-3.5" />
                    View usage
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/pricing#credits">
                    <CreditCard className="mr-2 h-3.5 w-3.5" />
                    Add credits
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plan */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Current plan</CardDescription>
              <CardTitle className="text-2xl">{PLAN_LABELS[plan] ?? "Free"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-violet-400" />
                  50 créditos iniciais
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-violet-400" />
                  Sem renovação mensal
                </div>
              </div>
              <Button variant="gradient" size="sm" className="mt-4 w-full" asChild>
                <Link href="/pricing">
                  Ver planos
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Download App */}
        <Card className="mb-8 border-violet-500/20 bg-violet-500/5">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="font-semibold">Baixar o app desktop</h3>
              <p className="text-sm text-muted-foreground">
                Instale o SpeakFlow no seu Windows e comece agora
              </p>
            </div>
            <Button variant="gradient" asChild>
              <a href="https://github.com/Luiz-code-dev/call_assistant/releases/download/v0.1.0/SpeakFlow-Setup-0.1.0.exe" target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Baixar .exe
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de créditos</CardTitle>
            <CardDescription>Entradas e saídas de créditos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "credit" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {tx.type === "credit" ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <SupportChat />
    </div>
  );
}
